import { describe, expect, it } from 'vitest';
import { addManualIntake, createDefaultScenarioState, loadScenarioState, saveScenarioState } from './index';

function memoryStorage(seed?: string) {
  const store = new Map<string, string>();
  if (seed) store.set('caffeine-pk/scenario/v1', seed);
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
  };
}

describe('local scenario persistence', () => {
  it('saves and loads the local scenario including local-only profile flags', () => {
    const storage = memoryStorage();
    const state = addManualIntake(createDefaultScenarioState(new Date('2026-06-14T00:00:00.000Z')), 'Manual', 100, new Date('2026-06-14T08:00:00.000Z'));
    state.profile.smokingStatus = 'smoker';
    state.profile.takesOralContraceptives = true;

    saveScenarioState(state, storage);
    const loaded = loadScenarioState(storage);

    expect(loaded.ok).toBe(true);
    expect(loaded.state.profile.smokingStatus).toBe('smoker');
    expect(loaded.state.profile.takesOralContraceptives).toBe(true);
    expect(loaded.state.intakes[0].caffeineMg).toBe(100);
  });

  it('recovers to defaults when stored JSON is malformed', () => {
    const loaded = loadScenarioState(memoryStorage('{bad json'));

    expect(loaded.ok).toBe(false);
    expect(loaded.recovered).toBe(true);
    expect(loaded.state.profile.weightKg).toBe(70);
  });
});
