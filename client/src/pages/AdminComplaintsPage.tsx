import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useComplaints } from '../context/ComplaintsContext';
import { useToast } from '../context/ToastContext';
import {
  CATEGORIES, CATEGORY_LABELS, PRIORITIES, PRIORITY_LABELS, STATUSES, STATUS_LABELS, locationText,
  type Category, type Complaint, type Priority, type Status,
} from '../types/complaint';
import { StatusBadge, PriorityBadge } from '../components/StatusBadge';
import { CategoryIcon, Icon } from '../components/Icon';
import { EmptyState } from '../components/EmptyState';
import { Pagination } from '../components/Pagination';
import { ComplaintDrawer } from '../components/ComplaintDrawer';
import { complaintsToCsv, downloadCsv } from '../utils/csv';
import { formatDate } from '../utils/format';

type SortKey = 'id' | 'title' | 'category' | 'priority' | 'status' | 'createdAt';
type Sort = { key: SortKey; dir: 'asc' | 'desc' };

const PRIORITY_ORDER: Record<Priority, number> = { low: 0, medium: 1, high: 2 };
const STATUS_ORDER: Record<Status, number> = { pending: 0, in_progress: 1, resolved: 2 };

function compare(a: Complaint, b: Complaint, key: SortKey): number {
  switch (key) {
    case 'priority': return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    case 'status': return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    case 'createdAt': return a.createdAt.localeCompare(b.createdAt);
    case 'category': return CATEGORY_LABELS[a.category].localeCompare(CATEGORY_LABELS[b.category]);
    case 'title': return a.title.localeCompare(b.title);
    default: return a.id.localeCompare(b.id);
  }
}

const MOBILE_SORTS: { label: string; sort: Sort }[] = [
  { label: 'Newest first', sort: { key: 'createdAt', dir: 'desc' } },
  { label: 'Oldest first', sort: { key: 'createdAt', dir: 'asc' } },
  { label: 'Priority: high to low', sort: { key: 'priority', dir: 'desc' } },
  { label: 'Status', sort: { key: 'status', dir: 'asc' } },
  { label: 'Title A–Z', sort: { key: 'title', dir: 'asc' } },
];

