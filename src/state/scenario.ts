import { coffeeProductToIntake, makeManualCoffeeIntake, type CaffeineIntake, type PersonProfile, type Scenario } from '../domain';
import { findCatalogItem } from '../catalog/vertuo';

export interface SleepSettings {
  bedtime: string;
  referenceLineMgPerL?: number;
  thresholdMgPerL?: number;
}

export interface ScenarioState {
  id: 'scenario-1' | 'scenario-2' | string;
  name: string;
  intakes: CaffeineIntake[];
}

export interface AppScenarioState {
  schemaVersion: 2;
  profile: PersonProfile;
  scenarios: [ScenarioState, ScenarioState] | ScenarioState[];
  sleep: SleepSettings;
  updatedAt: string;
}

export type LegacyAppScenarioState = {
  profile: PersonProfile;
  intakes: CaffeineIntake[];
  sleep?: { bedtime?: string; thresholdMgPerL?: number; referenceLineMgPerL?: number };
  updatedAt?: string;
  version?: number;
  schemaVersion?: number;
};

export const DEFAULT_PROFILE: PersonProfile = {
  weightKg: 70,
  ageYears: 35,
  sensitivity: 'typical',
  smokingStatus: 'non-smoker',
  pregnancyStatus: 'not-pregnant',
  takesOralContraceptives: false,
};

export function createDefaultSleepSettings(now = new Date()): SleepSettings {
  return {
    bedtime: new Date(now.getTime() + 8 * 60 * 60_000).toISOString(),
    referenceLineMgPerL: 0.7,
  };
}

export function createDefaultScenarioState(now = new Date()): AppScenarioState {
  return {
    schemaVersion: 2,
    profile: { ...DEFAULT_PROFILE },
    scenarios: [
      { id: 'scenario-1', name: 'Scenario 1', intakes: [] },
      { id: 'scenario-2', name: 'Scenario 2', intakes: [] },
    ],
    sleep: createDefaultSleepSettings(now),
    updatedAt: now.toISOString(),
  };
}

export function migrateScenarioState(value: unknown, now = new Date()): AppScenarioState {
  if (!value || typeof value !== 'object') throw new Error('Scenario state is not an object');
  const record = value as Record<string, unknown>;

  if (record.schemaVersion === 2 || record.version === 2) {
    return normalizeV2State(record, now);
  }
  if ((record.schemaVersion !== undefined && record.schemaVersion !== 1) || (record.version !== undefined && record.version !== 1)) {
    throw new Error('Unsupported scenario state version');
  }

  if ('profile' in record && 'intakes' in record) {
    return migrateV1State(record as LegacyAppScenarioState, now);
  }

  throw new Error('Unsupported scenario state version');
}

export function toScenario(state: AppScenarioState, scenarioId = 'scenario-1'): Scenario {
  const scenario = getScenarioState(state, scenarioId);
  return {
    id: scenario.id,
    name: scenario.name,
    profile: state.profile,
    intakes: scenario.intakes.map((intake) => ({ ...intake, consumedAt: new Date(intake.consumedAt) })),
  };
}

export function getScenarioState(state: AppScenarioState, scenarioId: string): ScenarioState {
  return state.scenarios.find((scenario) => scenario.id === scenarioId) ?? state.scenarios[0];
}

export function addCatalogIntake(
  state: AppScenarioState,
  scenarioIdOrCatalogId: string,
  catalogIdOrConsumedAt: string | Date,
  consumedAtOrOverride?: Date | number,
  caffeineOverrideMg?: number,
): AppScenarioState {
  const legacyCall = catalogIdOrConsumedAt instanceof Date;
  const scenarioId = legacyCall ? 'scenario-1' : scenarioIdOrCatalogId;
  const catalogId = legacyCall ? scenarioIdOrCatalogId : catalogIdOrConsumedAt;
  const consumedAt = legacyCall ? catalogIdOrConsumedAt : consumedAtOrOverride;
  const override = legacyCall ? consumedAtOrOverride : caffeineOverrideMg;
  if (!(consumedAt instanceof Date)) throw new Error('consumedAt is required');
  const product = findCatalogItem(catalogId);
  if (!product) throw new Error(`Unknown catalog item: ${catalogId}`);

  const intake = coffeeProductToIntake(
    typeof override === 'number' && override > 0 ? { ...product, caffeineMg: override } : product,
    consumedAt,
    `${scenarioId}-${catalogId}-${consumedAt.getTime()}`,
  );

  return appendIntake(state, scenarioId, intake);
}

