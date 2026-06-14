import { useMemo, useState, type PointerEvent } from 'react';
import type { ConcentrationPoint } from '../domain';

export interface GraphSeries {
  id: string;
  label: string;
  points: ConcentrationPoint[];
  tone: 'gold' | 'blue';
}

export interface GraphInspection {
  index: number;
  elapsedMinutes: number;
}

export interface CaffeineGraphProps {
  series: GraphSeries[];
  bedtime: Date;
  thresholdMgPerL: number;
  onInspect?: (inspection: GraphInspection) => void;
}

const width = 920;
const height = 360;
const padding = { top: 24, right: 34, bottom: 42, left: 58 };
const plotWidth = width - padding.left - padding.right;
const plotHeight = height - padding.top - padding.bottom;

export function CaffeineGraph({ series, bedtime, thresholdMgPerL, onInspect }: CaffeineGraphProps) {
  const chart = useMemo(() => buildChartModel(series, bedtime, thresholdMgPerL), [series, bedtime, thresholdMgPerL]);
  const [inspection, setInspection] = useState<GraphInspection>(() => ({ index: 0, elapsedMinutes: chart.elapsedDomain[0] }));
  const inspected = useMemo(() => inspectSeriesAt(series, inspection.index), [series, inspection.index]);

  function handlePointer(event: PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = pointerRatio(event.clientX, rect.left, rect.width);
    const index = indexFromRatio(ratio, chart.maxPointCount);
    const elapsedMinutes = chart.elapsedDomain[0] + ratio * (chart.elapsedDomain[1] - chart.elapsedDomain[0]);
    const next = { index, elapsedMinutes };
    setInspection(next);
    onInspect?.(next);
  }

  return (
    <section className="graph-card" aria-label="Caffeine concentration graph">
      <div className="graph-header">
        <div>
          <p className="eyebrow">Interactive forecast</p>
          <h2>Time–concentration curve</h2>
        </div>
        <div className="legend" aria-label="Graph legend">
          {series.map((item) => <span key={item.id} className={`legend-dot ${item.tone}`}>{item.label}</span>)}
        </div>
      </div>

      <svg
        className="caffeine-graph"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Caffeine concentration over time with threshold and bedtime markers"
        onPointerMove={handlePointer}
        onPointerDown={handlePointer}
      >
        <defs>
          <linearGradient id="goldStroke" x1="0" x2="1">
            <stop offset="0%" stopColor="#f7d99e" />
            <stop offset="100%" stopColor="#c47a33" />
          </linearGradient>
          <linearGradient id="blueStroke" x1="0" x2="1">
            <stop offset="0%" stopColor="#bad5ff" />
            <stop offset="100%" stopColor="#6e8ce8" />
          </linearGradient>
        </defs>

        {chart.yTicks.map((tick) => (
          <g key={tick.value}>
            <line x1={padding.left} x2={width - padding.right} y1={tick.y} y2={tick.y} className="grid-line" />
            <text x={padding.left - 12} y={tick.y + 4} textAnchor="end" className="axis-label">{tick.value.toFixed(1)}</text>
          </g>
        ))}

        {chart.xTicks.map((tick) => (
          <g key={tick.value}>
            <line x1={tick.x} x2={tick.x} y1={padding.top} y2={height - padding.bottom} className="grid-line subtle" />
            <text x={tick.x} y={height - 14} textAnchor="middle" className="axis-label">+{Math.round(tick.value / 60)}h</text>
          </g>
        ))}

        <line x1={padding.left} x2={width - padding.right} y1={chart.thresholdY} y2={chart.thresholdY} className="threshold-line" />
        <text x={width - padding.right} y={chart.thresholdY - 8} textAnchor="end" className="marker-label">sleep target {thresholdMgPerL.toFixed(1)} mg/L</text>

        <line x1={chart.bedtimeX} x2={chart.bedtimeX} y1={padding.top} y2={height - padding.bottom} className="bedtime-line" />
        <text x={chart.bedtimeX - 8} y={padding.top + 16} textAnchor="end" className="marker-label">bedtime</text>

        {chart.paths.map((path) => (
          <path key={`${path.id}-band`} d={path.bandD} className={`uncertainty-band ${path.tone}`} aria-label={`${path.label} uncertainty band`} />
        ))}

        {chart.paths.map((path) => (
          <path key={path.id} d={path.d} className={`series-line ${path.tone}`} fill="none" />
        ))}

        <line x1={chart.inspectX(inspection.index)} x2={chart.inspectX(inspection.index)} y1={padding.top} y2={height - padding.bottom} className="inspect-line" />
        {inspected.map((item) => (
          <circle key={item.id} cx={chart.inspectX(inspection.index)} cy={chart.yScale(item.concentrationMgPerL)} r="5" className={`inspect-dot ${item.tone}`} />
        ))}
      </svg>

      <div className="inspection-sheet" aria-live="polite">
        <strong>{formatTimestamp(inspected[0]?.timestamp)}</strong>
        {inspected.map((item) => (
          <span key={item.id}>
            {item.label}: {item.concentrationMgPerL.toFixed(2)} mg/L ({item.lowMgPerL.toFixed(2)}–{item.highMgPerL.toFixed(2)})
            {item.topContributor ? ` · most from ${item.topContributor.label}` : ''}
          </span>
        ))}
      </div>
    </section>
  );
}

