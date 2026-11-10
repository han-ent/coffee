import {
  DEFAULT_DOSE_UNCERTAINTY_FRACTION,
  DEFAULT_PK_PARAMETERS,
  NON_MEDICAL_DISCLAIMER,
  type CaffeineIntake,
  type ConcentrationPoint,
  type PersonProfile,
  type PharmacokineticParameters,
  type Scenario,
  type SimulationOptions,
  type SimulationResult,
} from './model';

const MINUTE_MS = 60_000;
const MIN_WEIGHT_KG = 25;
const MAX_WEIGHT_KG = 250;
const MIN_STEP_MINUTES = 1;
const MAX_POINTS = 10_080;

export function calculateEliminationRate(halfLifeMinutes: number): number {
  assertPositiveFinite(halfLifeMinutes, 'halfLifeMinutes');
  return Math.log(2) / halfLifeMinutes;
}

export function calculateAbsorptionRate(absorptionHalfLifeMinutes: number): number {
  assertPositiveFinite(absorptionHalfLifeMinutes, 'absorptionHalfLifeMinutes');
  return Math.log(2) / absorptionHalfLifeMinutes;
}

export function estimatePkParameters(profile: PersonProfile): PharmacokineticParameters {
  validateProfile(profile);

  let halfLifeMinutes = DEFAULT_PK_PARAMETERS.halfLifeMinutes;
  const assumptions: number[] = [];

  if (profile.smokingStatus === 'smoker') assumptions.push(0.6);
  if (profile.takesOralContraceptives) assumptions.push(1.45);
  const pregnancyFactor = pregnancyHalfLifeFactor(profile.pregnancyStatus);
  if (pregnancyFactor) assumptions.push(pregnancyFactor);
  if (profile.ageYears !== undefined && profile.ageYears >= 65) assumptions.push(1.15);

  for (const modifier of assumptions) halfLifeMinutes *= modifier;

  return {
    ...DEFAULT_PK_PARAMETERS,
    halfLifeMinutes: clamp(halfLifeMinutes, 120, 1_200),
  };
}

export function pregnancyHalfLifeFactor(status: PersonProfile['pregnancyStatus']): number | null {
  switch (status) {
    case 'first-trimester':
      return 1.4;
    case 'second-trimester':
    case 'pregnant-or-postpartum':
      return 2.3;
    case 'third-trimester':
      return 3;
    case 'postpartum-12-weeks':
      return 1.5;
    default:
      return null;
  }
}

export function createAssumptionNotes(profile: PersonProfile, parameters = estimatePkParameters(profile)): string[] {
  const notes = [
    `One-compartment first-order model with first-order absorption; default half-life ${Math.round(DEFAULT_PK_PARAMETERS.halfLifeMinutes / 60)} h, adjusted estimate ${Math.round(parameters.halfLifeMinutes)} min.`,
    `Concentration is a plasma-equivalent estimate using volume of distribution ${parameters.volumeDistributionLPerKg} L/kg and body weight ${profile.weightKg} kg.`,
    `Uncertainty band combines half-life range and dose variability; caffeine labels and individual metabolism can differ substantially.`,
  ];

  if (profile.sensitivity === 'high' || profile.sensitivity === 'low') notes.push('Sensitivity shifts the planning reference line and does not change half-life.');
  if (profile.smokingStatus === 'smoker') notes.push('Smoking status shortens the modeled half-life to reflect faster average clearance.');
  if (profile.takesOralContraceptives) notes.push('Oral contraceptive flag lengthens the modeled half-life.');
  if (pregnancyHalfLifeFactor(profile.pregnancyStatus)) notes.push('Pregnancy or early postpartum lengthens the modeled half-life; treat results as especially approximate and non-medical.');

  return notes;
}

