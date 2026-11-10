import { describe, expect, it } from 'vitest';
import { concentrationAt, simulateScenario, type PersonProfile, type Scenario } from './domain';
import { bedtimeVerdict, firstDropBelow, formatKoreanWhen } from './planner';
import { nextClockTime } from './state';

const profile: PersonProfile = { weightKg: 70, sensitivity: 'typical', smokingStatus: 'non-smoker' };

describe('planner summary', () => {
  it('treats bedtime as the next fixed clock time, not now plus eight hours', () => {
    const morning = new Date(2026, 5, 14, 9, 0, 0);
    const evening = nextClockTime(morning, '23:00');
    expect(evening.getHours()).toBe(23);
    expect(evening.getMinutes()).toBe(0);
    expect(evening.getDate()).toBe(14);

    const afterBed = new Date(2026, 5, 14, 23, 30, 0);
    const following = nextClockTime(afterBed, '23:00');
    expect(following.getDate()).toBe(15);
    expect(following.getHours()).toBe(23);
  });

  it('waits for the curve to fall back under the reference line after a fresh dose', () => {
    const now = new Date('2026-06-14T08:00:00.000Z');
    const scenario: Scenario = {
      id: 'day',
      name: '오늘',
      profile,
      intakes: [{ id: 'tall', label: '아메리카노 톨', caffeineMg: 150, consumedAt: now }],
    };
    const result = simulateScenario(scenario, {
      startAt: now,
      endAt: new Date(now.getTime() + 36 * 60 * 60_000),
      stepMinutes: 1,
    });
    const current = concentrationAt(profile, scenario.intakes, now).concentrationMgPerL;
    const drop = firstDropBelow(result.points, now, 0.7);

    expect(current).toBeLessThan(0.7);
    expect(drop).toBeInstanceOf(Date);
    expect((drop as Date).getTime()).toBeGreaterThan(now.getTime() + 30 * 60_000);
  });

  it('calls bedtime under the reference line 여유 있음 and over it 주의', () => {
    expect(bedtimeVerdict(0.4, 0.7)).toBe('여유 있음');
    expect(bedtimeVerdict(0.7, 0.7)).toBe('여유 있음');
    expect(bedtimeVerdict(1.2, 0.7)).toBe('주의');
  });

  it('formats the drop time relative to today', () => {
    const now = new Date(2026, 5, 14, 12, 0, 0);
    expect(formatKoreanWhen(new Date(2026, 5, 14, 21, 40, 0), now)).toMatch(/^오늘 /);
    expect(formatKoreanWhen(new Date(2026, 5, 15, 1, 10, 0), now)).toMatch(/^내일 /);
  });
});
