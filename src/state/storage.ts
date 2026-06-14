import type { AppScenarioState } from './scenario';
import { createDefaultScenarioState, migrateScenarioState } from './scenario';

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
    return { ok: true, state: migrateScenarioState(JSON.parse(raw)), recovered: false };
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
    schemaVersion: 2,
    profile: state.profile,
    scenarios: state.scenarios.map((scenario) => ({
      id: scenario.id,
      name: scenario.name,
      intakes: scenario.intakes.map((intake) => ({
        ...intake,
        consumedAt: new Date(intake.consumedAt).toISOString(),
      })),
    })),
    sleep: state.sleep,
    updatedAt: state.updatedAt,
  };
}

function resolveStorage(): Pick<Storage, 'getItem' | 'setItem'> | null {
  if (typeof window === 'undefined' || !('localStorage' in window) || !window.localStorage) return null;
  return window.localStorage;
}
