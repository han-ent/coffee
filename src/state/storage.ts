import type { AppScenarioState } from './scenario';
import { createDefaultScenarioState } from './scenario';

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
  const profile = record.profile as AppScenarioState['profile'];
  const intakes = record.intakes as AppScenarioState['intakes'];
  const updatedAt = typeof record.updatedAt === 'string' ? record.updatedAt : new Date().toISOString();
  const sleep = record.sleep && typeof record.sleep === 'object'
    ? record.sleep as AppScenarioState['sleep']
    : createDefaultScenarioState().sleep;

  if (!profile || typeof profile.weightKg !== 'number') throw new Error('Stored profile is missing weightKg');
  if (!Array.isArray(intakes)) throw new Error('Stored intakes must be an array');

  return { profile: { ...profile }, intakes, sleep, updatedAt };
}

function resolveStorage(): Pick<Storage, 'getItem' | 'setItem'> | null {
  if (typeof window === 'undefined' || !('localStorage' in window) || !window.localStorage) return null;
  return window.localStorage;
}
