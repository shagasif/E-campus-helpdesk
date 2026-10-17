import { lazy, Suspense, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useComplaints } from '../context/ComplaintsContext';
import { displayName, useAuth, useBase } from '../context/AuthContext';
import { computeStats } from '../utils/complaintStats';
import { CATEGORY_LABELS, locationText, type Complaint } from '../types/complaint';
import { StatCard } from '../components/StatCard';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';
import { CategoryIcon, Icon } from '../components/Icon';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { formatDate } from '../utils/format';

// Charts are loaded on demand, so the page shows a real loading state while they download.
const TrendChart = lazy(() => import('../components/charts').then((m) => ({ default: m.TrendChart })));
const StatusChart = lazy(() => import('../components/charts').then((m) => ({ default: m.StatusChart })));
const CategoryChart = lazy(() => import('../components/charts').then((m) => ({ default: m.CategoryChart })));
const chartFallback = <div role="status" aria-label="Loading chart"><Skeleton height={250} /></div>;

function MiniList({ items, base, empty }: { items: Complaint[]; base: string; empty: string }) {
  if (items.length === 0) return <p className="muted">{empty}</p>;
  return (
    <ul className="mini-list">
      {items.map((c) => (
        <li key={c.id}>
          <Link to={`${base}/complaints?open=${encodeURIComponent(c.id)}`} className="mini-item">
            <span className="mini-icon"><CategoryIcon category={c.category} size={18} /></span>
            <span className="mini-main">
              <strong>{c.title}</strong>
              <span className="muted small">{c.id} · {CATEGORY_LABELS[c.category]} · {locationText(c)} · {formatDate(c.createdAt)}</span>
            </span>
            <span className="mini-badges"><PriorityBadge priority={c.priority} /><StatusBadge status={c.status} /></span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function AdminDashboardPage() {
  const { session } = useAuth();
  const base = useBase();
  const { complaints, hasDemo, removeDemoData } = useComplaints();
  const [months, setMonths] = useState<6 | 12>(6);
  const stats = useMemo(() => computeStats(complaints, months), [complaints, months]);
  const cur = stats.trendData[stats.trendData.length - 1];
  const prev = stats.trendData[stats.trendData.length - 2];
  const delta = cur.reported - prev.reported;
  const recent = useMemo(() => [...complaints].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5), [complaints]);
  const urgent = useMemo(() => complaints.filter((c) => c.priority === 'high' && c.status !== 'resolved').sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5), [complaints]);

  return (
    <>
      <section className="hero card">
        <div>
          <h1>Admin Dashboard</h1>
          <p className="muted">Hello {displayName(session)}. Here is how campus issues are going, based on the complaints saved in this browser.</p>
        </div>
        <Link className="btn btn-primary btn-lg" to={`${base}/complaints`}><Icon name="list" size={20} /> Manage complaints</Link>
      </section>

      {hasDemo && (
        <div className="alert alert-info">
          <Icon name="alert" size={18} />
          <span>Sample data is included so the dashboard has something to show. Sample records are not real campus reports.</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={removeDemoData}>Remove sample data</button>
        </div>
      )}

      <section className="stats stats-5" aria-label="Complaint overview">
        <StatCard label="Total Complaints" value={stats.total} icon="file" tone="gold" />
        <StatCard label="Pending" value={stats.pending} icon="clock" tone="pending" />
        <StatCard label="In Progress" value={stats.in_progress} icon="wrench" tone="in_progress" />
        <StatCard label="Resolved" value={stats.resolved} icon="done" tone="resolved" />
        <StatCard label="Resolution Rate" value={`${stats.resolutionRate}%`} icon="gauge" tone="gold" hint={`${stats.resolved} of ${stats.total} resolved`} />
      </section>

      {stats.total === 0 ? (
        <EmptyState icon="inbox" title="No complaints yet" text="Charts and lists appear here as soon as users report issues." />
      ) : (
        <>
          <section className="charts charts-trend">
            <div className="card chart-card">
              <div className="trend-head">
                <div>
                  <h2>Monthly complaint trend</h2>
                  <p className="muted small chart-sub">Complaints reported vs resolved</p>
                </div>
                <div className="seg-toggle" role="group" aria-label="Trend period">
                  {([6, 12] as const).map((m) => (
                    <button key={m} type="button" className={months === m ? 'on' : ''} aria-pressed={months === m} onClick={() => setMonths(m)}>{m} months</button>
                  ))}
                </div>
              </div>
              <div className="trend-chips">
                <span className="chip"><i className="dot dot-maroon" />Reported <strong>{cur.reported}</strong> this month
                  <em className={delta > 0 ? 'delta up' : delta < 0 ? 'delta down' : 'delta'}>{delta > 0 ? '▲' : delta < 0 ? '▼' : '•'} {Math.abs(delta)} vs last month</em>
                </span>
                <span className="chip"><i className="dot dot-green" />Resolved <strong>{cur.resolved}</strong> this month</span>
              </div>
              <Suspense fallback={chartFallback}><TrendChart stats={stats} /></Suspense>
            </div>
            <div className="card chart-card"><h2>Status distribution</h2><p className="muted small chart-sub">All complaints</p><Suspense fallback={chartFallback}><StatusChart stats={stats} /></Suspense></div>
          </section>
          <section className="charts">
            <div className="card chart-card"><h2>Category distribution</h2><p className="muted small chart-sub">Complaints per category</p><Suspense fallback={chartFallback}><CategoryChart stats={stats} /></Suspense></div>
            <div className="card chart-card">
              <div className="section-head"><h2><Icon name="flag" size={18} className="ic-high" /> High-priority open issues</h2></div>
              <MiniList items={urgent} base={base} empty="No open high-priority issues. Nice work!" />
            </div>
          </section>
          <section className="card recent">
            <div className="section-head"><h2>Recent complaints</h2><Link className="link" to={`${base}/complaints`}>Manage all complaints →</Link></div>
            <MiniList items={recent} base={base} empty="No complaints yet." />
          </section>
        </>
      )}
    </>
  );
}
