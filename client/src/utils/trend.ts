export interface Trend { pct: number | null; dir: 'up' | 'down' | 'flat'; cur: number; prev: number }

/** Items created this calendar month compared with last calendar month. */
export function monthTrend(dates: string[], now: Date = new Date()): Trend {
  const cm = now.getFullYear() * 12 + now.getMonth();
  let cur = 0, prev = 0;
  for (const iso of dates) {
    const d = new Date(iso);
    const m = d.getFullYear() * 12 + d.getMonth();
    if (m === cm) cur += 1; else if (m === cm - 1) prev += 1;
  }
  if (cur === prev) return { pct: cur === 0 ? null : 0, dir: 'flat', cur, prev };
  if (prev === 0) return { pct: null, dir: 'up', cur, prev }; // nothing last month, so no percentage
  return { pct: Math.round((Math.abs(cur - prev) / prev) * 100), dir: cur > prev ? 'up' : 'down', cur, prev };
}
