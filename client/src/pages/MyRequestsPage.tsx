import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useVisibleComplaints } from '../context/ComplaintsContext';
import { useVisibleRequests } from '../context/RequestsContext';
import { useBase } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { complaintsToCsv, downloadCsv } from '../utils/csv';
import { buildRows, GROUP_LABELS, TYPE_LABELS, type RequestType, type StatusGroup } from '../utils/unifiedRequests';
import { RequestsTable } from '../components/RequestsTable';
import { EmptyState } from '../components/EmptyState';
import { Pagination } from '../components/Pagination';
import { Icon } from '../components/Icon';

const PAGE_SIZE = 10;
const TYPES: RequestType[] = ['complaint', 'help', 'application'];
const GROUPS: StatusGroup[] = ['open', 'in_progress', 'awaiting', 'completed'];

/** Everything the signed-in user has sent: problem reports, help requests and applications. */
export function MyRequestsPage() {
  const base = useBase();
  const complaints = useVisibleComplaints();
  const requests = useVisibleRequests();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const initialType = params.get('type');
  const [type, setType] = useState<RequestType | 'all'>(TYPES.includes(initialType as RequestType) ? (initialType as RequestType) : 'all');
  const [group, setGroup] = useState<StatusGroup | 'all'>('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const all = useMemo(() => buildRows(complaints, requests, base), [complaints, requests, base]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((r) => (type === 'all' || r.type === type) && (group === 'all' || r.group === group)
      && (!q || [r.id, r.title, r.categoryLabel, r.assignedTo ?? ''].some((v) => v.toLowerCase().includes(q))));
  }, [all, type, group, query]);
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const filtering = type !== 'all' || group !== 'all' || query.trim() !== '';
  const clear = () => { setType('all'); setGroup('all'); setQuery(''); setPage(1); };

  function download() {
    try {
      downloadCsv(`my-complaints-${new Date().toISOString().slice(0, 10)}.csv`, complaintsToCsv(complaints));
      toast(`Downloaded ${complaints.length} complaint${complaints.length === 1 ? '' : 's'} as CSV.`);
    } catch {
      toast('The CSV file could not be created. Please try again.', 'error');
    }
  }

  return (
    <>
      <header className="page-head page-head-row">
        <div>
          <h1>My Requests</h1>
          <p className="muted">Problem reports, help requests and applications you have sent, newest first.</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={download} disabled={complaints.length === 0}>
          <Icon name="download" size={18} /> Download problem reports (CSV)
        </button>
      </header>

      {all.length === 0 ? (
        <EmptyState icon="inbox" title="No requests yet" text="When you report a problem, ask for help or send an application, it will show up here so you can follow its progress."
          action={<Link className="btn btn-primary" to={`${base}/report`}><Icon name="plus" size={18} /> Report a problem</Link>} />
      ) : (
        <>
          <div className="toolbar">
            <div className="search">
              <Icon name="search" size={18} />
              <input type="search" className="input" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Search by ID, title or category" aria-label="Search requests" />
            </div>
            <select className="input toolbar-select" value={type} onChange={(e) => { setType(e.target.value as RequestType | 'all'); setPage(1); }} aria-label="Filter by request type">
              <option value="all">All request types</option>
              {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
            </select>
            <select className="input toolbar-select" value={group} onChange={(e) => { setGroup(e.target.value as StatusGroup | 'all'); setPage(1); }} aria-label="Filter by status">
              <option value="all">All statuses</option>
              {GROUPS.map((g) => <option key={g} value={g}>{GROUP_LABELS[g]}</option>)}
            </select>
            {filtering && <button type="button" className="btn btn-ghost" onClick={clear}><Icon name="reset" size={16} /> Clear</button>}
          </div>
          {filtered.length === 0 ? (
            <EmptyState icon="search" title="No requests match" text="Try a different search or filter." action={<button type="button" className="btn btn-secondary" onClick={clear}>Show all requests</button>} />
          ) : (
            <>
              <RequestsTable rows={rows} showAssigned />
              <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPage={setPage} />
            </>
          )}
        </>
      )}
    </>
  );
}
