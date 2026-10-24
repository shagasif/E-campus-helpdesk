import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useRequests } from '../context/RequestsContext';
import { displayName, useAuth, useBase } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { NEXT_STATUSES, REQUEST_STATUS_LABELS, STATUS_NEEDS_TEXT, type RequestStatus } from '../types/request';
import { STAFF_TEAMS } from '../types/complaint';
import { applicationType, REQUEST_TEAMS, requestCategoryLabel } from '../utils/requestConfig';
import { USER_TYPE_LABELS, type UserType } from '../utils/accounts';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { formatDateTime } from '../utils/format';

const TEAMS = [...REQUEST_TEAMS, ...STAFF_TEAMS.filter((t) => !REQUEST_TEAMS.includes(t))];

/** Admin view of one help request or application: review, assign, change status, reply and keep private notes. */
export function AdminRequestDetailsPage() {
  const { id } = useParams();
  const base = useBase();
  const { session } = useAuth();
  const { toast } = useToast();
  const { requests, assignRequest, changeRequestStatus, addRequestReply, addInternalNote } = useRequests();
  const r = requests.find((x) => x.id === id);
  const [team, setTeam] = useState<string | null>(null); // null = untouched, shows the saved team
  const [target, setTarget] = useState<RequestStatus | ''>('');
  const [statusText, setStatusText] = useState('');
  const [statusError, setStatusError] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [replyError, setReplyError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);
  const me = displayName(session);

  if (!r) {
    return <EmptyState icon="search" title="Request not found" text={`There is no help request or application with ID “${id}”.`} action={<Link className="btn btn-primary" to={`${base}/requests`}>Back to all requests</Link>} />;
  }

  const type = r.kind === 'application' ? applicationType(r.category) : undefined;
  const extra = type ? type.fields.filter((f) => r.details[f.key]) : [];
  const allowed = NEXT_STATUSES[r.kind][r.status] ?? [];
  const needsText = target !== '' && STATUS_NEEDS_TEXT.includes(target);
  const backTo = r.kind === 'help' ? `${base}/help` : `${base}/applications`;
  const teamValue = team ?? r.assignedTo ?? '';
  const submitterType = r.submitterType === 'student' || r.submitterType === 'staff' ? USER_TYPE_LABELS[r.submitterType as UserType] : undefined;

  function saveTeam() {
    const result = assignRequest(r!.id, teamValue || null, me);
    if (!result.ok) { toast(result.error, 'error'); return; }
    setTeam(null);
    toast(teamValue ? `Assigned to ${teamValue}.` : 'Assignment removed.');
  }

  function applyStatus() {
    if (!target) { setStatusError('Choose the new status first.'); return; }
    const result = changeRequestStatus(r!.id, target, me, statusText);
    if (!result.ok) { setStatusError(result.error); return; }
    setStatusError(null); setTarget(''); setStatusText('');
    toast('Status updated.');
  }

  function sendReply() {
    const result = addRequestReply(r!.id, reply, me, false);
    if (!result.ok) { setReplyError(result.error); return; }
    setReplyError(null); setReply('');
    toast('Reply sent. The requester can read it.');
  }

  function saveNote() {
    const result = addInternalNote(r!.id, note, me);
    if (!result.ok) { setNoteError(result.error); return; }
    setNoteError(null); setNote('');
    toast('Private note saved.');
  }

  return (
    <>
      <Link className="back-link" to={backTo}><Icon name="back" size={16} /> {r.kind === 'help' ? 'Help requests' : 'Applications'}</Link>
      <header className="page-head">
        <div className="mono muted">{r.id}</div>
        <h1>{r.title}</h1>
        <div className="row"><span className={`badge badge-${r.status}`}>{REQUEST_STATUS_LABELS[r.status]}</span><span className="muted small">{r.kind === 'help' ? 'Help request' : 'Application'}</span></div>
      </header>

      <div className="detail-grid">
        <div className="stack">
          <section className="card">
            <dl className="info-grid">
              <div><dt>Category</dt><dd>{requestCategoryLabel(r.kind, r.category)}</dd></div>
              <div><dt>Submitted by</dt><dd>{r.submitterName || r.submittedBy}</dd></div>
              <div><dt>Email</dt><dd>{r.submittedBy}</dd></div>
              {submitterType && <div><dt>Role</dt><dd>{submitterType}</dd></div>}
              {r.department && <div><dt>Department</dt><dd>{r.department}</dd></div>}
              <div><dt>Submitted</dt><dd>{formatDateTime(r.createdAt)}</dd></div>
              <div><dt>Assigned to</dt><dd>{r.assignedTo ?? 'Unassigned'}</dd></div>
            </dl>
            {extra.some((f) => f.type !== 'textarea') && (
              <dl className="info-grid info-grid-extra">
                {extra.filter((f) => f.type !== 'textarea').map((f) => <div key={f.key}><dt>{f.label}</dt><dd>{r.details[f.key]}</dd></div>)}
              </dl>
            )}
            {extra.filter((f) => f.type === 'textarea').map((f) => (
              <div key={f.key} className="info-text"><div className="info-label">{f.label}</div><p className="pre">{r.details[f.key]}</p></div>
            ))}
            {r.kind === 'help' && (<div className="info-text"><div className="info-label">Description</div><p className="pre">{r.description}</p></div>)}
          </section>

          <section className="card">
            <h2>Conversation with the requester</h2>
            <p className="muted small">Messages here are visible to the requester.</p>
            {r.replies.length === 0 ? (
              <p className="muted small">No messages yet.</p>
            ) : (
              <ul className="reply-list">
                {r.replies.map((m, i) => (
                  <li key={`${m.at}-${i}`} className={m.fromUser ? 'reply-user' : undefined}>
                    <div className="muted small">{m.fromUser ? 'Requester' : m.by} · {formatDateTime(m.at)}</div>
                    <p className="pre">{m.text}</p>
                  </li>
                ))}
              </ul>
            )}
            <div className="field reply-form">
              <label htmlFor="reply">Reply to the requester</label>
              <textarea id="reply" className="input" rows={3} maxLength={1000} value={reply} onChange={(e) => setReply(e.target.value)} aria-invalid={!!replyError} />
              {replyError && <p className="field-error" role="alert">{replyError}</p>}
              <div className="row"><button type="button" className="btn btn-primary btn-sm" onClick={sendReply}>Send reply</button></div>
            </div>
          </section>

          <section className="card private-card">
            <h2><Icon name="shield" size={18} /> Internal notes (private)</h2>
            <p className="muted small">Only staff see these notes. They are never shown to the requester.</p>
            {r.internalNotes.length === 0 ? (
              <p className="muted small">No internal notes yet.</p>
            ) : (
              <ul className="reply-list">
                {r.internalNotes.map((n, i) => (
                  <li key={`${n.at}-${i}`}>
                    <div className="muted small">{n.by} · {formatDateTime(n.at)}</div>
                    <p className="pre">{n.text}</p>
                  </li>
                ))}
              </ul>
            )}
            <div className="field reply-form">
              <label htmlFor="note">Add a private note</label>
              <textarea id="note" className="input" rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} aria-invalid={!!noteError} />
              {noteError && <p className="field-error" role="alert">{noteError}</p>}
              <div className="row"><button type="button" className="btn btn-secondary btn-sm" onClick={saveNote}>Save private note</button></div>
            </div>
          </section>
        </div>

        <div className="stack">
          <section className="card">
            <h2>Manage {r.kind === 'help' ? 'request' : 'application'}</h2>

            <div className="field">
              <label htmlFor="team">Assign to a team or office</label>
              <select id="team" className="input" value={teamValue} onChange={(e) => setTeam(e.target.value)}>
                <option value="">Unassigned</option>
                {TEAMS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <div className="row"><button type="button" className="btn btn-secondary btn-sm" onClick={saveTeam} disabled={teamValue === (r.assignedTo ?? '')}>Save assignment</button></div>
              <p className="muted small">Teams and offices are placeholders. No staff accounts exist in this prototype.</p>
            </div>

            <div className="field status-panel">
              <label htmlFor="status">{r.kind === 'application' ? 'Review decision / status' : 'Status'}</label>
              {allowed.length === 0 ? (
                <p className="muted small">This {r.kind === 'help' ? 'request' : 'application'} is {REQUEST_STATUS_LABELS[r.status].toLowerCase()}. No further status changes are possible.</p>
              ) : (
                <>
                  <select id="status" className="input" value={target} onChange={(e) => { setTarget(e.target.value as RequestStatus | ''); setStatusError(null); }}>
                    <option value="">Change status to…</option>
                    {allowed.map((s) => <option key={s} value={s}>{REQUEST_STATUS_LABELS[s]}</option>)}
                  </select>
                  {target !== '' && (
                    <div className="field">
                      <label htmlFor="status-text">
                        {target === 'more_info' ? 'What information do you need? (the requester will see this)'
                          : needsText ? 'Reason for this decision (the requester will see this)' : 'Note (optional, the requester will see this)'}
                      </label>
                      <textarea id="status-text" className="input" rows={3} maxLength={500} value={statusText} onChange={(e) => setStatusText(e.target.value)} aria-invalid={!!statusError} />
                    </div>
                  )}
                  {statusError && <p className="field-error" role="alert">{statusError}</p>}
                  <div className="row"><button type="button" className="btn btn-primary btn-sm" onClick={applyStatus} disabled={!target}>Update status</button></div>
                  {r.kind === 'application' && <p className="muted small">The decision is recorded in this browser only. No letter, email or system outside this prototype is updated.</p>}
                </>
              )}
            </div>
          </section>

          <section className="card">
            <h2>Status history</h2>
            <ol className="timeline" aria-label="Status history">
              {r.history.map((e, i) => (
                <li key={`${e.at}-${i}`} className={`tl-request tls-${e.status}`}>
                  <span className="tl-dot" aria-hidden="true" />
                  <div>
                    <strong>{i === 0 ? 'Submitted' : REQUEST_STATUS_LABELS[e.status]}</strong>
                    <div className="muted small">{formatDateTime(e.at)}{e.by ? ` · by ${e.by}` : ''}</div>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </>
  );
}
