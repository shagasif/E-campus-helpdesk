import { PRIORITY_LABELS, STATUS_LABELS, type Priority, type Status } from '../types/complaint';
import { Icon } from './Icon';

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`badge badge-${status}`}>{STATUS_LABELS[status]}</span>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={`prio prio-${priority}`}>
      <Icon name="flag" size={14} />
      {PRIORITY_LABELS[priority]}
    </span>
  );
}
