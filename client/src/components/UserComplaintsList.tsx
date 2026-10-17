import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useVisibleComplaints } from '../context/ComplaintsContext';
import { useBase } from '../context/AuthContext';
import { CATEGORY_LABELS, STATUSES, STATUS_LABELS, locationText, type Status } from '../types/complaint';
import { StatusBadge, PriorityBadge } from './StatusBadge';
import { CategoryIcon, Icon } from './Icon';
import { EmptyState } from './EmptyState';
import { Pagination } from './Pagination';
import { formatDate } from '../utils/format';

const PAGE_SIZE = 10;

/** The signed-in user's own complaints, with search and status filter. `limit` = dashboard "recent" mode. */
export function UserComplaintsList({ limit }: { limit?: number }) {
  const all = useVisibleComplaints();
  const base = useBase();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<Status | 'all'>('all');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all
      .filter((c) => (status === 'all' || c.status === status) && (!q || [c.id, c.title, c.description, c.building, c.room].some((v) => v.toLowerCase().includes(q))))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [all, query, status]);

  const rows = limit ? filtered.slice(0, limit) : filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const filtering = query.trim() !== '' || status !== 'all';
  const clear = () => { setQuery(''); setStatus('all'); setPage(1); };

  if (all.length === 0) {
    return <EmptyState icon="inbox" title="No complaints yet" text="When you report an issue, it will show up here so you can follow its progress." action={<Link className="btn btn-primary" to={`${base}/report`}><Icon name="plus" size={18} /> Report your first issue</Link>} />;
  }

  return (
    <>
      <div className="toolbar">
        <div className="search">
          <Icon name="search" size={18} />
          <input type="search" className="input" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Search by ID, title or location" aria-label="Search complaints" />
        </div>
        <select className="input toolbar-select" value={status} onChange={(e) => { setStatus(e.target.value as Status | 'all'); setPage(1); }} aria-label="Filter by status">
          <option value="all">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        {filtering && <button type="button" className="btn btn-ghost" onClick={clear}><Icon name="reset" size={16} /> Clear</button>}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="search" title="No complaints match" text="Try a different search or status filter." action={<button type="button" className="btn btn-secondary" onClick={clear}>Show all complaints</button>} />
      ) : (
        <>
          <div className="only-desktop">
            <div className="table-wrap card">
              <table>
                <thead><tr><th>Complaint ID</th><th>Title</th><th>Category</th><th>Location</th><th>Submitted</th><th>Priority</th><th>Status</th></tr></thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.id}>
                      <td className="mono"><Link className="link" to={`${base}/complaints/${c.id}`}>{c.id}</Link>{c.isDemo && <span className="demo-tag">Sample</span>}</td>
                      <td className="cell-title">{c.title}</td>
                      <td><span className="cat"><CategoryIcon category={c.category} size={16} />{CATEGORY_LABELS[c.category]}</span></td>
                      <td>{locationText(c)}</td>
                      <td>{formatDate(c.createdAt)}</td>
                      <td><PriorityBadge priority={c.priority} /></td>
                      <td><StatusBadge status={c.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="only-mobile cards">
            {rows.map((c) => (
              <Link key={c.id} to={`${base}/complaints/${c.id}`} className="card complaint-card">
                <div className="cmp-top"><span className="mono">{c.id}</span><StatusBadge status={c.status} /></div>
                <div className="cmp-title">{c.title}</div>
                <div className="muted small"><span className="cat"><CategoryIcon category={c.category} size={14} />{CATEGORY_LABELS[c.category]}</span> · {locationText(c)}</div>
                <div className="cmp-bottom"><span className="muted small">{formatDate(c.createdAt)}</span><PriorityBadge priority={c.priority} /></div>
              </Link>
            ))}
          </div>
          {limit ? (
            filtered.length > limit && <p className="view-all"><Link className="link" to={`${base}/complaints`}>View all {filtered.length} complaints →</Link></p>
          ) : (
            <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPage={setPage} />
          )}
        </>
      )}
    </>
  );
}
