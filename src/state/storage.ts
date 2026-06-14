import type { AppScenarioState } from './scenario';
import { createDefaultScenarioState, createDefaultSleepSettings } from './scenario';

export const STORAGE_KEY = 'caffeine-pk/scenario/v1';

export type LoadResult =
  | { ok: true; state: AppScenarioState; recovered: false }
  | { ok: false; state: AppScenarioState; recovered: true; error: string };

export function saveScenarioState(state: AppScenarioState, storage = resolveStorage()) {
  if (!storage) return;
  storage.setItem(STORAGE_KEY, JSON.stringify(serializeState(state)));
}

export function loadScenarioState(storage = resolveStorage()): LoadResult {
  try {
    if (!storage) return { ok: true, state: createDefaultScenarioState(), recovered: false };
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { ok: true, state: createDefaultScenarioState(), recovered: false };
    return { ok: true, state: parseStoredState(JSON.parse(raw)), recovered: false };
  } catch (error) {
    return {
      ok: false,
      state: createDefaultScenarioState(),
      recovered: true,
      error: error instanceof Error ? error.message : 'Could not read stored scenario',
    };
  }
}

function serializeState(state: AppScenarioState) {
  return {
    version: 1,
    profile: state.profile,
    intakes: state.intakes.map((intake) => ({
      ...intake,
      consumedAt: new Date(intake.consumedAt).toISOString(),
    })),
    sleep: state.sleep,
    updatedAt: state.updatedAt,
  };
}

function parseStoredState(value: unknown): AppScenarioState {
  if (!value || typeof value !== 'object') throw new Error('Stored scenario is not an object');
  const record = value as Record<string, unknown>;
  if (record.version !== 1) throw new Error('Unsupported stored scenario version');

  const profile = record.profile as AppScenarioState['profile'];
  const intakes = record.intakes as AppScenarioState['intakes'];
  const updatedAt = typeof record.updatedAt === 'string' ? record.updatedAt : new Date().toISOString();
  const sleep = parseSleep(record.sleep);

  validateProfile(profile);
  if (!Array.isArray(intakes)) throw new Error('Stored intakes must be an array');
  for (const intake of intakes) {
    if (!Number.isFinite(intake.caffeineMg) || intake.caffeineMg <= 0 || !Number.isFinite(new Date(intake.consumedAt).getTime())) {
      throw new Error('Stored intake is invalid');
    }
  }

  return { profile: { ...profile }, intakes, sleep, updatedAt };
}

function resolveStorage(): Pick<Storage, 'getItem' | 'setItem'> | null {
  if (typeof window === 'undefined' || !('localStorage' in window) || !window.localStorage) return null;
  return window.localStorage;
}

function validateProfile(profile: AppScenarioState['profile']) {
  if (!profile || !Number.isFinite(profile.weightKg) || profile.weightKg < 25 || profile.weightKg > 250) {
    throw new Error('Stored profile weightKg is out of range');
  }
  if (profile.ageYears !== undefined && (!Number.isFinite(profile.ageYears) || profile.ageYears < 0 || profile.ageYears > 130)) {
    throw new Error('Stored profile ageYears is out of range');
  }
}

function parseSleep(value: unknown): AppScenarioState['sleep'] {
  if (!value || typeof value !== 'object') return createDefaultSleepSettings();
  const sleep = value as Partial<AppScenarioState['sleep']>;
  if (!sleep.bedtime || !Number.isFinite(new Date(sleep.bedtime).getTime())) return createDefaultSleepSettings();
  if (!Number.isFinite(sleep.thresholdMgPerL) || sleep.thresholdMgPerL! < 0.05 || sleep.thresholdMgPerL! > 10) return createDefaultSleepSettings();
  return { bedtime: sleep.bedtime, thresholdMgPerL: sleep.thresholdMgPerL! };
}
