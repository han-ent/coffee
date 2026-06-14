import type { CaffeineSensitivity, PersonProfile } from '../domain';
import { estimatePkParameters, type CaffeineIntake } from '../domain';
import type { AppScenarioState } from './scenario';
import { DEFAULT_PROFILE, sanitizeLabel } from './scenario';

export const SHARE_PARAM = 'scenario';
export const SHARE_LABEL_PRIVACY_WARNING =
  'Share links include coffee labels and timestamps. Avoid names, locations, health details, or anything you would not want a recipient to see.';

export interface SharedScenarioPayload {
  v: 1;
  calcParams: {
    weightKg: number;
    sensitivity: CaffeineSensitivity;
    halfLifeMinutes: number;
    absorptionHalfLifeMinutes: number;
    volumeDistributionLPerKg: number;
  };
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
  const parameters = estimatePkParameters(state.profile);
  return {
    v: 1,
    calcParams: {
      weightKg: state.profile.weightKg,
      sensitivity: state.profile.sensitivity ?? 'typical',
      halfLifeMinutes: parameters.halfLifeMinutes,
      absorptionHalfLifeMinutes: parameters.absorptionHalfLifeMinutes,
      volumeDistributionLPerKg: parameters.volumeDistributionLPerKg,
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
  return btoa(unescape(encodeURIComponent(json)));
}

export function decodeSharePayload(encoded: string): SharedScenarioPayload {
  try {
    const json = decodeURIComponent(escape(atob(encoded)));
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
      state: { profile, intakes, updatedAt: new Date().toISOString() },
      warning: 'Sensitive local-only profile flags were not included in this shared scenario.',
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Share link is malformed or unsupported' };
  }
}

function assertSharePayload(payload: SharedScenarioPayload) {
  if (!payload || payload.v !== 1) throw new Error('Unsupported share payload');
  if (!payload.calcParams || typeof payload.calcParams.weightKg !== 'number') throw new Error('Missing calculation parameters');
  if (!Array.isArray(payload.intakes)) throw new Error('Missing intakes');
  for (const intake of payload.intakes) {
    if (typeof intake.label !== 'string' || typeof intake.caffeineMg !== 'number' || typeof intake.consumedAt !== 'string') {
      throw new Error('Invalid intake in share payload');
    }
  }
}
