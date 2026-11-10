import { describe, expect, it } from 'vitest';
import { LEGACY_STORAGE_KEY, addCatalogIntake, addManualIntake, createDefaultScenarioState, loadScenarioState, removeIntake, saveScenarioState } from './index';

function memoryStorage(seed?: string) {
  const store = new Map<string, string>();
  if (seed) store.set(LEGACY_STORAGE_KEY, seed);
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
  };
}

describe('local scenario persistence', () => {
  it('saves and loads v2 scenarios including local-only profile flags and sleep reference settings', () => {
    const storage = memoryStorage();
    const state = addManualIntake(createDefaultScenarioState(new Date('2026-06-14T00:00:00.000Z')), 'scenario-2', 'Manual', 100, new Date('2026-06-14T08:00:00.000Z'));
    state.profile.smokingStatus = 'smoker';
    state.profile.takesOralContraceptives = true;
    state.sleep.referenceLineMgPerL = 0.6;
    state.sleep.referenceLineManual = true;

    expect(saveScenarioState(state, storage).ok).toBe(true);
    const loaded = loadScenarioState(storage);

    expect(loaded.ok).toBe(true);
    expect(loaded.state.schemaVersion).toBe(2);
    expect(loaded.state.profile.smokingStatus).toBe('smoker');
    expect(loaded.state.profile.takesOralContraceptives).toBe(true);
    expect(loaded.state.scenarios[0].name).toBe('Scenario 1');
    expect(loaded.state.scenarios[1].intakes[0].caffeineMg).toBe(100);
    expect(loaded.state.sleep.referenceLineMgPerL).toBe(0.6);
    expect(loaded.state.sleep.bedtimeClock).toBe('23:00');
  });

  it('migrates the old pregnancy toggle and keeps a custom reference line', () => {
    const storage = memoryStorage();
    const legacy = {
      schemaVersion: 2,
      profile: { weightKg: 70, pregnancyStatus: 'pregnant-or-postpartum', sensitivity: 'high' },
      scenarios: [
        { id: 'scenario-1', name: 'Scenario 1', intakes: [] },
        { id: 'scenario-2', name: 'Scenario 2', intakes: [] },
      ],
      sleep: { bedtime: '2026-06-14T23:00:00.000Z', referenceLineMgPerL: 0.8 },
    };
    storage.setItem('caffeine-pk/scenario/v2', JSON.stringify(legacy));

    const loaded = loadScenarioState(storage);

    expect(loaded.ok).toBe(true);
    expect(loaded.state.profile.pregnancyStatus).toBe('second-trimester');
    expect(loaded.state.sleep.referenceLineMgPerL).toBe(0.8);
    expect(loaded.state.sleep.referenceLineManual).toBe(true);
  });

  it('preserves catalog provenance for stored catalog intakes', () => {
    const storage = memoryStorage();
    const state = addCatalogIntake(
      createDefaultScenarioState(new Date('2026-06-14T00:00:00.000Z')),
      'scenario-1',
      'nespresso-vertuo-melozio-decaffeinato',
      new Date('2026-06-14T09:00:00.000Z'),
    );

    expect(saveScenarioState(state, storage).ok).toBe(true);
    const loaded = loadScenarioState(storage);

    expect(loaded.state.scenarios[0].intakes[0].catalogId).toBe('nespresso-vertuo-melozio-decaffeinato');
    expect(loaded.state.scenarios[0].intakes[0].sourceConfidence).toBe('official-range');
  });

  it('reports storage write failures without throwing', () => {
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota exceeded');
      },
    };

    const result = saveScenarioState(createDefaultScenarioState(), storage);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/quota exceeded/i);
  });

  it('migrates v1 local storage into Scenario 1 and a Scenario 2 comparison clone', () => {
    const legacy = {
      version: 1,
      profile: { weightKg: 70 },
      intakes: [{ id: 'legacy', label: 'Legacy mug', caffeineMg: 120, consumedAt: '2026-06-14T08:00:00.000Z' }],
      sleep: { bedtime: '2026-06-14T22:00:00.000Z', thresholdMgPerL: 0.8 },
    };

    const loaded = loadScenarioState(memoryStorage(JSON.stringify(legacy)));

    expect(loaded.ok).toBe(true);
    expect(loaded.state.schemaVersion).toBe(2);
    expect(loaded.state.scenarios).toHaveLength(2);
    expect(loaded.state.scenarios[0].intakes[0].label).toBe('Legacy mug');
    expect(loaded.state.scenarios[1].intakes[0].label).toBe('Legacy mug');
    expect(loaded.state.sleep.referenceLineMgPerL).toBe(0.8);
  });

  it('keeps same-timestamp manual intakes independently removable', () => {
    const consumedAt = new Date('2026-06-14T08:00:00.000Z');
    const withFirst = addManualIntake(createDefaultScenarioState(), 'scenario-1', 'Manual', 100, consumedAt);
    const withSecond = addManualIntake(withFirst, 'scenario-1', 'Manual', 100, consumedAt);
    const ids = withSecond.scenarios[0].intakes.map((intake) => intake.id);

    expect(new Set(ids).size).toBe(2);

    const afterRemove = removeIntake(withSecond, 'scenario-1', ids[0]);
    expect(afterRemove.scenarios[0].intakes).toHaveLength(1);
    expect(afterRemove.scenarios[0].intakes[0].id).toBe(ids[1]);
  });

  it('recovers to defaults when stored JSON is malformed', () => {
    const loaded = loadScenarioState(memoryStorage('{bad json'));

    expect(loaded.ok).toBe(false);
    expect(loaded.recovered).toBe(true);
    expect(loaded.state.profile.weightKg).toBe(70);
  });

  it('recovers to defaults when stored schema or profile ranges are invalid', () => {
    const invalidVersion = loadScenarioState(memoryStorage(JSON.stringify({ version: 999, scenarios: [], profile: { weightKg: 70 } })));
    const invalidWeight = loadScenarioState(memoryStorage(JSON.stringify({ version: 1, profile: { weightKg: 251 }, intakes: [] })));
    const invalidIntake = loadScenarioState(memoryStorage(JSON.stringify({ version: 1, profile: { weightKg: 70 }, intakes: [{ caffeineMg: 100, consumedAt: 'bad-date' }] })));

    expect(invalidVersion.ok).toBe(false);
    expect(invalidWeight.ok).toBe(false);
    expect(invalidWeight.state.profile.weightKg).toBe(70);
    expect(invalidIntake.ok).toBe(false);
  });
});
