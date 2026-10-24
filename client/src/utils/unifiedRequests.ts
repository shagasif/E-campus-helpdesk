import { CATEGORY_LABELS, STATUS_LABELS, type Complaint } from '../types/complaint';
import { REQUEST_STATUS_LABELS, type ServiceRequest } from '../types/request';
import { requestCategoryLabel } from './requestConfig';

export type RequestType = 'complaint' | 'help' | 'application';
export type StatusGroup = 'open' | 'in_progress' | 'awaiting' | 'completed';

export const TYPE_LABELS: Record<RequestType, string> = { complaint: 'Problem report', help: 'Help request', application: 'Application' };
export const GROUP_LABELS: Record<StatusGroup, string> = { open: 'Open', in_progress: 'In progress', awaiting: 'Awaiting response', completed: 'Completed' };

/** One line in a list that mixes complaints, help requests and applications. */
export interface RequestRow {
  id: string;
  title: string;
  type: RequestType;
  categoryLabel: string;
  createdAt: string;
  assignedTo?: string;
  statusLabel: string;
  statusClass: string; // CSS class suffix: badge-<statusClass>
  group: StatusGroup;
  to: string; // details page
  isDemo?: boolean;
  submittedBy?: string; // requester's email
  submitterName?: string;
  dept?: string; // department or campus, when known
}

// How a status is counted on the dashboard:
//  Open = waiting to be picked up, In progress = being worked on or approved but not yet fulfilled,
//  Awaiting response = staff asked the requester for more information, Completed = finished or decided.
function complaintGroup(status: Complaint['status']): StatusGroup {
  return status === 'pending' ? 'open' : status === 'in_progress' ? 'in_progress' : 'completed';
}
function requestGroup(status: ServiceRequest['status']): StatusGroup {
  switch (status) {
    case 'submitted': return 'open';
    case 'under_review': case 'in_progress': case 'approved': return 'in_progress';
    case 'more_info': return 'awaiting';
    default: return 'completed'; // answered, completed, rejected, fulfilled, closed
  }
}

export function buildRows(complaints: Complaint[], requests: ServiceRequest[], base: string, nameOf?: (email: string) => string | undefined): RequestRow[] {
  const fromComplaints: RequestRow[] = complaints.map((c) => ({
    id: c.id,
    title: c.title,
    type: 'complaint',
    categoryLabel: CATEGORY_LABELS[c.category],
    createdAt: c.createdAt,
    assignedTo: c.assignedTo,
    statusLabel: STATUS_LABELS[c.status],
    statusClass: c.status,
    group: complaintGroup(c.status),
    to: `${base}/complaints/${c.id}`,
    isDemo: c.isDemo,
    submittedBy: c.submittedBy,
    submitterName: c.submittedBy ? nameOf?.(c.submittedBy) : undefined,
    dept: c.campus || c.area || undefined,
  }));
  const fromRequests: RequestRow[] = requests.map((r) => ({
    id: r.id,
    title: r.title,
    type: r.kind,
    categoryLabel: requestCategoryLabel(r.kind, r.category),
    createdAt: r.createdAt,
    assignedTo: r.assignedTo,
    statusLabel: REQUEST_STATUS_LABELS[r.status],
    statusClass: r.status,
    group: requestGroup(r.status),
    to: `${base}/requests/${r.id}`,
    submittedBy: r.submittedBy,
    submitterName: r.submitterName,
    dept: r.department,
  }));
  return [...fromComplaints, ...fromRequests].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function countGroups(rows: RequestRow[]): Record<StatusGroup, number> {
  const out: Record<StatusGroup, number> = { open: 0, in_progress: 0, awaiting: 0, completed: 0 };
  for (const r of rows) out[r.group] += 1;
  return out;
}
