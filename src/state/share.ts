import type { CaffeineSensitivity, PersonProfile } from '../domain';
import { estimatePkParameters, type CaffeineIntake } from '../domain';
import type { AppScenarioState, ScenarioState, SleepSettings } from './scenario';
import { APP_SCHEMA_VERSION, DEFAULT_PROFILE, SCENARIO_COMPARISON_COUNT, createDefaultSleepSettings, migrateScenarioState, sanitizeLabel } from './scenario';

export const SHARE_PARAM = 'scenario';
export const SHARE_LABEL_PRIVACY_WARNING =
  'Share links include coffee labels and timestamps. Avoid names, locations, health details, or anything you would not want a recipient to see.';

const MAX_SHARED_INTAKES = 24;
const MAX_SHARE_BYTES = 12_288;

interface SharedCalculationParameters {
  weightKg: number;
  sensitivity: CaffeineSensitivity;
  halfLifeMinutes: number;
  absorptionHalfLifeMinutes: number;
  volumeDistributionLPerKg: number;
}

interface SharedIntakePayload {
  label: string;
  caffeineMg: number;
  consumedAt: string;
  servingMl?: number;
  catalogId?: string;
  sourceConfidence?: string;
}

export interface SharedScenarioPayloadV1 {
  v: 1;
  calcParams: SharedCalculationParameters;
  sleep: SleepSettings & { thresholdMgPerL?: number };
  intakes: SharedIntakePayload[];
}

export interface SharedScenarioPayloadV2 {
  v: 2;
  calcParams: SharedCalculationParameters;
  sleep: SleepSettings;
  scenarios: Array<{
    id: string;
    name: string;
    intakes: SharedIntakePayload[];
  }>;
}

export type SharedScenarioPayload = SharedScenarioPayloadV1 | SharedScenarioPayloadV2;

export type DecodeShareResult =
  | { ok: true; state: AppScenarioState; warning?: string }
  | { ok: false; error: string };

export function createSharePayload(state: AppScenarioState): SharedScenarioPayloadV2 {
  const shareSafeProfile = toShareSafeProfile(state.profile);
  const parameters = estimatePkParameters(shareSafeProfile);
  return {
    v: APP_SCHEMA_VERSION,
    calcParams: {
      weightKg: shareSafeProfile.weightKg,
      sensitivity: shareSafeProfile.sensitivity ?? 'typical',
      halfLifeMinutes: parameters.halfLifeMinutes,
      absorptionHalfLifeMinutes: parameters.absorptionHalfLifeMinutes,
      volumeDistributionLPerKg: parameters.volumeDistributionLPerKg,
    },
    sleep: {
      bedtime: new Date(state.sleep.bedtime).toISOString(),
      referenceLineMgPerL: state.sleep.referenceLineMgPerL,
    },
    scenarios: state.scenarios.map((scenario) => ({
      id: scenario.id,
      name: sanitizeLabel(scenario.name),
      intakes: scenario.intakes.map(serializeIntake),
    })),
  };
}

export function encodeSharePayload(payload: SharedScenarioPayload): string {
  assertSharePayload(payload);
  const json = JSON.stringify(payload);
  if (json.length > MAX_SHARE_BYTES) throw new Error('Share payload is too large');
  return btoa(unescape(encodeURIComponent(json)));
}

export function decodeSharePayload(encoded: string): SharedScenarioPayload {
  try {
    if (encoded.length > MAX_SHARE_BYTES * 2) throw new Error('Share link is too large');
    const json = decodeURIComponent(escape(atob(encoded)));
    if (json.length > MAX_SHARE_BYTES) throw new Error('Share payload is too large');
    const payload = JSON.parse(json) as SharedScenarioPayload;
    assertSharePayload(payload);
    return payload;
  } catch {
    throw new Error('Share link is malformed or unsupported');
  }
}

export function createShareUrl(state: AppScenarioState, baseHref = window.location.href): string {
  const url = new URL(baseHref);
  url.search = '';
  url.searchParams.set(SHARE_PARAM, encodeSharePayload(createSharePayload(state)));
  return url.toString();
}