export function addManualIntake(
  state: AppScenarioState,
  scenarioIdOrLabel: string,
  labelOrCaffeineMg: string | number,
  caffeineMgOrConsumedAt: number | Date,
  consumedAtMaybe?: Date,
): AppScenarioState {
  const legacyCall = typeof labelOrCaffeineMg === 'number';
  const scenarioId = legacyCall ? 'scenario-1' : scenarioIdOrLabel;
  const label = legacyCall ? scenarioIdOrLabel : labelOrCaffeineMg;
  const caffeineMg = legacyCall ? labelOrCaffeineMg : caffeineMgOrConsumedAt;
  const consumedAt = legacyCall ? caffeineMgOrConsumedAt : consumedAtMaybe;
  if (typeof caffeineMg !== 'number' || !(consumedAt instanceof Date)) throw new Error('Manual caffeine and consumedAt are required');
  return appendIntake(
    state,
    scenarioId,
    makeManualCoffeeIntake({ label: sanitizeLabel(label), caffeineMg }, consumedAt, `${scenarioId}-manual-${consumedAt.getTime()}`),
  );
}

export function updateProfile(state: AppScenarioState, profilePatch: Partial<PersonProfile>): AppScenarioState {
  return touch({ ...state, profile: { ...state.profile, ...profilePatch } });
}

export function updateSleepSettings(state: AppScenarioState, sleepPatch: Partial<SleepSettings>): AppScenarioState {
  const { thresholdMgPerL, ...rest } = sleepPatch;
  return touch({
    ...state,
    sleep: {
      ...state.sleep,
      ...rest,
      referenceLineMgPerL: rest.referenceLineMgPerL ?? thresholdMgPerL ?? state.sleep.referenceLineMgPerL,
    },
  });
}

export function updateScenarioName(state: AppScenarioState, scenarioId: string, name: string): AppScenarioState {
  return updateScenario(state, scenarioId, (scenario) => ({ ...scenario, name: sanitizeLabel(name) || scenario.name }));
}

export function copyScenario(state: AppScenarioState, fromScenarioId: string, toScenarioId: string): AppScenarioState {
  const source = getScenarioState(state, fromScenarioId);
  return updateScenario(state, toScenarioId, (target) => ({
    ...target,
    intakes: source.intakes.map((intake) => ({ ...intake, id: `${target.id}-${intake.id}` })),
  }));
}

export function clearScenario(state: AppScenarioState, scenarioId: string): AppScenarioState {
  return updateScenario(state, scenarioId, (scenario) => ({ ...scenario, intakes: [] }));
}

export function removeIntake(state: AppScenarioState, scenarioId: string, intakeId: string): AppScenarioState {
  return updateScenario(state, scenarioId, (scenario) => ({
    ...scenario,
    intakes: scenario.intakes.filter((intake) => intake.id !== intakeId),
  }));
}

