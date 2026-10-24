import { lazy, Suspense, useMemo, useState } from 'react';
import { useComplaints } from '../context/ComplaintsContext';
import { useRequests } from '../context/RequestsContext';
import { buildRows, countGroups, GROUP_LABELS, TYPE_LABELS, type RequestType, type StatusGroup } from '../utils/unifiedRequests';
import { makeNameLookup } from '../utils/adminData';
import { downloadCsv, tableToCsv } from '../utils/csv';
import { StatCard } from '../components/StatCard';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { Skeleton } from '../components/Skeleton';

const MonthlyBarChart = lazy(() => import('../components/charts').then((m) => ({ default: m.MonthlyBarChart })));
const OverallStatusPie = lazy(() => import('../components/charts').then((m) => ({ default: m.OverallStatusPie })));
const TypeStatusChart = lazy(() => import('../components/charts').then((m) => ({ default: m.TypeStatusChart })));
const chartFallback = <div role="status" aria-label="Loading chart"><Skeleton height={220} /></div>;

const TYPES: RequestType[] = ['complaint', 'help', 'application'];
const GROUPS: StatusGroup[] = ['open', 'in_progress', 'awaiting', 'completed'];

function monthKey(iso: string) { return iso.slice(0, 7); }

/** Numbers calculated only from what is saved in this browser. Nothing is estimated. */
export function AdminReportsPage() {
  const { complaints } = useComplaints();
  const { requests } = useRequests();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const rows = useMemo(() => buildRows(complaints, requests, '/admin', makeNameLookup()), [complaints, requests]);
  const filtered = useMemo(() => rows.filter((r) => (!from || r.createdAt.slice(0, 10) >= from) && (!to || r.createdAt.slice(0, 10) <= to)), [rows, from, to]);
  const groups = countGroups(filtered);

  const byType = TYPES.map((t) => {
    const mine = filtered.filter((r) => r.type === t);
    return { type: t, total: mine.length, ...countGroups(mine) };
  });

  const months = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of filtered) m.set(monthKey(r.createdAt), (m.get(monthKey(r.createdAt)) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12);
  }, [filtered]);
  
  // Average time to resolve, for complaints that have both dates.
  const avgDays = useMemo(() => {
    const done = complaints.filter((c) => c.status === 'resolved' && c.resolvedAt && (!from || c.createdAt.slice(0, 10) >= from) && (!to || c.createdAt.slice(0, 10) <= to));
    if (done.length === 0) return null;
    const total = done.reduce((s, c) => s + Math.max(0, new Date(c.resolvedAt as string).getTime() - new Date(c.createdAt).getTime()), 0);
    return Math.round((total / done.length / 86400000) * 10) / 10;
  }, [complaints, from, to]);

  function exportCsv() {
    const csv = tableToCsv(
      ['Reference', 'Type', 'Category', 'Title', 'Status', 'Submitted by', 'Department or campus', 'Assigned to', 'Created'],
      filtered.map((r) => [r.id, TYPE_LABELS[r.type], r.categoryLabel, r.title, r.statusLabel, r.submitterName || r.submittedBy || '', r.dept ?? '', r.assignedTo ?? '', r.createdAt]),
    );
    downloadCsv(`all-requests-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  return (
    <>
      <header className="page-head page-head-row">
        <div>
          <h1>Reports and Analytics</h1>
          <p className="muted">Counts calculated from the requests saved in this browser.</p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={exportCsv} disabled={filtered.length === 0}><Icon name="download" size={16} /> Export all requests (CSV)</button>
      </header>

      <div className="toolbar">
        <div className="field"><label htmlFor="rep-from">From</label><input id="rep-from" type="date" className="input" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} /></div>
        <div className="field"><label htmlFor="rep-to">To</label><input id="rep-to" type="date" className="input" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} /></div>
        {(from || to) && <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setFrom(''); setTo(''); }}><Icon name="reset" size={16} /> Clear dates</button>}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="inbox" title="No requests in this period" text="Change the dates, or wait for users to submit requests." />
      ) : (
        <>
          <section className="stats" aria-label="Summary">
            <StatCard label="Total Requests" value={filtered.length} icon="inbox" tone="gold" />
            <StatCard label="Open" value={groups.open} icon="clock" tone="pending" />
            <StatCard label="In Progress" value={groups.in_progress + groups.awaiting} icon="wrench" tone="in_progress" />
            <StatCard label="Completed" value={groups.completed} icon="done" tone="resolved" />
          </section>

          <section className="card">
            <h2>By request type</h2>
            <div className="table-wrap">
              <table className="table-even">
                <thead><tr><th>Type</th>{GROUPS.map((g) => <th key={g}>{GROUP_LABELS[g]}</th>)}<th>Total</th></tr></thead>
                <tbody>
                  {byType.map((t) => (
                    <tr key={t.type}><td className="cell-title">{TYPE_LABELS[t.type]}</td>{GROUPS.map((g) => <td key={g}>{t[g]}</td>)}<td>{t.total}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="charts-grid report-charts">
            <section className="card">
              <h2>Requests per month</h2>
              <p className="muted small chart-sub">New requests of every type, last 12 months with requests.</p>
              <Suspense fallback={chartFallback}><MonthlyBarChart months={[...months].reverse().map(([m, n]) => ({ month: m, count: n }))} /></Suspense>
            </section>
            <section className="card">
              <h2>Status overview</h2>
              <p className="muted small chart-sub">Share of all requests in this period, by status.</p>
              <Suspense fallback={chartFallback}><OverallStatusPie data={[{ name: 'Open', value: groups.open, color: 'pending' }, { name: 'In progress', value: groups.in_progress, color: 'in_progress' }, { name: 'Awaiting reply', value: groups.awaiting, color: 'primary' }, { name: 'Completed', value: groups.completed, color: 'resolved' }]} /></Suspense>
            </section>
            <section className="card span-2">
              <h2>Status by request type</h2>
              <p className="muted small chart-sub">Open, in progress, awaiting reply and completed.</p>
              <Suspense fallback={chartFallback}><TypeStatusChart data={byType.map((t) => ({ name: TYPE_LABELS[t.type], open: t.open, in_progress: t.in_progress, awaiting: t.awaiting, completed: t.completed }))} /></Suspense>
            </section>
          </div>

          <section className="card">
            <h2>Average time to resolve a complaint</h2>
            <p>{avgDays === null ? <span className="muted">No resolved complaints in this period.</span> : <strong>{avgDays} days</strong>}</p>
            <p className="muted small">Measured from the date a complaint was reported to the date it was marked Resolved. Help requests and applications are not included because they have no single resolved date.</p>
          </section>
        </>
      )}
    </>
  );
}
