import { useMemo, useState } from 'react';
import { useComplaints } from '../context/ComplaintsContext';
import { useRequests } from '../context/RequestsContext';
import { loadAccounts, USER_TYPE_LABELS } from '../utils/accounts';
import { EmptyState } from '../components/EmptyState';
import { Pagination } from '../components/Pagination';
import { Icon } from '../components/Icon';
import { formatDate } from '../utils/format';
import { cloudEnabled } from '../utils/supabase';

const PAGE_SIZE = 10;

/** People who created an account in this browser. Passwords are never shown or stored in readable form. */
export function AdminUsersPage() {
  const { complaints } = useComplaints();
  const { requests } = useRequests();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const users = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of complaints) if (c.submittedBy) counts.set(c.submittedBy, (counts.get(c.submittedBy) ?? 0) + 1);
    for (const r of requests) counts.set(r.submittedBy, (counts.get(r.submittedBy) ?? 0) + 1);
    return loadAccounts()
      .map((a) => ({ name: a.name, email: a.email, type: USER_TYPE_LABELS[a.userType], department: a.department, createdAt: a.createdAt, count: counts.get(a.email.toLowerCase()) ?? 0 }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [complaints, requests]);

  const q = query.trim().toLowerCase();
  const filtered = q ? users.filter((u) => [u.name, u.email, u.department, u.type].some((v) => v.toLowerCase().includes(q))) : users;
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <header className="page-head">
        <h1>Users</h1>
        <p className="muted">{cloudEnabled ? 'People who registered on this site. Passwords are never shown here.' : 'People who created an account in this browser. Passwords are never shown here.'}</p>
      </header>
      {users.length === 0 ? (
        <EmptyState icon="users" title="No user accounts yet" text="Accounts appear here after students or staff use Create account on the login page." />
      ) : (
        <>
          <div className="toolbar">
            <div className="search">
              <Icon name="search" size={18} />
              <input type="search" className="input" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Search by name, email or department" aria-label="Search users" />
            </div>
          </div>
          {filtered.length === 0 ? (
            <EmptyState icon="search" title="No users match" text="Try a different search." />
          ) : (
            <>
              <div className="only-desktop">
                <div className="table-wrap card">
                  <table>
                    <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Joined</th><th>Requests</th></tr></thead>
                    <tbody>
                      {rows.map((u) => (
                        <tr key={u.email}>
                          <td className="cell-title">{u.name}</td>
                          <td>{u.email}</td>
                          <td>{u.type}</td>
                          <td>{u.department || <span className="muted">—</span>}</td>
                          <td>{formatDate(u.createdAt)}</td>
                          <td>{u.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="only-mobile cards">
                {rows.map((u) => (
                  <div key={u.email} className="card complaint-card">
                    <div className="cmp-title">{u.name}</div>
                    <div className="muted small">{u.email}</div>
                    <div className="cmp-bottom"><span className="muted small">{u.type}{u.department ? ` · ${u.department}` : ''}</span><span className="muted small">{u.count} request{u.count === 1 ? '' : 's'}</span></div>
                  </div>
                ))}
              </div>
              <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPage={setPage} />
            </>
          )}
        </>
      )}
      <p className="muted small">{cloudEnabled ? 'To make someone an administrator or remove an account, use the Supabase dashboard (Table Editor, then profiles).' : 'User management (blocking, roles, password resets) needs a backend and a database and is not part of this prototype.'}</p>
    </>
  );
}
