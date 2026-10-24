import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useComplaints } from '../context/ComplaintsContext';
import { useRequests } from '../context/RequestsContext';
import { useBase } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { buildRows, GROUP_LABELS, TYPE_LABELS, type RequestType, type StatusGroup } from '../utils/unifiedRequests';
import { makeNameLookup } from '../utils/adminData';
import { APPLICATION_TYPES, HELP_CATEGORIES } from '../utils/requestConfig';
import { downloadCsv, tableToCsv } from '../utils/csv';
import { formatDate } from '../utils/format';
import { EmptyState } from '../components/EmptyState';
import { Pagination } from '../components/Pagination';
import { Icon } from '../components/Icon';
import { RequestStats } from '../components/RequestStats';

export type AdminScope = 'all' | 'help' | 'application';
type SortKey = 'newest' | 'oldest' | 'title' | 'status';
const GROUPS: StatusGroup[] = ['open', 'in_progress', 'awaiting', 'completed'];
const GROUP_ORDER: Record<StatusGroup, number> = { open: 0, awaiting: 1, in_progress: 2, completed: 3 };
const TITLES: Record<AdminScope, { h1: string; sub: string }> = {
  all: { h1: 'All Requests', sub: 'Problem reports, help requests and applications from every user.' },
  help: { h1: 'Help Requests', sub: 'Academic, registration, exams, fees, IT account and other support requests.' },
  application: { h1: 'Applications', sub: 'Formal applications waiting for review, decision or fulfilment.' },
};

