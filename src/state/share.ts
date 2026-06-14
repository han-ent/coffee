import type { CaffeineSensitivity, PersonProfile } from '../domain';
import { estimatePkParameters, type CaffeineIntake } from '../domain';
import type { AppScenarioState, SleepSettings } from './scenario';
import { DEFAULT_PROFILE, createDefaultSleepSettings, sanitizeLabel } from './scenario';

export const SHARE_PARAM = 'scenario';
export const SHARE_LABEL_PRIVACY_WARNING =
  'Share links include coffee labels and timestamps. Avoid names, locations, health details, or anything you would not want a recipient to see.';

const MAX_SHARED_INTAKES = 24;
const MAX_SHARE_BYTES = 8_192;

export interface SharedScenarioPayload {
  v: 1;
  calcParams: {
    weightKg: number;
    sensitivity: CaffeineSensitivity;
    halfLifeMinutes: number;
    absorptionHalfLifeMinutes: number;
    volumeDistributionLPerKg: number;
  };
  sleep: SleepSettings;
  intakes: Array<{
    label: string;
    caffeineMg: number;
    consumedAt: string;
    servingMl?: number;
  }>;
}

export type DecodeShareResult =
  | { ok: true; state: AppScenarioState; warning?: string }
  | { ok: false; error: string };

export function createSharePayload(state: AppScenarioState): SharedScenarioPayload {
  const shareSafeProfile = toShareSafeProfile(state.profile);
  const parameters = estimatePkParameters(shareSafeProfile);
  return {
    v: 1,
    calcParams: {
      weightKg: shareSafeProfile.weightKg,
      sensitivity: shareSafeProfile.sensitivity ?? 'typical',
      halfLifeMinutes: parameters.halfLifeMinutes,
      absorptionHalfLifeMinutes: parameters.absorptionHalfLifeMinutes,
      volumeDistributionLPerKg: parameters.volumeDistributionLPerKg,
    },
    sleep: {
      bedtime: new Date(state.sleep.bedtime).toISOString(),
      thresholdMgPerL: state.sleep.thresholdMgPerL,
    },
    intakes: state.intakes.map((intake) => ({
      label: sanitizeLabel(intake.label),
      caffeineMg: intake.caffeineMg,
      consumedAt: new Date(intake.consumedAt).toISOString(),
      servingMl: intake.servingMl,
    })),
  };
}

export function encodeSharePayload(payload: SharedScenarioPayload): string {
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
  url.searchParams.set(SHARE_PARAM, encodeSharePayload(createSharePayload(state)));
  return url.toString();
}

export function loadShareFromUrl(search = window.location.search): DecodeShareResult {
  const params = new URLSearchParams(search);
  const encoded = params.get(SHARE_PARAM);
  if (!encoded) return { ok: false, error: 'No shared scenario in URL' };

  try {
    const payload = decodeSharePayload(encoded);
    const profile: PersonProfile = {
      ...DEFAULT_PROFILE,
      weightKg: payload.calcParams.weightKg,
      sensitivity: payload.calcParams.sensitivity,
      smokingStatus: 'non-smoker',
      pregnancyStatus: 'unspecified',
      takesOralContraceptives: false,
    };
    const intakes: CaffeineIntake[] = payload.intakes.map((intake, index) => ({
      id: `shared-${index}-${new Date(intake.consumedAt).getTime()}`,
      label: sanitizeLabel(intake.label),
      caffeineMg: intake.caffeineMg,
      consumedAt: new Date(intake.consumedAt),
      servingMl: intake.servingMl,
    }));

    return {
      ok: true,
      state: { profile, intakes, sleep: payload.sleep, updatedAt: new Date().toISOString() },
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

function assertSharePayload(payload: SharedScenarioPayload) {
  if (!payload || payload.v !== 1) throw new Error('Unsupported share payload');
  if (!payload.calcParams || typeof payload.calcParams !== 'object') throw new Error('Missing calculation parameters');
  assertFiniteRange(payload.calcParams.weightKg, 25, 250, 'weightKg');
  if (!['low', 'typical', 'high'].includes(payload.calcParams.sensitivity)) throw new Error('Invalid sensitivity');
  assertFiniteRange(payload.calcParams.halfLifeMinutes, 90, 1_200, 'halfLifeMinutes');
  assertFiniteRange(payload.calcParams.absorptionHalfLifeMinutes, 1, 240, 'absorptionHalfLifeMinutes');
  assertFiniteRange(payload.calcParams.volumeDistributionLPerKg, 0.1, 2, 'volumeDistributionLPerKg');

  if (!payload.sleep) payload.sleep = createDefaultSleepSettings();
  if (!isValidDateString(payload.sleep.bedtime)) throw new Error('Invalid bedtime');
  assertFiniteRange(payload.sleep.thresholdMgPerL, 0.05, 10, 'thresholdMgPerL');

  if (!Array.isArray(payload.intakes) || payload.intakes.length > MAX_SHARED_INTAKES) throw new Error('Invalid intakes');
  for (const intake of payload.intakes) {
    if (typeof intake.label !== 'string' || intake.label.length > 80) throw new Error('Invalid intake label');
    assertFiniteRange(intake.caffeineMg, 1, 1_000, 'caffeineMg');
    if (!isValidDateString(intake.consumedAt)) throw new Error('Invalid consumedAt');
    if (intake.servingMl !== undefined) assertFiniteRange(intake.servingMl, 1, 1_500, 'servingMl');
  }
}

function assertFiniteRange(value: number, min: number, max: number, field: string) {
  if (!Number.isFinite(value) || value < min || value > max) throw new Error(`${field} out of range`);
}

function isValidDateString(value: string) {
  return typeof value === 'string' && Number.isFinite(new Date(value).getTime());
}
