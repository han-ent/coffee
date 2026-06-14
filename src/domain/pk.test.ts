import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PK_PARAMETERS,
  NON_MEDICAL_DISCLAIMER,
  absorbedCentralAmountMg,
  concentrationAt,
  estimatePkParameters,
  findLatestCoffeeTimeForThreshold,
  residualFractionAfter,
  simulateScenario,
  type CaffeineIntake,
  type PersonProfile,
  type Scenario,
} from './index';

const baseTime = new Date('2026-06-14T00:00:00.000Z');
const typicalProfile: PersonProfile = {
  weightKg: 70,
  ageYears: 35,
  sensitivity: 'typical',
  smokingStatus: 'non-smoker',
  pregnancyStatus: 'not-pregnant',
};

function minutesAfter(minutes: number) {
  return new Date(baseTime.getTime() + minutes * 60_000);
}

function intake(id: string, caffeineMg: number, consumedAt = baseTime): CaffeineIntake {
  return { id, label: id, caffeineMg, consumedAt };
}

describe('caffeine PK domain model', () => {
  it('preserves the configured elimination half-life in the post-absorption tail', () => {
    expect(residualFractionAfter(DEFAULT_PK_PARAMETERS.halfLifeMinutes, DEFAULT_PK_PARAMETERS.halfLifeMinutes)).toBeCloseTo(0.5, 8);

    const early = absorbedCentralAmountMg(100, 8 * 60, DEFAULT_PK_PARAMETERS);
    const oneHalfLifeLater = absorbedCentralAmountMg(100, 13 * 60, DEFAULT_PK_PARAMETERS);

    expect(oneHalfLifeLater / early).toBeCloseTo(0.5, 1);
  });

  it('produces a monotonic tail after absorption peak', () => {
    const scenario: Scenario = {
      id: 'tail',
      name: 'Tail',
      profile: typicalProfile,
      intakes: [intake('espresso', 80)],
    };

    const result = simulateScenario(scenario, {
      startAt: baseTime,
      endAt: minutesAfter(12 * 60),
      stepMinutes: 30,
    });

    const tail = result.points.filter((point) => point.elapsedMinutes >= 180);
    for (let i = 1; i < tail.length; i += 1) {
      expect(tail[i].concentrationMgPerL).toBeLessThanOrEqual(tail[i - 1].concentrationMgPerL);
    }
  });

  it('superposes multiple intakes by summing their independent contributions', () => {
    const at = minutesAfter(240);
    const first = concentrationAt(typicalProfile, [intake('morning', 100)], at).centralMg;
    const second = concentrationAt(typicalProfile, [intake('noon', 60, minutesAfter(120))], at).centralMg;
    const combined = concentrationAt(
      typicalProfile,
      [intake('morning', 100), intake('noon', 60, minutesAfter(120))],
      at,
    );

    expect(combined.centralMg).toBeCloseTo(first + second, 8);
    expect(combined.contributors).toHaveLength(2);
  });

  it('wraps estimates in uncertainty bounds around the nominal concentration', () => {
    const result = simulateScenario(
      { id: 'bounds', name: 'Bounds', profile: typicalProfile, intakes: [intake('mug', 120)] },
      { startAt: baseTime, endAt: minutesAfter(360), stepMinutes: 15 },
    );

    const activePoints = result.points.filter((point) => point.concentrationMgPerL > 0.01);
    expect(activePoints.length).toBeGreaterThan(0);
    for (const point of activePoints) {
      expect(point.bounds.lowMgPerL).toBeLessThanOrEqual(point.concentrationMgPerL);
      expect(point.bounds.highMgPerL).toBeGreaterThanOrEqual(point.concentrationMgPerL);
    }
  });

  it('applies profile effects to concentration and half-life estimates', () => {
    const lightProfile: PersonProfile = { ...typicalProfile, weightKg: 50 };
    const heavyProfile: PersonProfile = { ...typicalProfile, weightKg: 100 };
    const sensitiveProfile: PersonProfile = { ...typicalProfile, sensitivity: 'high' };
    const smokerProfile: PersonProfile = { ...typicalProfile, smokingStatus: 'smoker' };

    const at = minutesAfter(180);
    const lightConcentration = concentrationAt(lightProfile, [intake('same dose', 100)], at).concentrationMgPerL;
    const heavyConcentration = concentrationAt(heavyProfile, [intake('same dose', 100)], at).concentrationMgPerL;

    expect(lightConcentration).toBeGreaterThan(heavyConcentration);
    expect(estimatePkParameters(sensitiveProfile).halfLifeMinutes).toBeGreaterThan(estimatePkParameters(typicalProfile).halfLifeMinutes);
    expect(estimatePkParameters(smokerProfile).halfLifeMinutes).toBeLessThan(estimatePkParameters(typicalProfile).halfLifeMinutes);
  });

  it('includes non-medical assumption content in simulation output', () => {
    const result = simulateScenario(
      { id: 'copy', name: 'Copy', profile: typicalProfile, intakes: [intake('capsule', 150)] },
      { startAt: baseTime, endAt: minutesAfter(60), stepMinutes: 10 },
    );

    expect(result.disclaimer).toBe(NON_MEDICAL_DISCLAIMER);
    expect(result.disclaimer).toMatch(/not medical advice/i);
    expect(result.assumptions.join(' ')).toMatch(/one-compartment/i);
    expect(result.assumptions.join(' ')).toMatch(/uncertainty band/i);
  });

  it('finds a latest candidate coffee time that stays under a target concentration threshold', () => {
    const targetTime = minutesAfter(22 * 60);
    const latest = findLatestCoffeeTimeForThreshold(
      { id: 'threshold', name: 'Threshold', profile: typicalProfile, intakes: [] },
      { id: 'candidate', label: 'Vertuo mug', caffeineMg: 170 },
      targetTime,
      0.7,
      minutesAfter(8 * 60),
      30,
    );

    expect(latest).not.toBeNull();
    expect(latest!.getTime()).toBeLessThan(targetTime.getTime());

    const atTarget = concentrationAt(
      typicalProfile,
      [intake('candidate', 170, latest!)],
      targetTime,
    ).concentrationMgPerL;
    expect(atTarget).toBeLessThanOrEqual(0.7);
  });
});
