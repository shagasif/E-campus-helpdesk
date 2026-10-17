import { CATEGORIES, CATEGORY_LABELS, STATUSES, STATUS_LABELS, type Complaint } from '../types/complaint';

/** Everything on the dashboards is calculated from the real complaint records. */
export function computeStats(complaints: Complaint[], months = 6) {
  const byStatus = { pending: 0, in_progress: 0, resolved: 0 };
  const byCategory: Record<string, number> = Object.fromEntries(CATEGORIES.map((k) => [k, 0]));
  for (const c of complaints) {
    byStatus[c.status] += 1;
    byCategory[c.category] += 1;
  }

  // Last N calendar months: complaints reported and complaints resolved in each month.
  const now = new Date();
  const buckets = Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, month: d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }), reported: 0, resolved: 0 };
  });
  const index = new Map(buckets.map((b, i) => [b.key, i]));
  const keyOf = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${d.getMonth()}`;
  };
  for (const c of complaints) {
    const r = index.get(keyOf(c.createdAt));
    if (r !== undefined) buckets[r].reported += 1;
    if (c.resolvedAt) {
      const s = index.get(keyOf(c.resolvedAt));
      if (s !== undefined) buckets[s].resolved += 1;
    }
  }

  return {
    total: complaints.length,
    ...byStatus,
    resolutionRate: complaints.length ? Math.round((byStatus.resolved / complaints.length) * 100) : 0,
    categoryData: CATEGORIES.map((k) => ({ name: CATEGORY_LABELS[k], count: byCategory[k] })),
    statusData: STATUSES.map((k) => ({ key: k, name: STATUS_LABELS[k], value: byStatus[k] })),
    trendData: buckets.map(({ month, reported, resolved }) => ({ month, reported, resolved })),
  };
}
