import { APPLICATION_STATUSES, HELP_STATUSES, type RequestEvent, type RequestNote, type RequestReply, type RequestStatus, type ServiceRequest } from '../types/request';

const KEY = 'campus-issue-reporting:requests:v1';

const isDate = (x: unknown): x is string => typeof x === 'string' && !Number.isNaN(Date.parse(x));
const str = (x: unknown): string | undefined => (typeof x === 'string' && x ? x : undefined);
const ALL_STATUSES: RequestStatus[] = [...new Set([...HELP_STATUSES, ...APPLICATION_STATUSES])];

function validEvent(e: unknown): e is RequestEvent {
  if (typeof e !== 'object' || e === null) return false;
  const v = e as Record<string, unknown>;
  return ALL_STATUSES.includes(v.status as RequestStatus) && isDate(v.at);
}

function validReply(r: unknown): r is RequestReply {
  if (typeof r !== 'object' || r === null) return false;
  const v = r as Record<string, unknown>;
  return isDate(v.at) && typeof v.by === 'string' && typeof v.text === 'string';
}

function validNote(n: unknown): n is RequestNote {
  if (typeof n !== 'object' || n === null) return false;
  const v = n as Record<string, unknown>;
  return isDate(v.at) && typeof v.by === 'string' && typeof v.text === 'string';
}

function normalize(x: unknown): ServiceRequest | null {
  if (typeof x !== 'object' || x === null) return null;
  const r = x as Record<string, unknown>;
  if (typeof r.id !== 'string' || typeof r.title !== 'string' || typeof r.description !== 'string' || !isDate(r.createdAt)) return null;
  if (r.kind !== 'help' && r.kind !== 'application') return null;
  if (!ALL_STATUSES.includes(r.status as RequestStatus) || typeof r.submittedBy !== 'string') return null;
  const status = r.status as RequestStatus;
  let history: RequestEvent[] = Array.isArray(r.history) ? r.history.filter(validEvent) : [];
  if (history.length === 0) history = [{ status: 'submitted', at: r.createdAt }];
  const details: Record<string, string> = {};
  if (typeof r.details === 'object' && r.details !== null) {
    for (const [k, v] of Object.entries(r.details as Record<string, unknown>)) if (typeof v === 'string') details[k] = v;
  }
  return {
    id: r.id,
    kind: r.kind,
    title: r.title,
    category: typeof r.category === 'string' ? r.category : 'other',
    department: str(r.department),
    description: r.description,
    details,
    status,
    history,
    replies: Array.isArray(r.replies) ? r.replies.filter(validReply) : [],
    internalNotes: Array.isArray(r.internalNotes) ? r.internalNotes.filter(validNote) : [],
    assignedTo: str(r.assignedTo),
    createdAt: r.createdAt,
    updatedAt: isDate(r.updatedAt) ? r.updatedAt : undefined,
    submittedBy: r.submittedBy,
    submitterName: str(r.submitterName),
    submitterType: str(r.submitterType),
  };
}

export interface RequestLoadResult { requests: ServiceRequest[]; warning?: string }

export function loadRequests(): RequestLoadResult {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return { requests: [], warning: 'Browser storage is unavailable, so help requests and applications will not be saved after you close or refresh this page.' };
  }
  if (raw === null) return { requests: [] };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('not an array');
    const valid = parsed.map(normalize).filter((r): r is ServiceRequest => r !== null);
    const skipped = parsed.length - valid.length;
    return { requests: valid, warning: skipped > 0 ? `${skipped} saved request(s) were damaged and could not be loaded.` : undefined };
  } catch {
    return { requests: [], warning: 'Saved requests were damaged and could not be read. Starting with an empty list; the next change will overwrite it.' };
  }
}

/** Returns an error message, or null when the save worked. */
export function saveRequests(requests: ServiceRequest[]): string | null {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(requests));
    return null;
  } catch {
    return 'Could not save requests to browser storage (it may be full or blocked). Your changes will be lost when you refresh.';
  }
}