export function simulateScenario(scenario: Scenario, options: SimulationOptions): SimulationResult {
  validateProfile(scenario.profile);
  validateSimulationOptions(options);

  const baseParameters = {
    ...estimatePkParameters(scenario.profile),
    ...options.parameters,
  };
  validateParameters(baseParameters);

  const doseUncertaintyFraction = options.doseUncertaintyFraction ?? DEFAULT_DOSE_UNCERTAINTY_FRACTION;
  if (doseUncertaintyFraction < 0 || doseUncertaintyFraction > 0.75) {
    throw new Error('doseUncertaintyFraction must be between 0 and 0.75');
  }

  const lowParameters: PharmacokineticParameters = {
    ...baseParameters,
    halfLifeMinutes: baseParameters.halfLifeMinutes * 0.55,
  };
  const highParameters: PharmacokineticParameters = {
    ...baseParameters,
    halfLifeMinutes: baseParameters.halfLifeMinutes * 2,
  };

  const points: ConcentrationPoint[] = [];
  const stepMinutes = options.stepMinutes ?? 5;
  const totalMinutes = differenceMinutes(options.endAt, options.startAt);

  for (let elapsedMinutes = 0; elapsedMinutes <= totalMinutes; elapsedMinutes += stepMinutes) {
    const timestamp = new Date(options.startAt.getTime() + elapsedMinutes * MINUTE_MS);
    const nominal = concentrationAt(scenario.profile, scenario.intakes, timestamp, baseParameters, 1);
    const low = concentrationAt(scenario.profile, scenario.intakes, timestamp, lowParameters, 1 - doseUncertaintyFraction);
    const high = concentrationAt(scenario.profile, scenario.intakes, timestamp, highParameters, 1 + doseUncertaintyFraction);

    points.push({
      elapsedMinutes,
      timestamp,
      centralMg: nominal.centralMg,
      concentrationMgPerL: nominal.concentrationMgPerL,
      bounds: {
        lowMgPerL: Math.min(low.concentrationMgPerL, high.concentrationMgPerL),
        highMgPerL: Math.max(low.concentrationMgPerL, high.concentrationMgPerL),
      },
      contributors: nominal.contributors,
    });
  }

  return {
    profile: scenario.profile,
    parameters: baseParameters,
    points,
    assumptions: createAssumptionNotes(scenario.profile, baseParameters),
    disclaimer: NON_MEDICAL_DISCLAIMER,
  };
}

export function concentrationAt(
  profile: PersonProfile,
  intakes: CaffeineIntake[],
  at: Date,
  parameters = estimatePkParameters(profile),
  doseScale = 1,
): Pick<ConcentrationPoint, 'centralMg' | 'concentrationMgPerL' | 'contributors'> {
  validateProfile(profile);
  validateParameters(parameters);
  assertPositiveFinite(doseScale, 'doseScale');

  const contributors = intakes.map((intake) => {
    assertPositiveFinite(intake.caffeineMg, 'intake.caffeineMg');
    const elapsedSinceIntakeMinutes = differenceMinutes(at, intake.consumedAt);
    const centralMg = absorbedCentralAmountMg(intake.caffeineMg * doseScale, elapsedSinceIntakeMinutes, parameters);

    return {
      intakeId: intake.id,
      label: intake.label,
      caffeineMg: intake.caffeineMg,
      elapsedSinceIntakeMinutes,
      centralMg,
    };
  }).filter((contributor) => contributor.elapsedSinceIntakeMinutes >= 0);

  const centralMg = contributors.reduce((sum, contributor) => sum + contributor.centralMg, 0);
  const volumeLiters = profile.weightKg * parameters.volumeDistributionLPerKg;

  return {
    centralMg,
    concentrationMgPerL: centralMg / volumeLiters,
    contributors,
  };
}

