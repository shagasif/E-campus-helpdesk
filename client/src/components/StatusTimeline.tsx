import { STATUS_LABELS, type Complaint } from '../types/complaint';
import { formatDateTime } from '../utils/format';
import { Icon } from './Icon';

function label(status: Complaint['status'], index: number, note?: string): string {
  if (index === 0) return 'Complaint submitted';
  if (status === 'pending') return note?.startsWith('Reopened') ? 'Complaint reopened' : 'Moved back to Pending';
  return status === 'in_progress' ? 'Marked In Progress' : 'Marked Resolved';
}

export function StatusTimeline({ complaint, showActor = false }: { complaint: Complaint; showActor?: boolean }) {
  return (
    <ol className="timeline" aria-label="Status timeline">
      {complaint.history.map((e, i) => (
        <li key={`${e.at}-${i}`} className={`tl-${e.status}`}>
          <span className="tl-dot" aria-hidden="true">{e.status === 'resolved' ? <Icon name="check" size={12} /> : null}</span>
          <div>
            <strong>{label(e.status, i, e.note)}</strong>
            <span className="muted small"> · {STATUS_LABELS[e.status]}</span>
            <div className="muted small">{formatDateTime(e.at)}{showActor && e.by ? ` · by ${e.by}` : ''}</div>
            {e.note && e.status === 'pending' && <p className="small pre">{e.note}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
