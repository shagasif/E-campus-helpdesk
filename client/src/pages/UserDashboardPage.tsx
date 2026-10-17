import { Link } from 'react-router-dom';
import { useVisibleComplaints } from '../context/ComplaintsContext';
import { displayName, useAuth, useBase } from '../context/AuthContext';
import { computeStats } from '../utils/complaintStats';
import { StatCard } from '../components/StatCard';
import { UserComplaintsList } from '../components/UserComplaintsList';
import { Icon } from '../components/Icon';

export function UserDashboardPage() {
  const { session } = useAuth();
  const base = useBase();
  const stats = computeStats(useVisibleComplaints());
  return (
    <>
      <section className="hero card">
        <div>
          <h1>Welcome back, {displayName(session)}</h1>
          <p className="muted">Report a campus issue or follow the progress of the ones you have already sent.</p>
        </div>
        <Link className="btn btn-primary btn-lg" to={`${base}/report`}><Icon name="plus" size={20} /> Report an Issue</Link>
      </section>

      <section className="stats" aria-label="Your complaint totals">
        <StatCard label="Total Complaints" value={stats.total} icon="file" tone="gold" />
        <StatCard label="Pending" value={stats.pending} icon="clock" tone="pending" />
        <StatCard label="In Progress" value={stats.in_progress} icon="wrench" tone="in_progress" />
        <StatCard label="Resolved" value={stats.resolved} icon="done" tone="resolved" />
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Recent complaints</h2>
        </div>
        <UserComplaintsList limit={8} />
      </section>
    </>
  );
}
