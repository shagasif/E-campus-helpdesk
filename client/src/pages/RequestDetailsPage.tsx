import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useRequests, useVisibleRequests } from '../context/RequestsContext';
import { displayName, useAuth, useBase } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { REQUEST_STATUS_LABELS } from '../types/request';
import { applicationType, requestCategoryLabel } from '../utils/requestConfig';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { formatDateTime } from '../utils/format';

/** User view of one of their own help requests or applications (read-only). */
export function RequestDetailsPage() {
  const { id } = useParams();
  const requests = useVisibleRequests();
  const { addRequestReply } = useRequests();
  const { session } = useAuth();
  const { toast } = useToast();
  const base = useBase();
  const [reply, setReply] = useState('');
  const [replyError, setReplyError] = useState<string | null>(null);
  const r = requests.find((x) => x.id === id);

  if (!r) {
    return <EmptyState icon="search" title="Request not found" text={`There is no request with ID “${id}” available to you.`} action={<Link className="btn btn-primary" to={`${base}/requests`}>Back to my requests</Link>} />;
  }

  const type = r.kind === 'application' ? applicationType(r.category) : undefined;
  const extra = type ? type.fields.filter((f) => r.details[f.key]) : [];

  function sendReply() {
    const result = addRequestReply(r!.id, reply, displayName(session), true);
    if (!result.ok) { setReplyError(result.error); return; }
    setReplyError(null); setReply('');
    toast('Your reply was sent. The request is back under review.');
  }

  return (
    <>
      <Link className="back-link no-print" to={`${base}/requests`}><Icon name="back" size={16} /> My requests</Link>
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
              {r.department && <div><dt>Department</dt><dd>{r.department}</dd></div>}
              <div><dt>Submitted</dt><dd>{formatDateTime(r.createdAt)}</dd></div>
              <div><dt>Assigned to</dt><dd>{r.assignedTo ?? 'Not assigned yet'}</dd></div>
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
            <h2>Responses and messages</h2>
            {r.replies.length === 0 ? (
              <p className="muted small">No response yet. Staff replies will appear here.</p>
            ) : (
              <ul className="reply-list">
                {r.replies.map((m, i) => (
                  <li key={`${m.at}-${i}`} className={m.fromUser ? 'reply-user' : undefined}>
                    <div className="muted small">{m.fromUser ? 'You' : m.by} · {formatDateTime(m.at)}</div>
                    <p className="pre">{m.text}</p>
                  </li>
                ))}
              </ul>
            )}
            {r.status === 'more_info' && (
              <div className="field reply-form">
                <label htmlFor="user-reply">Your reply (staff are waiting for more information)</label>
                <textarea id="user-reply" className="input" rows={3} maxLength={1000} value={reply} onChange={(e) => setReply(e.target.value)} aria-invalid={!!replyError} />
                {replyError && <p className="field-error" role="alert">{replyError}</p>}
                <div className="row"><button type="button" className="btn btn-primary btn-sm" onClick={sendReply}>Send reply</button></div>
              </div>
            )}
          </section>
        </div>

        <div className="stack">
          <section className="card">
            <h2>Status history</h2>
            <ol className="timeline" aria-label="Status history">
              {r.history.map((e, i) => (
                <li key={`${e.at}-${i}`} className={`tl-request tls-${e.status}`}>
                  <span className="tl-dot" aria-hidden="true" />
                  <div>
                    <strong>{i === 0 ? 'Submitted' : REQUEST_STATUS_LABELS[e.status]}</strong>
                    <div className="muted small">{formatDateTime(e.at)}</div>
                  </div>
                </li>
              ))}
            </ol>
          </section>
          <p className="muted small">Saved in this browser only. This prototype has no backend, so no university office receives it yet.</p>
        </div>
      </div>
    </>
  );
}