/** Admin list for all requests, or only help requests, or only applications. */
export function AdminRequestsPage({ scope }: { scope: AdminScope }) {
  const base = useBase();
  const { complaints } = useComplaints();
  const { requests } = useRequests();
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [type, setType] = useState<RequestType | 'all'>('all');
  const [group, setGroup] = useState<StatusGroup | 'all'>('all');
  const [category, setCategory] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const nameOf = useMemo(() => makeNameLookup(), []);
  const scoped = useMemo(() => {
    const rows = buildRows(scope === 'all' ? complaints : [], requests.filter((r) => scope === 'all' || r.kind === scope), base, nameOf);
    return rows;
  }, [scope, complaints, requests, base, nameOf]);

  const categoryOptions: { key: string; label: string }[] = scope === 'help'
    ? HELP_CATEGORIES.map((c) => ({ key: c.key, label: c.label }))
    : scope === 'application' ? APPLICATION_TYPES.map((t) => ({ key: t.key, label: t.label })) : [];
  const categoryLabelOf = (key: string) => categoryOptions.find((o) => o.key === key)?.label;
  const rangeError = from && to && from > to ? 'The end date must be on or after the start date.' : null;

  // Category filter works on the stored key: build a map from request id to category key.
  const keyById = useMemo(() => new Map(requests.map((r) => [r.id, r.category])), [requests]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const start = from ? new Date(`${from}T00:00:00`).getTime() : null;
    const end = to ? new Date(`${to}T23:59:59.999`).getTime() : null;
    const list = scoped.filter((r) => {
      if (type !== 'all' && r.type !== type) return false;
      if (group !== 'all' && r.group !== group) return false;
      if (category !== 'all' && keyById.get(r.id) !== category) return false;
      const t = new Date(r.createdAt).getTime();
      if (start !== null && t < start) return false;
      if (end !== null && t > end) return false;
      if (!q) return true;
      return [r.id, r.title, r.categoryLabel, r.submittedBy ?? '', r.submitterName ?? '', r.dept ?? '', r.assignedTo ?? ''].some((v) => v.toLowerCase().includes(q));
    });
    return list.sort((a, b) => {
      if (sort === 'oldest') return a.createdAt.localeCompare(b.createdAt);
      if (sort === 'title') return a.title.localeCompare(b.title);
      if (sort === 'status') return GROUP_ORDER[a.group] - GROUP_ORDER[b.group] || b.createdAt.localeCompare(a.createdAt);
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [scoped, type, group, category, from, to, query, sort, keyById]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * pageSize, current * pageSize);
  const filtering = query.trim() !== '' || type !== 'all' || group !== 'all' || category !== 'all' || from !== '' || to !== '';
  const onFilter = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1); };
  function clearFilters() { setQuery(''); setType('all'); setGroup('all'); setCategory('all'); setFrom(''); setTo(''); setPage(1); }

  function exportCsv() {
    try {
      const headers = ['Request ID', 'Type', 'Title', 'Category', 'Status', 'Submitted by', 'Email', 'Department or campus', 'Assigned to', 'Submitted at'];
      const data = filtered.map((r) => [r.id, TYPE_LABELS[r.type], r.title, r.categoryLabel, r.statusLabel, r.submitterName ?? '', r.submittedBy ?? '', r.dept ?? '', r.assignedTo ?? '', r.createdAt]);
      downloadCsv(`ecampus-helpdesk-${scope === 'all' ? 'requests' : scope === 'help' ? 'help-requests' : 'applications'}-${new Date().toISOString().slice(0, 10)}.csv`, tableToCsv(headers, data));
      toast(`Exported ${filtered.length} request${filtered.length === 1 ? '' : 's'} to CSV.`);
    } catch {
      toast('The CSV file could not be created. Please try again.', 'error');
    }
  }

  const who = (r: { submitterName?: string; submittedBy?: string }) => r.submitterName || r.submittedBy || '—';
  const title = TITLES[scope];

  return (
    <>
      <header className="page-head page-head-row">
        <div>
          <h1>{title.h1}</h1>
          <p className="muted">{title.sub} {filtering ? `${filtered.length} of ${scoped.length} match your filters.` : `${scoped.length} in this browser.`}</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={exportCsv} disabled={filtered.length === 0}><Icon name="download" size={18} /> Export CSV</button>
      </header>

      <RequestStats rows={scoped} />

      <div className="card filters">
        <div className="search filters-search">
          <Icon name="search" size={18} />
          <input type="search" className="input" value={query} onChange={(e) => onFilter(setQuery)(e.target.value)} placeholder="Search by ID, title, person, department or team" aria-label="Search requests" />
        </div>
        {scope === 'all' && (
          <select className="input" aria-label="Filter by request type" value={type} onChange={(e) => onFilter(setType)(e.target.value as RequestType | 'all')}>
            <option value="all">All request types</option>
            {(['complaint', 'help', 'application'] as RequestType[]).map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
          </select>
        )}
        {categoryOptions.length > 0 && (
          <select className="input" aria-label="Filter by category" value={category} onChange={(e) => onFilter(setCategory)(e.target.value)}>
            <option value="all">{scope === 'help' ? 'All categories' : 'All application types'}</option>
            {categoryOptions.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        )}
        <select className="input" aria-label="Filter by status" value={group} onChange={(e) => onFilter(setGroup)(e.target.value as StatusGroup | 'all')}>
          <option value="all">All statuses</option>
          {GROUPS.map((g) => <option key={g} value={g}>{GROUP_LABELS[g]}</option>)}
        </select>
        <label className="date-field"><span>From</span><input type="date" className="input" value={from} max={to || undefined} onChange={(e) => onFilter(setFrom)(e.target.value)} /></label>
        <label className="date-field"><span>To</span><input type="date" className="input" value={to} min={from || undefined} onChange={(e) => onFilter(setTo)(e.target.value)} /></label>
        <select className="input" aria-label="Sort requests" value={sort} onChange={(e) => onFilter(setSort)(e.target.value as SortKey)}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="status">Status (open first)</option>
          <option value="title">Title A–Z</option>
        </select>
        {filtering && <button type="button" className="btn btn-ghost" onClick={clearFilters}><Icon name="reset" size={16} /> Clear filters</button>}
      </div>
      {rangeError && <p className="field-error" role="alert">{rangeError}</p>}

      {scoped.length === 0 ? (
        <EmptyState icon="inbox" title="Nothing here yet" text={scope === 'all' ? 'Requests will appear here when users send them.' : scope === 'help' ? 'Help requests will appear here when users send them.' : 'Applications will appear here when users send them.'} />
      ) : filtered.length === 0 ? (
        <EmptyState icon="search" title="No requests match" text="Try different filters or search words." action={<button type="button" className="btn btn-secondary" onClick={clearFilters}>Clear filters</button>} />
      ) : (
        <>
          <div className="only-desktop">
            <div className="table-wrap card">
              <table>
                <thead>
                  <tr><th>Request ID</th><th>Title</th><th>Type</th><th>Category</th><th>Submitted by</th><th>Department / campus</th><th>Date</th><th>Status</th><th><span className="visually-hidden">Actions</span></th></tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="mono">{r.id}{r.isDemo && <span className="demo-tag">Sample</span>}</td>
                      <td className="cell-title">{r.title}</td>
                      <td>{TYPE_LABELS[r.type]}</td>
                      <td>{categoryLabelOf(keyById.get(r.id) ?? '') ?? r.categoryLabel}</td>
                      <td>{who(r)}</td>
                      <td>{r.dept ?? <span className="muted">—</span>}</td>
                      <td>{formatDate(r.createdAt)}</td>
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
                <div className="cmp-bottom"><span className="muted small">{who(r)}</span><span className="muted small">{formatDate(r.createdAt)}</span></div>
              </Link>
            ))}
          </div>
          <div className="pager-row">
            <label className="rows-select muted small">Rows per page
              <select className="input" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <Pagination page={current} pageSize={pageSize} total={filtered.length} onPage={setPage} />
          </div>
        </>
      )}
    </>
  );
}
