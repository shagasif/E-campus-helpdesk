// Settings for help requests and formal applications.
// NOTE: the options below are placeholders for a prototype. University policies (leave types, certificates,
// processing rules) have to be confirmed with the university and edited here; nothing is approved automatically.

// Placeholder offices that help requests and applications can be assigned to (no real staff accounts exist yet).
export const REQUEST_TEAMS = ['Academic Support Desk', "Registrar's Office", 'Examinations Office', 'Finance and Scholarships Office', 'IT Helpdesk', 'HR Office', 'Administration Office'];

export interface HelpCategory { key: string; label: string }

export const HELP_CATEGORIES: HelpCategory[] = [
  { key: 'academic_support', label: 'Academic Support' },
  { key: 'registration_timetable', label: 'Course Registration and Timetable' },
  { key: 'exams_results', label: 'Exams and Results' },
  { key: 'records_portal', label: 'Student Records and University Portal' },
  { key: 'fees_scholarship', label: 'Fees and Scholarship Guidance' },
  { key: 'it_account', label: 'IT Account and Software Access' },
  { key: 'admin_assistance', label: 'Administrative Assistance' },
  { key: 'other_help', label: 'Other Help Requests' },
];

export type FieldType = 'text' | 'textarea' | 'select' | 'date';

export interface FormField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[]; // for select
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
}

export interface ApplicationType {
  key: string;
  label: string;
  hint: string;
  audience: 'all' | 'staff' | 'student';
  fields: FormField[];
}

export const LEAVE_TYPES = ['Annual leave', 'Sick leave', 'Casual leave', 'Emergency leave', 'Other (explain in the reason)'];

export const APPLICATION_TYPES: ApplicationType[] = [
  {
    key: 'staff_leave', label: 'Staff Leave Application', audience: 'staff',
    hint: 'Leave types are examples. Confirm the allowed types and approval rules with HR.',
    fields: [
      { key: 'leaveType', label: 'Leave type', type: 'select', required: true, options: LEAVE_TYPES },
      { key: 'startDate', label: 'Start date', type: 'date', required: true },
      { key: 'endDate', label: 'End date', type: 'date', required: true },
      { key: 'reason', label: 'Reason', type: 'textarea', required: true, minLength: 10, maxLength: 1000 },
    ],
  },
  {
    key: 'student_leave', label: 'Student Leave Application', audience: 'student',
    hint: 'Leave types are examples. Confirm the allowed types and approval rules with the university.',
    fields: [
      { key: 'leaveType', label: 'Leave type', type: 'select', required: true, options: LEAVE_TYPES },
      { key: 'startDate', label: 'Start date', type: 'date', required: true },
      { key: 'endDate', label: 'End date', type: 'date', required: true },
      { key: 'reason', label: 'Reason', type: 'textarea', required: true, minLength: 10, maxLength: 1000 },
    ],
  },
  {
    key: 'certificate', label: 'Certificate and Official Document Request', audience: 'all',
    hint: 'Certificate types are examples. Confirm which documents the university issues.',
    fields: [
      { key: 'certificateType', label: 'Certificate or document type', type: 'select', required: true, options: ['Enrolment / study certificate', 'Transcript', 'Degree copy', 'Experience letter', 'Employment letter', 'Other (explain in the purpose)'] },
      { key: 'idNumber', label: 'Student or employee ID number', type: 'text', required: true, maxLength: 40, placeholder: 'Your registration or staff number' },
      { key: 'purpose', label: 'Purpose', type: 'textarea', required: true, minLength: 10, maxLength: 500 },
    ],
  },
  {
    key: 'id_card', label: 'Student or Staff ID Card Request', audience: 'all',
    hint: 'Fees and photo requirements, if any, are set by the university.',
    fields: [
      { key: 'cardRequest', label: 'Request type', type: 'select', required: true, options: ['New ID card', 'Replacement (lost or damaged)', 'Update of details'] },
      { key: 'idNumber', label: 'Student or employee ID number', type: 'text', maxLength: 40 },
      { key: 'reason', label: 'Reason or details', type: 'textarea', required: true, minLength: 10, maxLength: 500 },
    ],
  },
  {
    key: 'equipment_access', label: 'Equipment or Access Request', audience: 'all',
    hint: 'Describe what you need and why. The responsible office decides whether it can be provided.',
    fields: [
      { key: 'accessType', label: 'What do you need?', type: 'select', required: true, options: ['Equipment', 'Software or system access', 'Room or building access', 'Other'] },
      { key: 'item', label: 'Item, system or place', type: 'text', required: true, maxLength: 100, placeholder: 'e.g. Laptop, Library database, Lab 2' },
      { key: 'neededBy', label: 'Needed by', type: 'date' },
      { key: 'justification', label: 'Why do you need it?', type: 'textarea', required: true, minLength: 10, maxLength: 800 },
    ],
  },
  {
    key: 'hr_query', label: 'HR and Employment Query', audience: 'staff',
    hint: 'For staff and faculty only.',
    fields: [
      { key: 'topic', label: 'Topic', type: 'select', required: true, options: ['Salary and payroll', 'Contract or appointment', 'Benefits', 'Other'] },
      { key: 'query', label: 'Your question', type: 'textarea', required: true, minLength: 10, maxLength: 1000 },
    ],
  },
  {
    key: 'other_admin', label: 'Other Administrative Application', audience: 'all',
    hint: 'Use this only when none of the other application types fits.',
    fields: [
      { key: 'subject', label: 'Subject', type: 'text', required: true, maxLength: 100 },
      { key: 'details', label: 'Details', type: 'textarea', required: true, minLength: 10, maxLength: 1000 },
    ],
  },
];

export function helpCategoryLabel(key: string): string {
  return HELP_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}
export function applicationType(key: string): ApplicationType | undefined {
  return APPLICATION_TYPES.find((t) => t.key === key);
}
export function requestCategoryLabel(kind: 'help' | 'application', key: string): string {
  return kind === 'help' ? helpCategoryLabel(key) : applicationType(key)?.label ?? key;
}

/** Application types shown to a person, based on whether they are a student or staff member (if known). */
export function applicationTypesFor(userType: string | undefined): ApplicationType[] {
  return APPLICATION_TYPES.filter((t) => t.audience === 'all' || !userType || t.audience === (userType === 'staff' ? 'staff' : 'student'));
}
