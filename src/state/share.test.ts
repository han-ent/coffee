import { describe, expect, it } from 'vitest';
import { estimatePkParameters } from '../domain';
import {
  SHARE_LABEL_PRIVACY_WARNING,
  addManualIntake,
  createDefaultScenarioState,
  createSharePayload,
  createShareUrl,
  loadShareFromUrl,
  sanitizeLabel,
  updateProfile,
} from './index';

const consumedAt = new Date('2026-06-14T09:30:00.000Z');

describe('share payload privacy contract', () => {
  it('includes calculation essentials and excludes sensitive local-only profile flags', () => {
    const state = addManualIntake(
      updateProfile(createDefaultScenarioState(consumedAt), {
        weightKg: 62,
        sensitivity: 'high',
        smokingStatus: 'smoker',
        pregnancyStatus: 'pregnant-or-postpartum',
        takesOralContraceptives: true,
        displayName: 'Private Name',
      }),
      'Office latte\nnear home',
      140,
      consumedAt,
    );

    const payload = createSharePayload(state);
    const serialized = JSON.stringify(payload);

    expect(payload.calcParams.weightKg).toBe(62);
    expect(payload.calcParams.sensitivity).toBe('high');
    expect(payload.calcParams.halfLifeMinutes).toBe(estimatePkParameters(state.profile).halfLifeMinutes);
    expect(payload.intakes[0].label).toBe('Office latte near home');
    expect(serialized).not.toMatch(/smoker|pregnant|contraceptive|Private Name/i);
    expect(SHARE_LABEL_PRIVACY_WARNING).toMatch(/labels and timestamps/i);
  });

  it('round-trips a URL share into a safe scenario and handles malformed links', () => {
    const state = addManualIntake(createDefaultScenarioState(consumedAt), 'Vertuo mug', 170, consumedAt);
    const url = createShareUrl(state, 'https://example.test/app?old=1');
    const result = loadShareFromUrl(new URL(url).search);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.profile.weightKg).toBe(70);
      expect(result.state.profile.smokingStatus).toBe('non-smoker');
      expect(result.state.profile.pregnancyStatus).toBe('unspecified');
      expect(result.state.profile.takesOralContraceptives).toBe(false);
      expect(result.state.intakes[0].label).toBe('Vertuo mug');
      expect(result.warning).toMatch(/Sensitive local-only/i);
    }

    expect(loadShareFromUrl('?scenario=not-valid').ok).toBe(false);
  });

  it('sanitizes labels for persistence and sharing display', () => {
    expect(sanitizeLabel('  one\n two\tthree  ')).toBe('one two three');
    expect(sanitizeLabel('')).toBe('Coffee');
    expect(sanitizeLabel('x'.repeat(120))).toHaveLength(80);
  });
});
