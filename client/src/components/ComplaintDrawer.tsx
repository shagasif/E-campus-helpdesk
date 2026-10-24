import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CATEGORY_LABELS, PRIORITIES, PRIORITY_LABELS, STAFF_TEAMS, STATUSES, STATUS_LABELS, locationText, type Complaint, type Priority, type Status } from '../types/complaint';
import { useComplaints } from '../context/ComplaintsContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { StatusBadge, PriorityBadge } from './StatusBadge';
import { StatusTimeline } from './StatusTimeline';
import { AiSummaryBox } from './AiSummaryBox';
import { CategoryIcon, Icon } from './Icon';
import { formatDateTime } from '../utils/format';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Admin detail drawer: full complaint information plus status / priority / assignment / resolution note. */
export function ComplaintDrawer({ complaint: c, onClose }: { complaint: Complaint; onClose: () => void }) {
  const { updateComplaint, setAiSummary } = useComplaints();
  const { session } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<Status>(c.status);
  const [priority, setPriority] = useState<Priority>(c.priority);
  const [assignee, setAssignee] = useState(c.assignedTo ?? '');
  const [note, setNote] = useState(c.resolutionNote ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const panel = useRef<HTMLElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  // Focus handling: focus the drawer, trap Tab, close on Escape, give focus back, stop the page scrolling behind.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeBtn.current?.focus();
    document.body.classList.add('no-scroll');
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab' || !panel.current) return;
      const items = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
      previous?.focus?.();
    };
  }, [onClose]);

  const dirty = status !== c.status || priority !== c.priority || assignee !== (c.assignedTo ?? '') || note.trim() !== (c.resolutionNote ?? '');
  const noteInvalid = !!error && status === 'resolved' && !note.trim();

  function save() {
    setError(null);
    setSaving(true);
    const result = updateComplaint(c.id, { status, priority, assignedTo: assignee || null, resolutionNote: note }, session?.id ?? 'admin');
    setSaving(false);
    if (!result.ok) { setError(result.error); toast(result.error, 'error'); return; }
    toast(status === 'resolved' && c.status !== 'resolved' ? `${c.id} marked as Resolved and the resolution was recorded.` : `${c.id} updated.`);
  }
  function reset() {
    setStatus(c.status); setPriority(c.priority); setAssignee(c.assignedTo ?? ''); setNote(c.resolutionNote ?? ''); setError(null);
  }

  return createPortal(
    <div className="drawer-root">
      <div className="drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" ref={panel}>
        <header className="drawer-head">
          <div>
            <div className="mono muted">{c.id}{c.isDemo && <span className="demo-tag">Sample</span>}</div>
            <h2 id="drawer-title">{c.title}</h2>
            <div className="row"><StatusBadge status={c.status} /><PriorityBadge priority={c.priority} /></div>
          </div>
          <button type="button" ref={closeBtn} className="icon-btn" onClick={onClose} aria-label="Close details"><Icon name="x" size={20} /></button>
        </header>

        <div className="drawer-body">
          <dl className="info-grid">
            <div><dt>Category</dt><dd><span className="cat"><CategoryIcon category={c.category} size={16} />{CATEGORY_LABELS[c.category]}</span></dd></div>
            <div><dt>Location</dt><dd>{locationText(c)}</dd></div>
            {c.campus && <div><dt>Campus</dt><dd>{c.campus}</dd></div>}
            {c.area && <div><dt>Affected area</dt><dd>{c.area}</dd></div>}
            <div><dt>Submitted</dt><dd>{formatDateTime(c.createdAt)}</dd></div>
            <div><dt>Reported by</dt><dd>{c.submittedBy ?? '—'}</dd></div>
            <div><dt>Assigned to</dt><dd>{c.assignedTo ?? 'Unassigned'}</dd></div>
            <div><dt>Resolved</dt><dd>{c.resolvedAt ? `${formatDateTime(c.resolvedAt)}${c.resolvedBy ? ` by ${c.resolvedBy}` : ''}` : '—'}</dd></div>
          </dl>

          <h3>Description</h3>
          <p className="pre">{c.description}</p>

          {c.imageData && (<><h3>Attached photo</h3><img className="detail-img" src={c.imageData} alt={`Photo attached to complaint ${c.id}`} /></>)}

          <section className="manage" aria-labelledby="manage-title">
            <h3 id="manage-title">Manage complaint</h3>
            <div className="field-row">
              <div className="field">
                <label htmlFor="d-status">Status</label>
                <select id="d-status" className="input" value={status} onChange={(e) => setStatus(e.target.value as Status)}>
                  {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="d-priority">Priority</label>
                <select id="d-priority" className="input" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
                  {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="d-assign">Assign to staff team</label>
              <select id="d-assign" className="input" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                <option value="">Unassigned</option>
                {STAFF_TEAMS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="d-note">Resolution note{status === 'resolved' && <span className="req" aria-hidden="true"> *</span>}</label>
              <textarea id="d-note" className="input" rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What was done to fix the issue? Required when marking as Resolved." aria-invalid={noteInvalid} aria-describedby={noteInvalid ? 'd-note-err' : undefined} />
              {noteInvalid && <p id="d-note-err" className="field-error" role="alert">{error}</p>}
            </div>
            {error && !noteInvalid && <div className="alert alert-error" role="alert"><Icon name="alert" size={18} /><span>{error}</span></div>}
            <div className="row">
              <button type="button" className="btn btn-primary" onClick={save} disabled={!dirty || saving}>{saving ? 'Saving…' : 'Save changes'}</button>
              <button type="button" className="btn btn-secondary" onClick={reset} disabled={!dirty}>Reset</button>
            </div>
          </section>

          <h3>Status timeline</h3>
          <StatusTimeline complaint={c} showActor />

          <h3>AI summary</h3>
          {c.aiSummary ? <div className="ai-attached"><div><span className="ai-label">AI-suggested summary (not verified)</span><p>{c.aiSummary}</p></div></div> : <p className="muted small">No AI summary yet.</p>}
          <AiSummaryBox description={c.description} useLabel={c.aiSummary ? 'Replace saved summary' : 'Save this summary'} onUse={(s) => setAiSummary(c.id, s)} />
        </div>
      </aside>
    </div>,
    document.body,
  );
}
