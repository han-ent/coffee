export type Sex = 'unspecified' | 'female' | 'male';
export type CaffeineSensitivity = 'low' | 'typical' | 'high';
export type SmokingStatus = 'non-smoker' | 'smoker';
export type PregnancyStatus =
  | 'not-pregnant'
  | 'unspecified'
  | 'pregnant-or-postpartum'
  | 'first-trimester'
  | 'second-trimester'
  | 'third-trimester'
  | 'postpartum-12-weeks';

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
  '교육용 추정치이며 의학적 조언이 아닙니다. 약물·간질환·임신 등에 따라 실제와 크게 다를 수 있어요.';

export const DEFAULT_PK_PARAMETERS: PharmacokineticParameters = {
  halfLifeMinutes: 300,
  absorptionHalfLifeMinutes: 12,
  volumeDistributionLPerKg: 0.7,
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