export function loadShareFromUrl(search = window.location.search): DecodeShareResult {
  const params = new URLSearchParams(search);
  const encoded = params.get(SHARE_PARAM);
  if (!encoded) return { ok: false, error: 'No shared scenario in URL' };

  try {
    const payload = decodeSharePayload(encoded);
    return {
      ok: true,
      state: sharedPayloadToState(payload),
      warning: 'Sensitive local-only profile flags were not included in this shared scenario.',
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Share link is malformed or unsupported' };
  }
}

export function toShareSafeProfile(profile: PersonProfile): PersonProfile {
  return {
    ...DEFAULT_PROFILE,
    weightKg: profile.weightKg,
    sensitivity: profile.sensitivity ?? 'typical',
    smokingStatus: 'non-smoker',
    pregnancyStatus: 'unspecified',
    takesOralContraceptives: false,
  };
}

function sharedPayloadToState(payload: SharedScenarioPayload): AppScenarioState {
  const profile: PersonProfile = {
    ...DEFAULT_PROFILE,
    weightKg: payload.calcParams.weightKg,
    sensitivity: payload.calcParams.sensitivity,
    smokingStatus: 'non-smoker',
    pregnancyStatus: 'unspecified',
    takesOralContraceptives: false,
  };

  if (payload.v === 1) {
    return migrateScenarioState({
      version: 1,
      profile,
      intakes: payload.intakes.map(parseSharedIntake),
      sleep: payload.sleep,
      updatedAt: new Date().toISOString(),
    });
  }

  const scenarios: ScenarioState[] = payload.scenarios.map((scenario, index) => ({
    id: scenario.id || `scenario-${index + 1}`,
    name: sanitizeLabel(scenario.name || `Scenario ${index + 1}`),
    intakes: scenario.intakes.map(parseSharedIntake),
  }));

  return migrateScenarioState({
    schemaVersion: APP_SCHEMA_VERSION,
    profile,
    scenarios,
    sleep: payload.sleep,
    updatedAt: new Date().toISOString(),
  });
}

function serializeIntake(intake: CaffeineIntake): SharedIntakePayload {
  return {
    label: sanitizeLabel(intake.label),
    caffeineMg: intake.caffeineMg,
    consumedAt: new Date(intake.consumedAt).toISOString(),
    servingMl: intake.servingMl,
    catalogId: intake.catalogId,
    sourceConfidence: intake.sourceConfidence,
  };
}

function parseSharedIntake(intake: SharedIntakePayload, index: number): CaffeineIntake {
  return {
    id: `shared-${index}-${new Date(intake.consumedAt).getTime()}`,
    label: sanitizeLabel(intake.label),
    caffeineMg: intake.caffeineMg,
    consumedAt: new Date(intake.consumedAt),
    servingMl: intake.servingMl,
    catalogId: intake.catalogId,
    sourceConfidence: intake.sourceConfidence,
  };
}

function assertSharePayload(payload: SharedScenarioPayload) {
  if (!payload || (payload.v !== 1 && payload.v !== 2)) throw new Error('Unsupported share payload');
  if (!payload.calcParams || typeof payload.calcParams !== 'object') throw new Error('Missing calculation parameters');
  assertFiniteRange(payload.calcParams.weightKg, 25, 250, 'weightKg');
  if (!['low', 'typical', 'high'].includes(payload.calcParams.sensitivity)) throw new Error('Invalid sensitivity');
  assertFiniteRange(payload.calcParams.halfLifeMinutes, 90, 1_200, 'halfLifeMinutes');
  assertFiniteRange(payload.calcParams.absorptionHalfLifeMinutes, 1, 240, 'absorptionHalfLifeMinutes');
  assertFiniteRange(payload.calcParams.volumeDistributionLPerKg, 0.1, 2, 'volumeDistributionLPerKg');

  assertSleep(payload.sleep);
  if (payload.v === 1) {
    assertSharedIntakes(payload.intakes);
  } else {
    if (!Array.isArray(payload.scenarios) || payload.scenarios.length < 2) throw new Error('Invalid scenarios');
    for (const scenario of payload.scenarios.slice(0, SCENARIO_COMPARISON_COUNT)) {
      if (typeof scenario.name !== 'string' || scenario.name.length > 80) throw new Error('Invalid scenario name');
      assertSharedIntakes(scenario.intakes);
    }
  }
}

function assertSleep(sleep: SleepSettings | (SleepSettings & { thresholdMgPerL?: number })) {
  const checkedSleep = sleep ?? createDefaultSleepSettings();
  if (!isValidDateString(checkedSleep.bedtime)) throw new Error('Invalid bedtime');
  const legacyThreshold = 'thresholdMgPerL' in checkedSleep ? checkedSleep.thresholdMgPerL : undefined;
  const reference = checkedSleep.referenceLineMgPerL ?? legacyThreshold;
  if (reference !== undefined) assertFiniteRange(reference, 0.05, 10, 'referenceLineMgPerL');
}

function assertSharedIntakes(intakes: SharedIntakePayload[]) {
  if (!Array.isArray(intakes) || intakes.length > MAX_SHARED_INTAKES) throw new Error('Invalid intakes');
  for (const intake of intakes) {
    if (typeof intake.label !== 'string' || intake.label.length > 80) throw new Error('Invalid intake label');
    assertFiniteRange(intake.caffeineMg, 1, 1_000, 'caffeineMg');
    if (!isValidDateString(intake.consumedAt)) throw new Error('Invalid consumedAt');
    if (intake.servingMl !== undefined) assertFiniteRange(intake.servingMl, 1, 1_500, 'servingMl');
    if (intake.catalogId !== undefined && (typeof intake.catalogId !== 'string' || intake.catalogId.length > 120)) throw new Error('Invalid catalogId');
    if (intake.sourceConfidence !== undefined && (typeof intake.sourceConfidence !== 'string' || intake.sourceConfidence.length > 40)) throw new Error('Invalid sourceConfidence');
  }
}

function assertFiniteRange(value: number, min: number, max: number, field: string) {
  if (!Number.isFinite(value) || value < min || value > max) throw new Error(`${field} out of range`);
}

function isValidDateString(value: string) {
  return typeof value === 'string' && Number.isFinite(new Date(value).getTime());
}