export function buildChartModel(series: GraphSeries[], bedtime: Date, thresholdMgPerL: number) {
  const allPoints = series.flatMap((item) => item.points);
  const elapsedMin = Math.min(...allPoints.map((point) => point.elapsedMinutes), 0);
  const elapsedMax = Math.max(...allPoints.map((point) => point.elapsedMinutes), 1);
  const concentrationMax = Math.max(thresholdMgPerL, ...allPoints.map((point) => point.bounds.highMgPerL), 0.5) * 1.15;
  const startTimestamp = allPoints[0]?.timestamp.getTime() ?? bedtime.getTime();
  const bedtimeElapsed = (bedtime.getTime() - startTimestamp) / 60_000;

  const xScale = (elapsedMinutes: number) => padding.left + ((elapsedMinutes - elapsedMin) / (elapsedMax - elapsedMin || 1)) * plotWidth;
  const yScale = (mgPerL: number) => padding.top + plotHeight - (mgPerL / concentrationMax) * plotHeight;
  const inspectX = (index: number) => {
    const point = series[0]?.points[index] ?? series[0]?.points.at(-1);
    return xScale(point?.elapsedMinutes ?? 0);
  };

  return {
    elapsedDomain: [elapsedMin, elapsedMax] as const,
    maxPointCount: Math.max(...series.map((item) => item.points.length), 1),
    yScale,
    inspectX,
    thresholdY: yScale(thresholdMgPerL),
    bedtimeX: xScale(bedtimeElapsed),
    yTicks: [0, concentrationMax / 3, (concentrationMax * 2) / 3, concentrationMax].map((value) => ({ value, y: yScale(value) })),
    xTicks: [elapsedMin, elapsedMin + (elapsedMax - elapsedMin) / 3, elapsedMin + ((elapsedMax - elapsedMin) * 2) / 3, elapsedMax].map((value) => ({ value, x: xScale(value) })),
    paths: series.map((item) => ({
      id: item.id,
      tone: item.tone,
      d: pathForPoints(item.points, xScale, yScale),
      bandD: bandPathForPoints(item.points, xScale, yScale),
      label: item.label,
    })),
  };
}

export function indexFromRatio(ratio: number, pointCount: number) {
  return Math.max(0, Math.min(pointCount - 1, Math.round(ratio * Math.max(pointCount - 1, 0))));
}

export function pointerRatio(clientX: number, left: number, rectWidth: number) {
  if (rectWidth <= 0) return 0;
  return Math.max(0, Math.min(1, (clientX - left) / rectWidth));
}

function pathForPoints(
  points: ConcentrationPoint[],
  xScale: (elapsedMinutes: number) => number,
  yScale: (mgPerL: number) => number,
) {
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${xScale(point.elapsedMinutes).toFixed(2)} ${yScale(point.concentrationMgPerL).toFixed(2)}`)
    .join(' ');
}

function bandPathForPoints(
  points: ConcentrationPoint[],
  xScale: (elapsedMinutes: number) => number,
  yScale: (mgPerL: number) => number,
) {
  const upper = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${xScale(point.elapsedMinutes).toFixed(2)} ${yScale(point.bounds.highMgPerL).toFixed(2)}`)
    .join(' ');
  const lower = [...points]
    .reverse()
    .map((point) => `L ${xScale(point.elapsedMinutes).toFixed(2)} ${yScale(point.bounds.lowMgPerL).toFixed(2)}`)
    .join(' ');
  return `${upper} ${lower} Z`;
}

function inspectSeriesAt(series: GraphSeries[], index: number) {
  return series.map((item) => {
    const point = item.points[Math.min(index, item.points.length - 1)] ?? item.points.at(-1);
    const topContributor = point?.contributors.reduce<typeof point.contributors[number] | null>(
      (best, contributor) => !best || contributor.centralMg > best.centralMg ? contributor : best,
      null,
    );
    return {
      id: item.id,
      label: item.label,
      tone: item.tone,
      timestamp: point?.timestamp,
      concentrationMgPerL: point?.concentrationMgPerL ?? 0,
      lowMgPerL: point?.bounds.lowMgPerL ?? 0,
      highMgPerL: point?.bounds.highMgPerL ?? 0,
      topContributor,
    };
  });
}

function formatTimestamp(timestamp?: Date) {
  if (!timestamp) return 'No data';
  return timestamp.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
