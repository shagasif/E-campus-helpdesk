export type Category =
  | 'computer_hardware' | 'projector_av' | 'internet_network' | 'electrical' | 'building_maintenance'
  | 'water_plumbing' | 'cleanliness_sanitation' | 'canteen' | 'furniture_classroom' | 'parking_transport'
  | 'safety_security' | 'other';
export type Status = 'pending' | 'in_progress' | 'resolved';
export type Priority = 'low' | 'medium' | 'high';

export interface StatusEvent {
  status: Status;
  at: string; // ISO date-time
  by?: string; // who made the change (admin username)
  note?: string; // resolution note saved with a "resolved" event
}

export interface Complaint {
  id: string; // the complaint reference, e.g. CIR-20261012-K7Q2
  title: string;
  category: Category;
  campus?: string; // optional: which campus
  building: string;
  area?: string; // optional: affected area or department
  room: string;
  description: string; // original text, never changed by the AI feature
  imageData?: string; // browser-local image (data URL)
  aiSummary?: string; // optional AI-suggested summary
  status: Status;
  priority: Priority;
  assignedTo?: string; // staff team
  resolutionNote?: string;
  resolvedAt?: string; // ISO date-time, set when status becomes Resolved
  resolvedBy?: string;
  history: StatusEvent[]; // status timeline
  createdAt: string;
  updatedAt?: string;
  isDemo?: boolean; // true for the labelled sample records
  submittedBy?: string; // lower-case username of the reporter
}

export const CATEGORIES: Category[] = [
  'computer_hardware', 'projector_av', 'internet_network', 'electrical', 'building_maintenance',
  'water_plumbing', 'cleanliness_sanitation', 'canteen', 'furniture_classroom', 'parking_transport',
  'safety_security', 'other',
];
export const STATUSES: Status[] = ['pending', 'in_progress', 'resolved'];
export const PRIORITIES: Priority[] = ['low', 'medium', 'high'];

export const CATEGORY_LABELS: Record<Category, string> = {
  computer_hardware: 'Computer and IT Equipment',
  projector_av: 'Projector and Classroom Equipment',
  internet_network: 'Wi-Fi and Internet',
  electrical: 'Electricity, Fans and Lights',
  building_maintenance: 'Building and Maintenance',
  water_plumbing: 'Water Supply and Plumbing',
  cleanliness_sanitation: 'Washrooms and Cleanliness',
  canteen: 'Canteen and Cafeteria',
  furniture_classroom: 'Furniture and Classroom Facilities',
  parking_transport: 'Parking and Transport',
  safety_security: 'Safety and Security',
  other: 'Other Campus Problems',
};

// Complaints saved with an older category list are moved to the matching new category when they are loaded.
export const LEGACY_CATEGORY_MAP: Record<string, Category> = {
  computer: 'computer_hardware', projector: 'projector_av', wifi: 'internet_network', light: 'electrical', fan: 'electrical',
  ac_ventilation: 'electrical',
};
export const STATUS_LABELS: Record<Status, string> = { pending: 'Pending', in_progress: 'In Progress', resolved: 'Resolved' };
export const PRIORITY_LABELS: Record<Priority, string> = { low: 'Low', medium: 'Medium', high: 'High' };

// Demo staff teams for the "assign" action (no real staff accounts exist in this prototype).
export const STAFF_TEAMS = ['IT Support', 'Network Team', 'Electrical Team', 'AV / Classroom Tech', 'Facilities & Maintenance'];

export const locationText = (c: Pick<Complaint, 'building' | 'room'>) => [c.building, c.room].filter(Boolean).join(', ') || '—';
