import { useMemo } from 'react';
import { StatCard } from './StatCard';
import { monthTrend } from '../utils/trend';
import type { RequestRow, StatusGroup } from '../utils/unifiedRequests';

/** Four cards for a list of requests. Arrows compare items created this month with last month. */
export function RequestStats({ rows, openLabel = 'Open' }: { rows: RequestRow[]; openLabel?: string }) {
  const data = useMemo(() => {
    const pick = (groups: StatusGroup[]) => rows.filter((r) => groups.includes(r.group));
    const make = (list: RequestRow[]) => ({ count: list.length, trend: monthTrend(list.map((r) => r.createdAt)) });
    return {
      total: make(rows),
      open: make(pick(['open'])),
      progress: make(pick(['in_progress', 'awaiting'])),
      done: make(pick(['completed'])),
      awaiting: rows.filter((r) => r.group === 'awaiting').length,
    };
  }, [rows]);

  return (
    <>
      <section className="stats" aria-label="Statistics">
        <StatCard label="Total" value={data.total.count} icon="inbox" tone="gold" trend={data.total.trend} />
        <StatCard label={openLabel} value={data.open.count} icon="clock" tone="pending" trend={data.open.trend} upIsGood={false} />
        <StatCard label="In Progress" value={data.progress.count} icon="wrench" tone="in_progress" trend={data.progress.trend} hint={data.awaiting ? `${data.awaiting} awaiting a reply` : undefined} />
        <StatCard label="Resolved" value={data.done.count} icon="done" tone="resolved" trend={data.done.trend} upIsGood />
      </section>
      <p className="muted small stats-note">Arrows compare items created this month with last month, by their current status.</p>
    </>
  );
}
