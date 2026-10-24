import { Link } from 'react-router-dom';
import { useVisibleComplaints } from '../context/ComplaintsContext';
import { useVisibleRequests } from '../context/RequestsContext';
import { displayName, useAuth, useBase } from '../context/AuthContext';
import { buildRows, countGroups } from '../utils/unifiedRequests';
import { StatCard } from '../components/StatCard';
import { RequestsTable } from '../components/RequestsTable';
import { EmptyState } from '../components/EmptyState';

const RECENT = 6;

export function UserDashboardPage() {
  const { session } = useAuth();
  const base = useBase();
  const complaints = useVisibleComplaints();
  const requests = useVisibleRequests();
  const rows = buildRows(complaints, requests, base); // newest first
  const counts = countGroups(rows);
  return (
    <>
      <section className="hero card">
        <div>
          <h1>Welcome back, {displayName(session)}</h1>
          <p className="muted">How can we help you today? Use the menu to report a problem, ask for help or send an application. Your requests are tracked below.</p>
        </div>
      </section>

      <section className="stats" aria-label="Your request totals">
        <StatCard label="Open Requests" value={counts.open} icon="inbox" tone="pending" />
        <StatCard label="In Progress" value={counts.in_progress} icon="wrench" tone="in_progress" />
        <StatCard label="Awaiting Response" value={counts.awaiting} icon="clock" tone="gold" />
        <StatCard label="Completed" value={counts.completed} icon="done" tone="resolved" />
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Recent Requests</h2>
          {rows.length > 0 && <Link className="link" to={`${base}/requests`}>View All →</Link>}
        </div>
        {rows.length === 0 ? (
          <EmptyState icon="inbox" title="No requests yet" text="When you report a problem, ask for help or send an application, it will show up here." />
        ) : (
          <RequestsTable rows={rows.slice(0, RECENT)} />
        )}
      </section>
    </>
  );
}
