// Reads and writes to Supabase. Every function throws an Error with a readable message when the server says no.
// Row Level Security (supabase/schema.sql) decides what each person may see and change; this file only asks.
import type { Complaint } from '../types/complaint';
import type { ServiceRequest } from '../types/request';
import { setCloudDirectory, type Account, type UserType } from './accounts';
import { normalizeComplaint } from './complaintStorage';
import { normalizeRequest } from './requestStorage';
import { supabase } from './supabase';

type Row = Record<string, unknown>;

function db() {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

const iso = (x: unknown): string | undefined => (typeof x === 'string' && !Number.isNaN(Date.parse(x)) ? new Date(x).toISOString() : undefined);
const orNull = <T,>(x: T | undefined): T | null => (x === undefined || x === '' ? null : x);

// ---------- profile ----------
export interface MyProfile { id: string; email: string; role: 'user' | 'admin'; name?: string; userType?: UserType; department?: string; photo?: string; createdAt?: string }

function toProfile(r: Row): MyProfile {
  return {
    id: String(r.id),
    email: String(r.email ?? '').toLowerCase(),
    role: r.role === 'admin' ? 'admin' : 'user',
    name: typeof r.name === 'string' && r.name ? r.name : undefined,
    userType: r.user_type === 'student' || r.user_type === 'staff' ? r.user_type : undefined,
    department: typeof r.department === 'string' && r.department ? r.department : undefined,
    photo: typeof r.photo === 'string' && r.photo ? r.photo : undefined,
    createdAt: iso(r.created_at),
  };
}

/** The signed-in person's profile, or null when nobody is signed in. */
export async function fetchMyProfile(): Promise<MyProfile | null> {
  const { data: u } = await db().auth.getUser();
  if (!u.user) return null;
  const { data, error } = await db().from('profiles').select('*').eq('id', u.user.id).maybeSingle();
  fail(error);
  return data ? toProfile(data as Row) : null;
}

export async function saveMyProfile(patch: { name: string; userType?: UserType; department: string; photo?: string }): Promise<MyProfile> {
  const { data: u } = await db().auth.getUser();
  if (!u.user) throw new Error('You are not signed in.');
  const { data, error } = await db().from('profiles')
    .update({ name: patch.name.trim(), user_type: patch.userType ?? null, department: patch.department.trim(), photo: patch.photo ?? null })
    .eq('id', u.user.id).select('*').single();
  fail(error);
  return toProfile(data as Row);
}

/** Administrators only: every registered person. Used by the Users page and to show names next to emails. */
export async function fetchDirectory(): Promise<void> {
  const { data, error } = await db().from('profiles').select('*').order('created_at', { ascending: false });
  fail(error);
  const list: Account[] = (data as Row[])
    .map(toProfile)
    .filter((p) => p.role === 'user')
    .map((p) => ({ name: p.name ?? p.email, email: p.email, userType: p.userType ?? 'student', department: p.department ?? '', createdAt: p.createdAt ?? new Date(0).toISOString() }));
  setCloudDirectory(list);
}

// ---------- complaints ----------
function complaintFromRow(r: Row): Complaint | null {
  return normalizeComplaint({
    id: r.id, title: r.title, category: r.category, campus: r.campus, building: r.building, area: r.area, room: r.room,
    description: r.description, imageData: r.image_data, aiSummary: r.ai_summary, status: r.status, priority: r.priority,
    assignedTo: r.assigned_to, resolutionNote: r.resolution_note, resolvedAt: iso(r.resolved_at), resolvedBy: r.resolved_by,
    history: r.history, createdAt: iso(r.created_at), updatedAt: iso(r.updated_at), isDemo: r.is_demo === true, submittedBy: r.submitted_by,
  });
}

export async function fetchComplaints(): Promise<Complaint[]> {
  const { data, error } = await db().from('complaints').select('*').order('created_at', { ascending: false });
  fail(error);
  return (data as Row[]).map(complaintFromRow).filter((c): c is Complaint => c !== null);
}

export async function insertComplaint(c: Complaint): Promise<void> {
  const { error } = await db().from('complaints').insert({
    id: c.id, submitted_by: c.submittedBy ?? '', title: c.title, category: c.category, campus: orNull(c.campus), building: c.building,
    area: orNull(c.area), room: c.room, description: c.description, image_data: orNull(c.imageData), ai_summary: orNull(c.aiSummary),
    status: 'pending', priority: 'medium', history: c.history, created_at: c.createdAt,
  });
  fail(error);
}

/** Administrators: save status, priority, assignment and resolution. */
export async function saveComplaintAdmin(c: Complaint): Promise<void> {
  const { error } = await db().from('complaints').update({
    status: c.status, priority: c.priority, assigned_to: orNull(c.assignedTo), resolution_note: orNull(c.resolutionNote),
    resolved_at: orNull(c.resolvedAt), resolved_by: orNull(c.resolvedBy), history: c.history, updated_at: c.updatedAt ?? new Date().toISOString(),
  }).eq('id', c.id);
  fail(error);
}

export async function setAiSummaryRemote(id: string, summary: string): Promise<void> {
  const { error } = await db().rpc('set_complaint_ai_summary', { p_id: id, p_summary: summary });
  fail(error);
}

export async function reopenComplaintRemote(id: string, reason: string): Promise<void> {
  const { error } = await db().rpc('reopen_complaint', { p_id: id, p_reason: reason });
  fail(error);
}

// ---------- help requests and applications ----------
function requestFromRow(r: Row): ServiceRequest | null {
  const replies = (Array.isArray(r.request_replies) ? (r.request_replies as Row[]) : [])
    .map((x) => ({ at: iso(x.at) ?? '', by: String(x.by_name ?? ''), text: String(x.text ?? ''), fromUser: x.from_user === true ? true : undefined }))
    .filter((x) => x.at)
    .sort((a, b) => a.at.localeCompare(b.at));
  const notes = (Array.isArray(r.request_notes) ? (r.request_notes as Row[]) : [])
    .map((x) => ({ at: iso(x.at) ?? '', by: String(x.by_name ?? ''), text: String(x.text ?? '') }))
    .filter((x) => x.at)
    .sort((a, b) => a.at.localeCompare(b.at));
  return normalizeRequest({
    id: r.id, kind: r.kind, title: r.title, category: r.category, department: r.department, description: r.description,
    details: r.details, status: r.status, history: r.history, replies, internalNotes: notes, assignedTo: r.assigned_to,
    createdAt: iso(r.created_at), updatedAt: iso(r.updated_at), submittedBy: r.submitted_by, submitterName: r.submitter_name, submitterType: r.submitter_type,
  });
}

export async function fetchRequests(): Promise<ServiceRequest[]> {
  // request_notes comes back empty for normal users: Row Level Security allows administrators only.
  const { data, error } = await db().from('requests').select('*, request_replies(*), request_notes(*)').order('created_at', { ascending: false });
  fail(error);
  return (data as Row[]).map(requestFromRow).filter((r): r is ServiceRequest => r !== null);
}

export async function insertRequest(r: ServiceRequest): Promise<void> {
  const { error } = await db().from('requests').insert({
    id: r.id, submitted_by: r.submittedBy, submitter_name: orNull(r.submitterName), submitter_type: orNull(r.submitterType), kind: r.kind,
    title: r.title, category: r.category, department: orNull(r.department), description: r.description, details: r.details,
    status: 'submitted', history: r.history, created_at: r.createdAt,
  });
  fail(error);
}

/** Administrators: save status, history and assignment. */
export async function saveRequestAdmin(r: ServiceRequest): Promise<void> {
  const { error } = await db().from('requests').update({
    status: r.status, history: r.history, assigned_to: orNull(r.assignedTo), updated_at: r.updatedAt ?? new Date().toISOString(),
  }).eq('id', r.id);
  fail(error);
}

export async function insertReplyAdmin(requestId: string, by: string, text: string): Promise<void> {
  const { error } = await db().from('request_replies').insert({ request_id: requestId, by_name: by, text, from_user: false });
  fail(error);
}

export async function insertNote(requestId: string, by: string, text: string): Promise<void> {
  const { error } = await db().from('request_notes').insert({ request_id: requestId, by_name: by, text });
  fail(error);
}

export async function addUserReplyRemote(requestId: string, text: string): Promise<void> {
  const { error } = await db().rpc('add_user_reply', { p_id: requestId, p_text: text });
  fail(error);
}
