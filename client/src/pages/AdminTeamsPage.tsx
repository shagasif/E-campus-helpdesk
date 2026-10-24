import { useMemo } from 'react';
import { useComplaints } from '../context/ComplaintsContext';
import { useRequests } from '../context/RequestsContext';
import { STAFF_TEAMS } from '../types/complaint';
import { REQUEST_TEAMS } from '../utils/requestConfig';
import { buildRows, countGroups } from '../utils/unifiedRequests';
import { EmptyState } from '../components/EmptyState';

const TEAMS = [...REQUEST_TEAMS, ...STAFF_TEAMS.filter((t) => !REQUEST_TEAMS.includes(t))];

/** Workload per team or office, counted from what has been assigned. No staff accounts exist in this prototype. */
export function AdminTeamsPage() {
  const { complaints } = useComplaints();
  const { requests } = useRequests();
  const data = useMemo(() => {
    const rows = buildRows(complaints, requests, '/admin');
    const list = TEAMS.map((team) => {
      const mine = rows.filter((r) => r.assignedTo === team);
      const c = countGroups(mine);
      return { team, total: mine.length, active: c.open + c.in_progress + c.awaiting, completed: c.completed };
    });
    const known = new Set(TEAMS);
    const other = rows.filter((r) => r.assignedTo && !known.has(r.assignedTo));
    return { list, otherCount: other.length };
  }, [complaints, requests]);

  const anything = data.list.some((t) => t.total > 0);

  return (
    <>
      <header className="page-head">
        <h1>Departments and Teams</h1>
        <p className="muted">How many requests are assigned to each team or office. Assign requests from their details page.</p>
      </header>
      {!anything && <EmptyState icon="users" title="Nothing assigned yet" text="When you assign complaints, help requests or applications to a team, the workload shows here." />}
      <div className="only-desktop">
        <div className="table-wrap card">
          <table className="table-even">
            <thead><tr><th>Team or office</th><th>Active</th><th>Completed</th><th>Total assigned</th></tr></thead>
            <tbody>
              {data.list.map((t) => (
                <tr key={t.team}><td className="cell-title">{t.team}</td><td>{t.active}</td><td>{t.completed}</td><td>{t.total}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="only-mobile cards">
        {data.list.map((t) => (
          <div key={t.team} className="card complaint-card">
            <div className="cmp-title">{t.team}</div>
            <div className="cmp-bottom"><span className="muted small">Active {t.active} · Completed {t.completed}</span><span className="muted small">Total {t.total}</span></div>
          </div>
        ))}
      </div>
      {data.otherCount > 0 && <p className="muted small">{data.otherCount} request{data.otherCount === 1 ? ' is' : 's are'} assigned to a team name that is not in the current list.</p>}
      <p className="muted small">These teams and offices are placeholders in the code (complaint teams in <code>types/complaint.ts</code>, help and application offices in <code>utils/requestConfig.ts</code>). Real staff accounts, membership and permissions need a backend.</p>
    </>
  );
}
