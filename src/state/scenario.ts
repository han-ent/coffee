import { coffeeProductToIntake, makeManualCoffeeIntake, type CaffeineIntake, type PersonProfile, type Scenario } from '../domain';
import { findCatalogItem } from '../catalog/vertuo';

export interface AppScenarioState {
  profile: PersonProfile;
  intakes: CaffeineIntake[];
  updatedAt: string;
}

export const DEFAULT_PROFILE: PersonProfile = {
  weightKg: 70,
  ageYears: 35,
  sensitivity: 'typical',
  smokingStatus: 'non-smoker',
  pregnancyStatus: 'not-pregnant',
  takesOralContraceptives: false,
};

export function createDefaultScenarioState(now = new Date()): AppScenarioState {
  return {
    profile: DEFAULT_PROFILE,
    intakes: [],
    updatedAt: now.toISOString(),
  };
}

export function toScenario(state: AppScenarioState): Scenario {
  return {
    id: 'current-scenario',
    name: 'Current caffeine day',
    profile: state.profile,
    intakes: state.intakes.map((intake) => ({ ...intake, consumedAt: new Date(intake.consumedAt) })),
  };
}

export function addCatalogIntake(
  state: AppScenarioState,
  catalogId: string,
  consumedAt: Date,
  caffeineOverrideMg?: number,
): AppScenarioState {
  const product = findCatalogItem(catalogId);
  if (!product) throw new Error(`Unknown catalog item: ${catalogId}`);

  const intake = coffeeProductToIntake(
    caffeineOverrideMg ? { ...product, caffeineMg: caffeineOverrideMg } : product,
    consumedAt,
    `${catalogId}-${consumedAt.getTime()}`,
  );

  return appendIntake(state, intake);
}

export function addManualIntake(
  state: AppScenarioState,
  label: string,
  caffeineMg: number,
  consumedAt: Date,
): AppScenarioState {
  return appendIntake(
    state,
    makeManualCoffeeIntake({ label: sanitizeLabel(label), caffeineMg }, consumedAt, `manual-${consumedAt.getTime()}`),
  );
}

export function updateProfile(state: AppScenarioState, profilePatch: Partial<PersonProfile>): AppScenarioState {
  return touch({ ...state, profile: { ...state.profile, ...profilePatch } });
}

export function removeIntake(state: AppScenarioState, intakeId: string): AppScenarioState {
  return touch({ ...state, intakes: state.intakes.filter((intake) => intake.id !== intakeId) });
}

export function sanitizeLabel(label: string): string {
  return label.replace(/[\n\r\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Coffee';
}

function appendIntake(state: AppScenarioState, intake: CaffeineIntake): AppScenarioState {
  return touch({ ...state, intakes: [...state.intakes, intake] });
}

function touch(state: AppScenarioState): AppScenarioState {
  return { ...state, updatedAt: new Date().toISOString() };
}
