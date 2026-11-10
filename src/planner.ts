export interface DrinkPreset {
  id: string;
  label: string;
  caffeineMg: number;
}

/** Planning defaults, not measured medical doses. */
export const DRINK_PRESETS: DrinkPreset[] = [
  { id: 'americano-tall', label: '아메리카노 톨', caffeineMg: 150 },
  { id: 'americano-grande', label: '아메리카노 그란데', caffeineMg: 225 },
  { id: 'espresso', label: '에스프레소 1샷', caffeineMg: 75 },
  { id: 'cold-brew', label: '콜드브루', caffeineMg: 155 },
  { id: 'latte', label: '카페라테', caffeineMg: 75 },
  { id: 'energy', label: '에너지드링크', caffeineMg: 80 },
  { id: 'green-tea', label: '녹차', caffeineMg: 30 },
];

export type BedtimeVerdict = '여유 있음' | '주의';

export function bedtimeVerdict(concentrationMgPerL: number, referenceMgPerL: number): BedtimeVerdict {
  return concentrationMgPerL <= referenceMgPerL ? '여유 있음' : '주의';
}

export interface ConcentrationSample {
  timestamp: Date;
  concentrationMgPerL: number;
}

/**
 * First time the curve is back under the reference after its last excursion above it.
 * A sip at t=0 is still near zero, so this waits for the later fall instead of reporting "already below".
 */
export function firstDropBelow(
  points: ConcentrationSample[],
  now: Date,
  referenceMgPerL: number,
): 'below' | 'above-through-window' | Date {
  const upcoming = points.filter((point) => point.timestamp.getTime() >= now.getTime());
  let lastAboveIndex = -1;
  upcoming.forEach((point, index) => {
    if (point.concentrationMgPerL > referenceMgPerL) lastAboveIndex = index;
  });
  if (lastAboveIndex === -1) return 'below';
  const after = upcoming.slice(lastAboveIndex + 1).find((point) => point.concentrationMgPerL <= referenceMgPerL);
  return after ? after.timestamp : 'above-through-window';
}

export function formatKoreanWhen(target: Date, now: Date): string {
  const time = target.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const startOf = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayDiff = Math.round((startOf(target) - startOf(now)) / 86_400_000);
  if (dayDiff === 0) return `오늘 ${time}`;
  if (dayDiff === 1) return `내일 ${time}`;
  if (dayDiff === -1) return `어제 ${time}`;
  return `${target.getMonth() + 1}/${target.getDate()} ${time}`;
}

export function formatConcentration(mgPerL: number): string {
  return `약 ${mgPerL.toFixed(1)} mg/L`;
}
