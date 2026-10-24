import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useComplaints } from '../context/ComplaintsContext';
import { useRequests } from '../context/RequestsContext';
import { buildRows, TYPE_LABELS } from '../utils/unifiedRequests';
import { makeNameLookup } from '../utils/adminData';
import { displayName, useAuth, useBase } from '../context/AuthContext';
import { CATEGORY_LABELS, locationText, type Complaint } from '../types/complaint';
import { RequestStats } from '../components/RequestStats';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';
import { CategoryIcon, Icon } from '../components/Icon';
import { formatDate } from '../utils/format';

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
  const { requests } = useRequests();
  const rows = useMemo(() => buildRows(complaints, requests, base, makeNameLookup()), [complaints, requests, base]);
  const latest = rows.slice(0, 6);
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

      <RequestStats rows={rows} />

      <section className="card recent">
        <div className="section-head"><h2>Latest requests</h2><Link className="link" to={`${base}/requests`}>See all requests →</Link></div>
        {latest.length === 0 ? <p className="muted">No requests yet.</p> : (
          <ul className="mini-list">
            {latest.map((r) => (
              <li key={`${r.type}-${r.id}`}>
                <Link to={r.to} className="mini-item">
                  <span className="mini-main">
                    <strong>{r.title}</strong>
                    <span className="muted small">{r.id} · {TYPE_LABELS[r.type]} · {r.submitterName || r.submittedBy || 'Unknown'}{r.dept ? ` · ${r.dept}` : ''} · {formatDate(r.createdAt)}</span>
                  </span>
                  <span className="mini-badges"><span className={`badge badge-${r.statusClass}`}>{r.statusLabel}</span></span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {urgent.length > 0 && (
        <section className="card recent">
          <div className="section-head"><h2><Icon name="flag" size={18} className="ic-high" /> High-priority open issues</h2><Link className="link" to={`${base}/complaints`}>Complaints &amp; Issues →</Link></div>
          <MiniList items={urgent} base={base} empty="No open high-priority issues." />
        </section>
      )}
    </>
  );
}