export function absorbedCentralAmountMg(
  doseMg: number,
  elapsedMinutes: number,
  parameters: PharmacokineticParameters,
): number {
  assertPositiveFinite(doseMg, 'doseMg');
  validateParameters(parameters);

  if (elapsedMinutes <= 0) return 0;

  const eliminationRate = calculateEliminationRate(parameters.halfLifeMinutes);
  const absorptionRate = calculateAbsorptionRate(parameters.absorptionHalfLifeMinutes);
  const bioavailableDose = doseMg * parameters.bioavailability;

  if (Math.abs(absorptionRate - eliminationRate) < 1e-9) {
    return bioavailableDose * absorptionRate * elapsedMinutes * Math.exp(-eliminationRate * elapsedMinutes);
  }

  const amount = bioavailableDose
    * (absorptionRate / (absorptionRate - eliminationRate))
    * (Math.exp(-eliminationRate * elapsedMinutes) - Math.exp(-absorptionRate * elapsedMinutes));

  return Math.max(0, amount);
}

export function residualFractionAfter(minutes: number, halfLifeMinutes: number): number {
  if (minutes < 0) throw new Error('minutes must be non-negative');
  return Math.exp(-calculateEliminationRate(halfLifeMinutes) * minutes);
}

export function findLatestCoffeeTimeForThreshold(
  scenarioWithoutCandidate: Scenario,
  candidate: Omit<CaffeineIntake, 'consumedAt'>,
  targetTime: Date,
  thresholdMgPerL: number,
  searchWindowStart: Date,
  stepMinutes = 5,
): Date | null {
  validateProfile(scenarioWithoutCandidate.profile);
  assertPositiveFinite(thresholdMgPerL, 'thresholdMgPerL');

  let latestSafe: Date | null = null;
  for (let time = new Date(searchWindowStart); time < targetTime; time = new Date(time.getTime() + stepMinutes * MINUTE_MS)) {
    const trialScenario: Scenario = {
      ...scenarioWithoutCandidate,
      intakes: [...scenarioWithoutCandidate.intakes, { ...candidate, consumedAt: time }],
    };
    const concentration = concentrationAt(trialScenario.profile, trialScenario.intakes, targetTime).concentrationMgPerL;
    if (concentration <= thresholdMgPerL) latestSafe = time;
  }

  return latestSafe;
}

function validateProfile(profile: PersonProfile) {
  assertPositiveFinite(profile.weightKg, 'weightKg');
  if (profile.weightKg < MIN_WEIGHT_KG || profile.weightKg > MAX_WEIGHT_KG) {
    throw new Error(`weightKg must be between ${MIN_WEIGHT_KG} and ${MAX_WEIGHT_KG}`);
  }
  if (profile.ageYears !== undefined && (profile.ageYears < 0 || profile.ageYears > 130)) {
    throw new Error('ageYears must be between 0 and 130');
  }
}

function validateParameters(parameters: PharmacokineticParameters) {
  assertPositiveFinite(parameters.halfLifeMinutes, 'halfLifeMinutes');
  assertPositiveFinite(parameters.absorptionHalfLifeMinutes, 'absorptionHalfLifeMinutes');
  assertPositiveFinite(parameters.volumeDistributionLPerKg, 'volumeDistributionLPerKg');
  assertPositiveFinite(parameters.bioavailability, 'bioavailability');
  if (parameters.bioavailability > 1.2) throw new Error('bioavailability must be 1.2 or lower');
}

function validateSimulationOptions(options: SimulationOptions) {
  if (options.endAt <= options.startAt) throw new Error('endAt must be after startAt');
  const stepMinutes = options.stepMinutes ?? 5;
  if (!Number.isInteger(stepMinutes) || stepMinutes < MIN_STEP_MINUTES) {
    throw new Error(`stepMinutes must be an integer >= ${MIN_STEP_MINUTES}`);
  }
  const totalMinutes = differenceMinutes(options.endAt, options.startAt);
  if (Math.floor(totalMinutes / stepMinutes) + 1 > MAX_POINTS) {
    throw new Error(`simulation would exceed ${MAX_POINTS} points`);
  }
}

function differenceMinutes(later: Date, earlier: Date) {
  return (later.getTime() - earlier.getTime()) / MINUTE_MS;
}

function assertPositiveFinite(value: number, field: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${field} must be a positive finite number`);
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
