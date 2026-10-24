// Help requests and formal applications. Complaints keep their own type (types/complaint.ts).

export type RequestKind = 'help' | 'application';

// Help request workflow:  Submitted -> Under Review -> Assistance in Progress -> Answered / Completed
// Application workflow:   Submitted -> Under Review -> More Information Required -> Approved / Rejected -> Fulfilled / Closed
export type RequestStatus =
  | 'submitted' | 'under_review' | 'in_progress' | 'answered' | 'completed'
  | 'more_info' | 'approved' | 'rejected' | 'fulfilled' | 'closed';

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  in_progress: 'Assistance in Progress',
  answered: 'Answered',
  completed: 'Completed',
  more_info: 'More Information Required',
  approved: 'Approved',
  rejected: 'Rejected',
  fulfilled: 'Fulfilled',
  closed: 'Closed',
};

export const HELP_STATUSES: RequestStatus[] = ['submitted', 'under_review', 'in_progress', 'answered', 'completed'];
export const APPLICATION_STATUSES: RequestStatus[] = ['submitted', 'under_review', 'more_info', 'approved', 'rejected', 'fulfilled', 'closed'];

export interface RequestEvent {
  status: RequestStatus;
  at: string; // ISO date-time
  by?: string; // who made the change
  note?: string;
}

/** A message in the conversation with the requester. Both sides can read these. */
export interface RequestReply {
  at: string;
  by: string;
  text: string;
  fromUser?: boolean; // true when the requester wrote it
}

/** A private note for staff. It is stored apart from replies and is never shown to the requester. */
export interface RequestNote {
  at: string;
  by: string;
  text: string;
}

// Allowed next statuses (admin changes). A request that is closed has no further changes.
export const NEXT_STATUSES: Record<RequestKind, Partial<Record<RequestStatus, RequestStatus[]>>> = {
  help: {
    submitted: ['under_review'],
    under_review: ['in_progress', 'answered', 'completed'],
    in_progress: ['answered', 'completed'],
    answered: ['in_progress', 'completed'],
  },
  application: {
    submitted: ['under_review'],
    under_review: ['more_info', 'approved', 'rejected'],
    more_info: ['under_review'],
    approved: ['fulfilled', 'closed'],
    rejected: ['closed'],
    fulfilled: ['closed'],
  },
};

// These changes need a written reason or message that the requester can see.
export const STATUS_NEEDS_TEXT: RequestStatus[] = ['approved', 'rejected', 'more_info'];

export interface ServiceRequest {
  id: string; // HLP-YYYYMMDD-XXXX or APP-YYYYMMDD-XXXX
  kind: RequestKind;
  title: string;
  category: string; // key of a help category or an application type (see utils/requestConfig.ts)
  department?: string;
  description: string;
  details: Record<string, string>; // extra form fields of an application, by field key
  status: RequestStatus;
  history: RequestEvent[];
  replies: RequestReply[]; // visible to the requester
  internalNotes: RequestNote[]; // private to staff
  assignedTo?: string;
  createdAt: string;
  updatedAt?: string;
  submittedBy: string; // lower-case email of the requester
  submitterName?: string;
  submitterType?: string; // 'student' | 'staff' when known
}
