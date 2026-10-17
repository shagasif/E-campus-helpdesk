import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Category, Complaint, Priority, Status } from '../types/complaint';
import { loadComplaints, saveComplaints } from '../utils/complaintStorage';
import { makeDemoComplaints } from '../utils/demoData';
import { useAuth } from './AuthContext';

export interface ComplaintPatch {
  status?: Status;
  priority?: Priority;
  assignedTo?: string | null; // null = unassign
  resolutionNote?: string;
}
export type UpdateResult = { ok: true } | { ok: false; error: string };

interface ComplaintsValue {
  complaints: Complaint[]; // the single source of truth
  warning: string | null; // storage warning, if any
  hasDemo: boolean;
  addComplaint: (input: { title: string; category: Category; building: string; room: string; description: string; imageData?: string; aiSummary?: string; submittedBy?: string }) => Complaint;
  updateComplaint: (id: string, patch: ComplaintPatch, by: string) => UpdateResult;
  setAiSummary: (id: string, summary: string) => void;
  removeDemoData: () => void;
}

const Ctx = createContext<ComplaintsValue | null>(null);

function makeReference(existing: Complaint[]): string {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id: string;
  do {
    const rand = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    id = `CIR-${date}-${rand}`;
  } while (existing.some((c) => c.id === id));
  return id;
}

export function ComplaintsProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(() => {
    const result = loadComplaints();
    const list = result.isFirstRun || result.reseedDemo ? [...result.complaints, ...makeDemoComplaints()] : result.complaints;
    return { complaints: list, warning: result.warning ?? null };
  });
  const [complaints, setComplaints] = useState<Complaint[]>(initial.complaints);
  const [warning, setWarning] = useState<string | null>(initial.warning);
  const latest = useRef(complaints);
  latest.current = complaints;

  // Save every change to localStorage.
  useEffect(() => {
    const err = saveComplaints(complaints);
    setWarning((prev) => err ?? (prev && prev.startsWith('Could not save') ? null : prev));
  }, [complaints]);

  const commit = useCallback((next: Complaint[]) => {
    latest.current = next;
    setComplaints(next);
  }, []);

  const addComplaint: ComplaintsValue['addComplaint'] = useCallback((input) => {
    const now = new Date().toISOString();
    const complaint: Complaint = {
      id: makeReference(latest.current),
      title: input.title.trim(),
      category: input.category,
      building: input.building.trim(),
      room: input.room.trim(),
      description: input.description.trim(),
      imageData: input.imageData,
      aiSummary: input.aiSummary,
      submittedBy: input.submittedBy,
      status: 'pending',
      priority: 'medium', // admins can change this
      history: [{ status: 'pending', at: now }],
      createdAt: now,
    };
    commit([complaint, ...latest.current]);
    return complaint;
  }, [commit]);

  const updateComplaint: ComplaintsValue['updateComplaint'] = useCallback((id, patch, by) => {
    const current = latest.current.find((c) => c.id === id);
    if (!current) return { ok: false, error: 'This complaint no longer exists.' };
    const now = new Date().toISOString();
    const status = patch.status ?? current.status;
    const note = patch.resolutionNote !== undefined ? patch.resolutionNote.trim() : current.resolutionNote ?? '';
    if (status === 'resolved' && !note) return { ok: false, error: 'Add a resolution note before marking this complaint as Resolved.' };

    const next: Complaint = {
      ...current,
      status,
      priority: patch.priority ?? current.priority,
      assignedTo: patch.assignedTo === undefined ? current.assignedTo : patch.assignedTo || undefined,
      resolutionNote: note || undefined,
      updatedAt: now,
    };
    if (status !== current.status) {
      next.history = [...current.history, { status, at: now, by, note: status === 'resolved' ? note : undefined }];
      if (status === 'resolved') {
        next.resolvedAt = now; // resolution timestamp
        next.resolvedBy = by;
      } else {
        next.resolvedAt = undefined;
        next.resolvedBy = undefined;
      }
    } else if (status === 'resolved' && note !== (current.resolutionNote ?? '')) {
      next.history = current.history.map((e, i, a) => (i === a.length - 1 && e.status === 'resolved' ? { ...e, note } : e));
    }
    commit(latest.current.map((c) => (c.id === id ? next : c)));
    return { ok: true };
  }, [commit]);

  const setAiSummary = useCallback((id: string, summary: string) => {
    commit(latest.current.map((c) => (c.id === id ? { ...c, aiSummary: summary } : c)));
  }, [commit]);

  const removeDemoData = useCallback(() => {
    commit(latest.current.filter((c) => !c.isDemo));
  }, [commit]);

  const value = useMemo<ComplaintsValue>(
    () => ({ complaints, warning, hasDemo: complaints.some((c) => c.isDemo), addComplaint, updateComplaint, setAiSummary, removeDemoData }),
    [complaints, warning, addComplaint, updateComplaint, setAiSummary, removeDemoData],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useComplaints(): ComplaintsValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useComplaints must be used inside ComplaintsProvider');
  return v;
}

/** Admin sees every complaint; a user sees only the complaints they submitted. */
export function useVisibleComplaints(): Complaint[] {
  const { complaints } = useComplaints();
  const { session } = useAuth();
  return useMemo(() => {
    if (!session) return [];
    if (session.role === 'admin') return complaints;
    const me = session.id.toLowerCase();
    return complaints.filter((c) => c.submittedBy === me);
  }, [complaints, session]);
}
