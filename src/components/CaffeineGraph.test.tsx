import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { simulateScenario, type PersonProfile, type Scenario } from '../domain';
import { buildChartModel, CaffeineGraph, indexFromRatio, pointerRatio, type GraphSeries } from './CaffeineGraph';

const startAt = new Date('2026-06-14T08:00:00.000Z');
const endAt = new Date('2026-06-15T20:00:00.000Z');
const profile: PersonProfile = { weightKg: 70, sensitivity: 'typical', smokingStatus: 'non-smoker' };
const scenario: Scenario = {
  id: 'graph',
  name: 'Graph',
  profile,
  intakes: [
    { id: 'morning', label: 'Morning mug', caffeineMg: 170, consumedAt: startAt },
    { id: 'afternoon', label: 'Afternoon espresso', caffeineMg: 80, consumedAt: new Date('2026-06-14T14:00:00.000Z') },
  ],
};
const result = simulateScenario(scenario, { startAt, endAt, stepMinutes: 1 });
const comparison = simulateScenario({ ...scenario, intakes: [...scenario.intakes, { id: 'candidate', label: 'Candidate', caffeineMg: 150, consumedAt: new Date('2026-06-14T16:00:00.000Z') }] }, { startAt, endAt, stepMinutes: 1 });
const series: GraphSeries[] = [
  { id: 'current', label: 'Current plan', points: result.points, tone: 'gold' },
  { id: 'comparison', label: 'With candidate', points: comparison.points, tone: 'blue' },
];

describe('CaffeineGraph', () => {
  it('renders comparison curves, threshold, bedtime, and live inspection details', () => {
    const onInspect = vi.fn();
    render(<CaffeineGraph series={series} bedtime={new Date('2026-06-14T22:00:00.000Z')} thresholdMgPerL={0.7} onInspect={onInspect} />);

    const graph = screen.getByRole('img', { name: /caffeine concentration over time/i });
    vi.spyOn(graph, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 920, height: 360, right: 920, bottom: 360, x: 0, y: 0, toJSON: () => ({}) });
    fireEvent.pointerMove(graph, { clientX: 460 });

    expect(screen.getByText(/Current plan:/)).toBeInTheDocument();
    expect(screen.getByText(/With candidate:/)).toBeInTheDocument();
    expect(screen.getAllByLabelText(/uncertainty band/i)).toHaveLength(2);
    expect(screen.getAllByText(/most from/i)).toHaveLength(2);
    expect(screen.getByText(/sleep target 0.7 mg\/L/i)).toBeInTheDocument();
    expect(screen.getByText(/bedtime/i)).toBeInTheDocument();
    expect(onInspect).toHaveBeenCalled();
  });

  it('keeps inspection math under the 100 ms interaction target for a 36h two-curve benchmark', () => {
    const model = buildChartModel(series, new Date('2026-06-14T22:00:00.000Z'), 0.7);
    const started = performance.now();
    for (let i = 0; i < 2_000; i += 1) {
      const ratio = pointerRatio(i % 920, 0, 920);
      const index = indexFromRatio(ratio, result.points.length);
      model.inspectX(index);
    }
    const duration = performance.now() - started;

    expect(duration).toBeLessThan(100);
  });
});
