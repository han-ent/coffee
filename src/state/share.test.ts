import { describe, expect, it } from 'vitest';
import { estimatePkParameters } from '../domain';
import {
  DEFAULT_PROFILE,
  SHARE_LABEL_PRIVACY_WARNING,
  addManualIntake,
  createDefaultScenarioState,
  createSharePayload,
  createShareUrl,
  encodeSharePayload,
  loadShareFromUrl,
  sanitizeLabel,
  toShareSafeProfile,
  updateProfile,
  updateSleepSettings,
} from './index';

const consumedAt = new Date('2026-06-14T09:30:00.000Z');

describe('share payload privacy contract', () => {
  it('includes v2 scenario calculation essentials and excludes sensitive local-only profile flags', () => {
    const state = addManualIntake(
      updateSleepSettings(
        updateProfile(createDefaultScenarioState(consumedAt), {
          weightKg: 62,
          sensitivity: 'high',
          smokingStatus: 'smoker',
          pregnancyStatus: 'pregnant-or-postpartum',
          takesOralContraceptives: true,
          displayName: 'Private Name',
        }),
        { bedtime: '2026-06-14T22:00:00.000Z', referenceLineMgPerL: 0.8 },
      ),
      'scenario-2',
      'Office latte\nnear home',
      140,
      consumedAt,
    );

    const payload = createSharePayload(state);
    const serialized = JSON.stringify(payload);
    const shareSafeProfile = toShareSafeProfile(state.profile);

    expect(payload.v).toBe(2);
    expect(payload.calcParams.weightKg).toBe(62);
    expect(payload.calcParams.sensitivity).toBe('high');
    expect(payload.calcParams.halfLifeMinutes).toBe(estimatePkParameters(shareSafeProfile).halfLifeMinutes);
    expect(payload.sleep).toEqual({ bedtime: '2026-06-14T22:00:00.000Z', referenceLineMgPerL: 0.8 });
    expect(payload.scenarios[1].intakes[0].label).toBe('Office latte near home');
    expect(serialized).not.toMatch(/smoker|pregnant|contraceptive|Private Name/i);
    expect(SHARE_LABEL_PRIVACY_WARNING).toMatch(/labels and timestamps/i);
  });

  it('keeps shared calculation parameters stable when sensitive local-only flags change', () => {
    const baseline = updateProfile(createDefaultScenarioState(consumedAt), {
      weightKg: 70,
      sensitivity: 'typical',
      smokingStatus: 'non-smoker',
      pregnancyStatus: 'not-pregnant',
      takesOralContraceptives: false,
    });
    const sensitiveFlags = updateProfile(baseline, {
      smokingStatus: 'smoker',
      pregnancyStatus: 'pregnant-or-postpartum',
      takesOralContraceptives: true,
    });

    expect(createSharePayload(sensitiveFlags).calcParams).toEqual(createSharePayload(baseline).calcParams);
  });

  it('round-trips a v2 URL share into a safe two-scenario state and handles malformed links', () => {
    const state = updateSleepSettings(
      addManualIntake(createDefaultScenarioState(consumedAt), 'scenario-2', 'Vertuo mug', 170, consumedAt),
      { bedtime: '2026-06-14T22:15:00.000Z', referenceLineMgPerL: 0.6 },
    );
    const url = createShareUrl(state, 'https://example.test/app?old=1');
    const result = loadShareFromUrl(new URL(url).search);

    expect(new URL(url).searchParams.has('old')).toBe(false);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.schemaVersion).toBe(2);
      expect(result.state.profile.weightKg).toBe(70);
      expect(result.state.profile.smokingStatus).toBe('non-smoker');
      expect(result.state.profile.pregnancyStatus).toBe('unspecified');
      expect(result.state.profile.takesOralContraceptives).toBe(false);
      expect(result.state.sleep).toEqual({ bedtime: '2026-06-14T22:15:00.000Z', referenceLineMgPerL: 0.6 });
      expect(result.state.scenarios[1].intakes[0].label).toBe('Vertuo mug');
      expect(result.warning).toMatch(/Sensitive local-only/i);
    }

    expect(loadShareFromUrl('?scenario=not-valid').ok).toBe(false);
    expect(loadShareFromUrl(`?scenario=${btoa(JSON.stringify({ v: 1, calcParams: { weightKg: Number.NaN }, intakes: [] }))}`).ok).toBe(false);
  });

  it('decodes legacy v1 share payloads into two v2 scenarios', () => {
    const legacyPayload = {
      v: 1,
      calcParams: {
        weightKg: 68,
        sensitivity: 'typical',
        halfLifeMinutes: 300,
        absorptionHalfLifeMinutes: 35,
        volumeDistributionLPerKg: 0.6,
      },
      sleep: { bedtime: '2026-06-14T22:00:00.000Z', thresholdMgPerL: 0.9 },
      intakes: [{ label: 'Legacy espresso', caffeineMg: 75, consumedAt: '2026-06-14T08:00:00.000Z' }],
    } as const;

    const result = loadShareFromUrl(`?scenario=${encodeSharePayload(legacyPayload)}`);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.schemaVersion).toBe(2);
      expect(result.state.scenarios[0].intakes[0].label).toBe('Legacy espresso');
      expect(result.state.scenarios[1].intakes[0].label).toBe('Legacy espresso');
      expect(result.state.sleep.referenceLineMgPerL).toBe(0.9);
    }
  });

  it('rejects invalid payloads during share creation, not only decode', () => {
    const state = createDefaultScenarioState(consumedAt);
    const payload = createSharePayload(state);
    payload.calcParams.weightKg = 251;

    expect(() => encodeSharePayload(payload)).toThrow(/malformed|unsupported|weightKg|range/i);
  });

  it('sanitizes labels for persistence and sharing display', () => {
    expect(sanitizeLabel('  one\n two\tthree  ')).toBe('one two three');
    expect(sanitizeLabel('')).toBe('Coffee');
    expect(sanitizeLabel('x'.repeat(120))).toHaveLength(80);
  });

  it('creates isolated default profiles instead of sharing the mutable singleton', () => {
    const first = createDefaultScenarioState(consumedAt);
    const second = createDefaultScenarioState(consumedAt);
    first.profile.weightKg = 45;

    expect(second.profile.weightKg).toBe(DEFAULT_PROFILE.weightKg);
    expect(first.profile).not.toBe(second.profile);
  });
});
