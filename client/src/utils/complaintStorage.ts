import { CATEGORIES, LEGACY_CATEGORY_MAP, PRIORITIES, STATUSES, type Complaint, type Status, type StatusEvent } from '../types/complaint';
import { shortText } from './format';
import { SAMPLE_COUNT } from './demoData';

const KEY = 'campus-issue-reporting:complaints:v1';

export interface LoadResult {
  complaints: Complaint[];
  isFirstRun: boolean; // nothing stored yet
  reseedDemo: boolean; // old-format sample records were dropped; add the new sample set
  warning?: string;
}

const str = (x: unknown): string | undefined => (typeof x === 'string' && x ? x : undefined);
const isDate = (x: unknown): x is string => typeof x === 'string' && !Number.isNaN(Date.parse(x));

function validEvent(e: unknown): e is StatusEvent {
  if (typeof e !== 'object' || e === null) return false;
  const v = e as Record<string, unknown>;
  return STATUSES.includes(v.status as never) && isDate(v.at);
}

/** Accepts records saved by older versions and fills in the new fields. */
function normalize(x: unknown): Complaint | null {
  if (typeof x !== 'object' || x === null) return null;
  const c = x as Record<string, unknown>;
  if (typeof c.id !== 'string' || typeof c.description !== 'string' || !isDate(c.createdAt)) return null;
  const category = typeof c.category === 'string' ? (LEGACY_CATEGORY_MAP[c.category] ?? c.category) : c.category;
  if (!CATEGORIES.includes(category as never) || !STATUSES.includes(c.status as never)) return null;
  const status = c.status as Status;
  const createdAt = c.createdAt;
  const resolvedAt = isDate(c.resolvedAt) ? c.resolvedAt : undefined;
  let history: StatusEvent[] = Array.isArray(c.history) ? c.history.filter(validEvent) : [];
  if (history.length === 0) {
    history = [{ status: 'pending', at: createdAt }];
    if (status !== 'pending') history.push({ status, at: resolvedAt ?? createdAt });
  }
  const isDemo = c.isDemo === true;
  return {
    id: isDemo && c.id.startsWith('DEMO-') ? c.id.replace('DEMO-', 'SAMPLE-') : c.id, // older sample IDs are renamed
    title: str(c.title)?.trim() || shortText(c.description, 60),
    category: category as Complaint['category'],
    building: str(c.building) ?? '',
    room: str(c.room) ?? '',
    description: c.description,
    imageData: str(c.imageData),
    aiSummary: str(c.aiSummary),
    status,
    priority: PRIORITIES.includes(c.priority as never) ? (c.priority as Complaint['priority']) : 'medium',
    assignedTo: str(c.assignedTo),
    resolutionNote: str(c.resolutionNote),
    resolvedAt,
    resolvedBy: str(c.resolvedBy),
    history,
    createdAt,
    updatedAt: isDate(c.updatedAt) ? c.updatedAt : undefined,
    isDemo: isDemo ? true : undefined,
    submittedBy: str(c.submittedBy),
  };
}

export function loadComplaints(): LoadResult {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return {
      complaints: [],
      isFirstRun: true,
      reseedDemo: false,
      warning: 'Browser storage is unavailable, so complaints will not be saved after you close or refresh this page.',
    };
  }
  if (raw === null) return { complaints: [], isFirstRun: true, reseedDemo: false };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('not an array');
    // Sample records from an older version (no "title", or a different number of samples) are replaced by the current sample set.
    const isSample = (p: unknown) => (p as { isDemo?: boolean })?.isDemo === true;
    const samples = parsed.filter(isSample);
    const outdated = samples.length > 0 && (samples.length !== SAMPLE_COUNT || samples.some((p) => typeof (p as { title?: unknown }).title !== 'string'));
    const kept = outdated ? parsed.filter((p) => !isSample(p)) : parsed;
    const valid = kept.map(normalize).filter((c): c is Complaint => c !== null);
    const skipped = kept.length - valid.length;
    return {
      complaints: valid,
      isFirstRun: false,
      reseedDemo: outdated,
      warning: skipped > 0 ? `${skipped} saved complaint(s) were damaged and could not be loaded.` : undefined,
    };
  } catch {
    return {
      complaints: [],
      isFirstRun: false,
      reseedDemo: false,
      warning: 'Saved complaint data was damaged and could not be read. Starting with an empty list; the next change will overwrite it.',
    };
  }
}

/** Returns an error message, or null when the save worked. */
export function saveComplaints(complaints: Complaint[]): string | null {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(complaints));
    return null;
  } catch {
    return 'Could not save to browser storage (it may be full or blocked). Your changes will be lost when you refresh. Try removing pictures or sample data.';
  }
}