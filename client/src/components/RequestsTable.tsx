import { Link } from 'react-router-dom';
import type { RequestRow } from '../utils/unifiedRequests';
import { TYPE_LABELS } from '../utils/unifiedRequests';
import { formatDate } from '../utils/format';

/** Table (desktop) and cards (phone) for a list of requests. Each row has a "View Details" link. */
export function RequestsTable({ rows, showAssigned = false }: { rows: RequestRow[]; showAssigned?: boolean }) {
  return (
    <>
      <div className="only-desktop">
        <div className="table-wrap card">
          <table>
            <thead>
              <tr>
                <th>Request ID</th><th>Title</th><th>Type</th><th>Category</th><th>Submitted</th>
                {showAssigned && <th>Assigned team</th>}
                <th>Status</th><th><span className="visually-hidden">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{r.id}{r.isDemo && <span className="demo-tag">Sample</span>}</td>
                  <td className="cell-title">{r.title}</td>
                  <td>{TYPE_LABELS[r.type]}</td>
                  <td>{r.categoryLabel}</td>
                  <td>{formatDate(r.createdAt)}</td>
                  {showAssigned && <td>{r.assignedTo ?? <span className="muted">Not assigned yet</span>}</td>}
                  <td><span className={`badge badge-${r.statusClass}`}>{r.statusLabel}</span></td>
                  <td><Link className="link" to={r.to} aria-label={`View details of ${r.title}`}>View Details</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="only-mobile cards">
        {rows.map((r) => (
          <Link key={r.id} to={r.to} className="card complaint-card">
            <div className="cmp-top"><span className="mono">{r.id}</span><span className={`badge badge-${r.statusClass}`}>{r.statusLabel}</span></div>
            <div className="cmp-title">{r.title}</div>
            <div className="muted small">{TYPE_LABELS[r.type]} · {r.categoryLabel}</div>
            <div className="cmp-bottom"><span className="muted small">{formatDate(r.createdAt)}</span>{showAssigned && r.assignedTo && <span className="muted small">{r.assignedTo}</span>}</div>
          </Link>
        ))}
      </div>
    </>
  );
}