export function sanitizeLabel(label: string): string {
  return label.replace(/[\n\r\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Coffee';
}

function appendIntake(state: AppScenarioState, scenarioId: string, intake: CaffeineIntake): AppScenarioState {
  return updateScenario(state, scenarioId, (scenario) => ({ ...scenario, intakes: [...scenario.intakes, intake] }));
}

function updateScenario(
  state: AppScenarioState,
  scenarioId: string,
  updater: (scenario: ScenarioState) => ScenarioState,
): AppScenarioState {
  return touch({
    ...state,
    scenarios: state.scenarios.map((scenario) => scenario.id === scenarioId ? updater(scenario) : scenario),
  });
}

function touch(state: AppScenarioState): AppScenarioState {
  return { ...state, updatedAt: new Date().toISOString() };
}

function migrateV1State(value: LegacyAppScenarioState, now: Date): AppScenarioState {
  validateProfile(value.profile);
  const intakes = parseIntakes(value.intakes);
  const scenarioOne = { id: 'scenario-1', name: 'Scenario 1', intakes };
  const scenarioTwo = { id: 'scenario-2', name: 'Scenario 2', intakes: intakes.map((intake) => ({ ...intake, id: `scenario-2-${intake.id}` })) };

  return {
    schemaVersion: 2,
    profile: { ...DEFAULT_PROFILE, ...value.profile },
    scenarios: [scenarioOne, scenarioTwo],
    sleep: parseSleep(value.sleep, now),
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : now.toISOString(),
  };
}

function normalizeV2State(record: Record<string, unknown>, now: Date): AppScenarioState {
  const profile = record.profile as PersonProfile;
  validateProfile(profile);
  if (!Array.isArray(record.scenarios) || record.scenarios.length < 2) throw new Error('Stored scenarios must include Scenario 1 and Scenario 2');

  return {
    schemaVersion: 2,
    profile: { ...DEFAULT_PROFILE, ...profile },
    scenarios: record.scenarios.slice(0, 2).map((scenario, index) => parseScenario(scenario, index)) as [ScenarioState, ScenarioState],
    sleep: parseSleep(record.sleep, now),
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : now.toISOString(),
  };
}

function parseScenario(value: unknown, index: number): ScenarioState {
  if (!value || typeof value !== 'object') throw new Error('Scenario is not an object');
  const record = value as Partial<ScenarioState>;
  const id = typeof record.id === 'string' ? record.id : `scenario-${index + 1}`;
  const fallbackName = index === 0 ? 'Scenario 1' : 'Scenario 2';
  return {
    id,
    name: typeof record.name === 'string' && record.name.trim() ? sanitizeLabel(record.name) : fallbackName,
    intakes: parseIntakes(record.intakes),
  };
}

function parseIntakes(value: unknown): CaffeineIntake[] {
  if (!Array.isArray(value)) throw new Error('Scenario intakes must be an array');
  return value.map((raw) => {
    const intake = raw as Partial<CaffeineIntake>;
    if (typeof intake.id !== 'string' || typeof intake.label !== 'string') throw new Error('Stored intake is invalid');
    if (!Number.isFinite(intake.caffeineMg) || intake.caffeineMg! <= 0) throw new Error('Stored intake is invalid');
    const consumedAt = new Date(intake.consumedAt ?? '');
    if (!Number.isFinite(consumedAt.getTime())) throw new Error('Stored intake is invalid');
    if (intake.servingMl !== undefined && (!Number.isFinite(intake.servingMl) || intake.servingMl <= 0)) throw new Error('Stored intake is invalid');
    return {
      id: intake.id,
      label: sanitizeLabel(intake.label),
      caffeineMg: intake.caffeineMg,
      consumedAt,
      servingMl: intake.servingMl,
    };
  });
}

function parseSleep(value: unknown, now: Date): SleepSettings {
  if (!value || typeof value !== 'object') return createDefaultSleepSettings(now);
  const sleep = value as { bedtime?: unknown; thresholdMgPerL?: unknown; referenceLineMgPerL?: unknown };
  const bedtime = typeof sleep.bedtime === 'string' && Number.isFinite(new Date(sleep.bedtime).getTime())
    ? sleep.bedtime
    : createDefaultSleepSettings(now).bedtime;
  const rawReference = sleep.referenceLineMgPerL ?? sleep.thresholdMgPerL;
  const referenceLineMgPerL = typeof rawReference === 'number' && Number.isFinite(rawReference) && rawReference >= 0.05 && rawReference <= 10
    ? rawReference
    : createDefaultSleepSettings(now).referenceLineMgPerL;
  return { bedtime, referenceLineMgPerL };
}

function validateProfile(profile: PersonProfile) {
  if (!profile || !Number.isFinite(profile.weightKg) || profile.weightKg < 25 || profile.weightKg > 250) {
    throw new Error('Stored profile weightKg is out of range');
  }
  if (profile.ageYears !== undefined && (!Number.isFinite(profile.ageYears) || profile.ageYears < 0 || profile.ageYears > 130)) {
    throw new Error('Stored profile ageYears is out of range');
  }
}
