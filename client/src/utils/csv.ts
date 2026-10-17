import { CATEGORY_LABELS, PRIORITY_LABELS, STATUS_LABELS, type Complaint } from '../types/complaint';

// Cells that start with = + - @ can be run as formulas in Excel, so they get a leading apostrophe.
function cell(v: unknown): string {
  const s = String(v ?? '');
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

const HEADERS = ['Complaint ID', 'Title', 'Category', 'Building', 'Room / Location', 'Description', 'Status', 'Priority', 'Assigned To', 'Reported By', 'Submitted At', 'Resolved At', 'Resolved By', 'Resolution Note'];

export function complaintsToCsv(list: Complaint[]): string {
  const rows = list.map((c) => [
    c.id, c.title, CATEGORY_LABELS[c.category], c.building, c.room, c.description, STATUS_LABELS[c.status], PRIORITY_LABELS[c.priority],
    c.assignedTo ?? '', c.submittedBy ?? '', c.createdAt, c.resolvedAt ?? '', c.resolvedBy ?? '', c.resolutionNote ?? '',
  ]);
  return '\uFEFF' + [HEADERS, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
}

export function downloadCsv(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