export function AdminComplaintsPage() {
  const { complaints } = useComplaints();
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<Status | 'all'>('all');
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [priority, setPriority] = useState<Priority | 'all'>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState<Sort>({ key: 'createdAt', dir: 'desc' });
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const rangeError = from && to && from > to ? 'The end date must be on or after the start date.' : null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const start = from ? new Date(`${from}T00:00:00`).getTime() : null;
    const end = to ? new Date(`${to}T23:59:59.999`).getTime() : null;
    const list = complaints.filter((c) => {
      if (status !== 'all' && c.status !== status) return false;
      if (category !== 'all' && c.category !== category) return false;
      if (priority !== 'all' && c.priority !== priority) return false;
      const t = new Date(c.createdAt).getTime();
      if (start !== null && t < start) return false;
      if (end !== null && t > end) return false;
      if (!q) return true;
      return [c.id, c.title, c.description, c.building, c.room, c.assignedTo ?? '', c.submittedBy ?? ''].some((v) => v.toLowerCase().includes(q));
    });
    const dir = sort.dir === 'asc' ? 1 : -1;
    return list.sort((a, b) => compare(a, b, sort.key) * dir || b.createdAt.localeCompare(a.createdAt));
  }, [complaints, query, status, category, priority, from, to, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * pageSize, current * pageSize);
  const filtering = query.trim() !== '' || status !== 'all' || category !== 'all' || priority !== 'all' || from !== '' || to !== '';

  const openId = params.get('open');
  const open = openId ? complaints.find((c) => c.id === openId) : undefined;
  const openDrawer = (id: string) => setParams({ open: id });
  const closeDrawer = () => setParams({}, { replace: true });

  function clearFilters() { setQuery(''); setStatus('all'); setCategory('all'); setPriority('all'); setFrom(''); setTo(''); setPage(1); }
  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'createdAt' || key === 'priority' ? 'desc' : 'asc' }));
    setPage(1);
  }
  function exportCsv() {
    try {
      downloadCsv(`ecampus-helpdesk-complaints-${new Date().toISOString().slice(0, 10)}.csv`, complaintsToCsv(filtered));
      toast(`Exported ${filtered.length} complaint${filtered.length === 1 ? '' : 's'} to CSV.`);
    } catch {
      toast('The CSV file could not be created. Please try again.', 'error');
    }
  }
  const onFilter = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1); };

  const sortTh = (label: string, key: SortKey) => {
    const active = sort.key === key;
    return (
      <th aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
        <button type="button" className="th-btn" onClick={() => toggleSort(key)}>
          {label}<Icon name={active ? (sort.dir === 'asc' ? 'asc' : 'desc') : 'sort'} size={14} />
        </button>
      </th>
    );
  };
  const mobileSortValue = MOBILE_SORTS.findIndex((m) => m.sort.key === sort.key && m.sort.dir === sort.dir);

  return (
    <>
      <header className="page-head page-head-row">
        <div>
          <h1>Complaints</h1>
          <p className="muted">{filtering ? `${filtered.length} of ${complaints.length}` : complaints.length} complaint{complaints.length === 1 ? '' : 's'}{filtering ? ' match your filters' : ' in this browser'}.</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={exportCsv} disabled={filtered.length === 0}><Icon name="download" size={18} /> Export CSV</button>
      </header>

      <div className="card filters">
        <div className="search filters-search">
          <Icon name="search" size={18} />
          <input type="search" className="input" value={query} onChange={(e) => onFilter(setQuery)(e.target.value)} placeholder="Search by ID, title, location, team or reporter" aria-label="Search complaints" />
        </div>
        <select className="input" aria-label="Filter by status" value={status} onChange={(e) => onFilter(setStatus)(e.target.value as Status | 'all')}>
          <option value="all">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <select className="input" aria-label="Filter by category" value={category} onChange={(e) => onFilter(setCategory)(e.target.value as Category | 'all')}>
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
        </select>
        <select className="input" aria-label="Filter by priority" value={priority} onChange={(e) => onFilter(setPriority)(e.target.value as Priority | 'all')}>
          <option value="all">All priorities</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
        </select>
        <label className="date-field"><span>From</span><input type="date" className="input" value={from} max={to || undefined} onChange={(e) => onFilter(setFrom)(e.target.value)} /></label>
        <label className="date-field"><span>To</span><input type="date" className="input" value={to} min={from || undefined} onChange={(e) => onFilter(setTo)(e.target.value)} /></label>
        <select className="input only-mobile-block" aria-label="Sort complaints" value={mobileSortValue < 0 ? '' : mobileSortValue} onChange={(e) => { setSort(MOBILE_SORTS[Number(e.target.value)].sort); setPage(1); }}>
          {mobileSortValue < 0 && <option value="">Sort…</option>}
          {MOBILE_SORTS.map((m, i) => <option key={m.label} value={i}>{m.label}</option>)}
        </select>
        {filtering && <button type="button" className="btn btn-ghost" onClick={clearFilters}><Icon name="reset" size={16} /> Clear filters</button>}
      </div>
      {rangeError && <p className="field-error" role="alert">{rangeError}</p>}

      {complaints.length === 0 ? (
        <EmptyState icon="inbox" title="No complaints yet" text="Complaints reported by users will appear here." />
      ) : filtered.length === 0 ? (
        <EmptyState icon="search" title="No complaints match" text="Try different filters or a wider date range." action={<button type="button" className="btn btn-secondary" onClick={clearFilters}>Clear filters</button>} />
      ) : (
        <>
          <div className="only-desktop">
            <div className="table-wrap card">
              <table className="manage-table">
                <thead>
                  <tr>
                    {sortTh('Complaint', 'id')}{sortTh('Title', 'title')}{sortTh('Category', 'category')}{sortTh('Priority', 'priority')}{sortTh('Status', 'status')}
                    <th>Assigned</th>{sortTh('Submitted', 'createdAt')}<th><span className="visually-hidden">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.id} className={c.id === openId ? 'row-open' : undefined}>
                      <td className="mono">{c.id}{c.isDemo && <span className="demo-tag">Sample</span>}</td>
                      <td className="cell-title">{c.title}<span className="muted small block">{locationText(c)}</span></td>
                      <td><span className="cat"><CategoryIcon category={c.category} size={16} />{CATEGORY_LABELS[c.category]}</span></td>
                      <td><PriorityBadge priority={c.priority} /></td>
                      <td><StatusBadge status={c.status} /></td>
                      <td>{c.assignedTo ?? <span className="muted">Unassigned</span>}</td>
                      <td>{formatDate(c.createdAt)}</td>
                      <td><button type="button" className="btn btn-secondary btn-sm" onClick={() => openDrawer(c.id)} aria-label={`View details of ${c.id}`}>View</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="only-mobile cards">
            {rows.map((c) => (
              <button key={c.id} type="button" className="card complaint-card card-btn" onClick={() => openDrawer(c.id)}>
                <span className="cmp-top"><span className="mono">{c.id}</span><StatusBadge status={c.status} /></span>
                <span className="cmp-title">{c.title}</span>
                <span className="muted small"><span className="cat"><CategoryIcon category={c.category} size={14} />{CATEGORY_LABELS[c.category]}</span> · {locationText(c)}</span>
                <span className="cmp-bottom"><span className="muted small">{formatDate(c.createdAt)} · {c.assignedTo ?? 'Unassigned'}</span><PriorityBadge priority={c.priority} /></span>
              </button>
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

      {open && <ComplaintDrawer key={open.id} complaint={open} onClose={closeDrawer} />}
    </>
  );
}
