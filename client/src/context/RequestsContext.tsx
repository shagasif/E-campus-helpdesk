import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { NEXT_STATUSES, REQUEST_STATUS_LABELS, STATUS_NEEDS_TEXT, type RequestKind, type RequestStatus, type ServiceRequest } from '../types/request';
import { loadRequests, saveRequests } from '../utils/requestStorage';
import { useAuth } from './AuthContext';

export interface NewRequestInput {
  kind: RequestKind;
  title: string;
  category: string;
  department?: string;
  description: string;
  details?: Record<string, string>;
  submittedBy: string;
  submitterName?: string;
  submitterType?: string;
}

export type RequestResult = { ok: true } | { ok: false; error: string };

interface RequestsValue {
  requests: ServiceRequest[]; // help requests and applications (complaints live in ComplaintsContext)
  warning: string | null;
  addRequest: (input: NewRequestInput) => ServiceRequest;
  assignRequest: (id: string, team: string | null, by: string) => RequestResult;
  /** `text` is the decision reason or message to the requester (required for Approved, Rejected and More Information Required). */
  changeRequestStatus: (id: string, status: RequestStatus, by: string, text?: string) => RequestResult;
  addRequestReply: (id: string, text: string, by: string, fromUser: boolean) => RequestResult;
  addInternalNote: (id: string, text: string, by: string) => RequestResult;
}

const Ctx = createContext<RequestsValue | null>(null);

function makeReference(kind: RequestKind, existing: ServiceRequest[]): string {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const prefix = kind === 'help' ? 'HLP' : 'APP';
  let id: string;
  do {
    const rand = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    id = `${prefix}-${date}-${rand}`;
  } while (existing.some((r) => r.id === id));
  return id;
}

export function RequestsProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(() => loadRequests());
  const [requests, setRequests] = useState<ServiceRequest[]>(initial.requests);
  const [warning, setWarning] = useState<string | null>(initial.warning ?? null);
  const latest = useRef(requests);
  latest.current = requests;

  // Save every change to localStorage (not on the very first render, so nothing is overwritten by accident).
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const err = saveRequests(requests);
    setWarning((prev) => err ?? (prev && prev.startsWith('Could not save') ? null : prev));
  }, [requests]);

  const addRequest: RequestsValue['addRequest'] = useCallback((input) => {
    const now = new Date().toISOString();
    const request: ServiceRequest = {
      id: makeReference(input.kind, latest.current),
      kind: input.kind,
      title: input.title.trim(),
      category: input.category,
      department: input.department?.trim() || undefined,
      description: input.description.trim(),
      details: input.details ?? {},
      status: 'submitted',
      history: [{ status: 'submitted', at: now }],
      replies: [],
      internalNotes: [],
      createdAt: now,
      submittedBy: input.submittedBy,
      submitterName: input.submitterName,
      submitterType: input.submitterType,
    };
    const next = [request, ...latest.current];
    latest.current = next;
    setRequests(next);
    return request;
  }, []);

  const commit = useCallback((next: ServiceRequest[]) => {
    latest.current = next;
    setRequests(next);
  }, []);

  const patch = useCallback((id: string, fn: (r: ServiceRequest, now: string) => ServiceRequest | string): RequestResult => {
    const current = latest.current.find((r) => r.id === id);
    if (!current) return { ok: false, error: 'This request no longer exists.' };
    const result = fn(current, new Date().toISOString());
    if (typeof result === 'string') return { ok: false, error: result };
    commit(latest.current.map((r) => (r.id === id ? result : r)));
    return { ok: true };
  }, [commit]);

  const assignRequest: RequestsValue['assignRequest'] = useCallback((id, team, _by) => patch(id, (r, now) => ({ ...r, assignedTo: team || undefined, updatedAt: now })), [patch]);

  const changeRequestStatus: RequestsValue['changeRequestStatus'] = useCallback((id, status, by, text) => patch(id, (r, now) => {
    const allowed = NEXT_STATUSES[r.kind][r.status] ?? [];
    if (!allowed.includes(status)) return `A request that is "${REQUEST_STATUS_LABELS[r.status]}" cannot be moved to "${REQUEST_STATUS_LABELS[status]}".`;
    const note = (text ?? '').trim();
    if (STATUS_NEEDS_TEXT.includes(status) && !note) {
      return status === 'more_info' ? 'Write the question or information you need from the requester.' : 'Write the reason for this decision. The requester will be able to read it.';
    }
    const next: ServiceRequest = { ...r, status, updatedAt: now, history: [...r.history, { status, at: now, by, note: note || undefined }] };
    if (status === 'more_info') next.replies = [...r.replies, { at: now, by, text: note }];
    return next;
  }), [patch]);

  const addRequestReply: RequestsValue['addRequestReply'] = useCallback((id, text, by, fromUser) => patch(id, (r, now) => {
    const t = text.trim();
    if (!t) return 'Write a message first.';
    if (t.length > 1000) return 'Please keep the message under 1000 characters.';
    const next: ServiceRequest = { ...r, replies: [...r.replies, { at: now, by, text: t, fromUser: fromUser || undefined }], updatedAt: now };
    // When the requester answers a question from staff, the request goes back to review.
    if (fromUser && r.status === 'more_info') {
      next.status = 'under_review';
      next.history = [...r.history, { status: 'under_review', at: now, by, note: 'The requester replied.' }];
    }
    return next;
  }), [patch]);

  const addInternalNote: RequestsValue['addInternalNote'] = useCallback((id, text, by) => patch(id, (r, now) => {
    const t = text.trim();
    if (!t) return 'Write a note first.';
    if (t.length > 1000) return 'Please keep the note under 1000 characters.';
    return { ...r, internalNotes: [...r.internalNotes, { at: now, by, text: t }], updatedAt: now };
  }), [patch]);

  const value = useMemo<RequestsValue>(
    () => ({ requests, warning, addRequest, assignRequest, changeRequestStatus, addRequestReply, addInternalNote }),
    [requests, warning, addRequest, assignRequest, changeRequestStatus, addRequestReply, addInternalNote],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRequests(): RequestsValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useRequests must be used inside RequestsProvider');
  return v;
}

/** Admin sees every request; a user sees only the requests they submitted. */
export function useVisibleRequests(): ServiceRequest[] {
  const { requests } = useRequests();
  const { session } = useAuth();
  return useMemo(() => {
    if (!session) return [];
    if (session.role === 'admin') return requests;
    const me = session.id.toLowerCase();
    return requests.filter((r) => r.submittedBy === me);
  }, [requests, session]);
}
