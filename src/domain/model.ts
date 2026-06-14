export type Sex = 'unspecified' | 'female' | 'male';
export type CaffeineSensitivity = 'low' | 'typical' | 'high';
export type SmokingStatus = 'non-smoker' | 'smoker';
export type PregnancyStatus = 'not-pregnant' | 'pregnant-or-postpartum' | 'unspecified';

export interface PersonProfile {
  id?: string;
  displayName?: string;
  weightKg: number;
  ageYears?: number;
  sex?: Sex;
  sensitivity?: CaffeineSensitivity;
  smokingStatus?: SmokingStatus;
  pregnancyStatus?: PregnancyStatus;
  takesOralContraceptives?: boolean;
}

export interface CoffeeProduct {
  id: string;
  name: string;
  brand?: string;
  line?: string;
  servingMl?: number;
  caffeineMg: number;
  caffeineMgMin?: number;
  caffeineMgMax?: number;
  sourceNote?: string;
  confidence?: string;
}

export interface ManualCoffeeInput {
  label: string;
  caffeineMg: number;
  servingMl?: number;
}

export interface CaffeineIntake {
  id: string;
  label: string;
  caffeineMg: number;
  consumedAt: Date;
  servingMl?: number;
  catalogId?: string;
  sourceConfidence?: string;
}

export interface Scenario {
  id: string;
  name: string;
  profile: PersonProfile;
  intakes: CaffeineIntake[];
}

export interface PharmacokineticParameters {
  halfLifeMinutes: number;
  absorptionHalfLifeMinutes: number;
  volumeDistributionLPerKg: number;
  bioavailability: number;
}

export interface ConcentrationPoint {
  elapsedMinutes: number;
  timestamp: Date;
  centralMg: number;
  concentrationMgPerL: number;
  bounds: {
    lowMgPerL: number;
    highMgPerL: number;
  };
  contributors: Array<{
    intakeId: string;
    label: string;
    caffeineMg: number;
    elapsedSinceIntakeMinutes: number;
    centralMg: number;
  }>;
}

export interface SimulationOptions {
  startAt: Date;
  endAt: Date;
  stepMinutes?: number;
  parameters?: Partial<PharmacokineticParameters>;
  doseUncertaintyFraction?: number;
}

export interface SimulationResult {
  profile: PersonProfile;
  parameters: PharmacokineticParameters;
  points: ConcentrationPoint[];
  assumptions: string[];
  disclaimer: string;
}

export const NON_MEDICAL_DISCLAIMER =
  'This caffeine curve is an educational planning estimate, not medical advice, diagnosis, or treatment. Individual metabolism can vary widely; use manual overrides and consult a clinician for health-specific questions.';

export const DEFAULT_PK_PARAMETERS: PharmacokineticParameters = {
  halfLifeMinutes: 300,
  absorptionHalfLifeMinutes: 35,
  volumeDistributionLPerKg: 0.6,
  bioavailability: 1,
};

export const DEFAULT_DOSE_UNCERTAINTY_FRACTION = 0.15;

export function makeManualCoffeeIntake(
  input: ManualCoffeeInput,
  consumedAt: Date,
  id = cryptoSafeId('manual'),
): CaffeineIntake {
  assertPositiveFinite(input.caffeineMg, 'caffeineMg');

  return {
    id,
    label: input.label.trim() || 'Manual caffeine',
    caffeineMg: input.caffeineMg,
    consumedAt,
    servingMl: input.servingMl,
  };
}

export function coffeeProductToIntake(
  product: CoffeeProduct,
  consumedAt: Date,
  id = cryptoSafeId(product.id),
): CaffeineIntake {
  assertPositiveFinite(product.caffeineMg, 'caffeineMg');

  return {
    id,
    label: product.name,
    caffeineMg: product.caffeineMg,
    consumedAt,
    servingMl: product.servingMl,
    catalogId: product.id,
    sourceConfidence: product.confidence,
  };
}

function cryptoSafeId(prefix: string) {
  const suffix = Math.random().toString(36).slice(2, 9);
  return `${prefix}-${suffix}`;
}

function assertPositiveFinite(value: number, field: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${field} must be a positive finite number`);
  }
}
