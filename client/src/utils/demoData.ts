import type { Category, Complaint, Priority, Status } from '../types/complaint';

const DAY = 86_400_000;
export const DEMO_COUNT = 7; // number of labelled sample complaints

// [category, title, description]
const TEMPLATES: [Category, string, string][] = [
  ['computer_hardware', 'Lab computer shuts down repeatedly', 'The computer switches off repeatedly while students are using it.'],
  ['computer_hardware', 'Keyboard and mouse not responding', 'The keyboard and mouse stop responding on several machines.'],
  ['projector_av', 'Projector image is blurry', 'The projected image is blurry and the focus cannot be adjusted.'],
  ['projector_av', 'Classroom microphone not working', 'The microphone and speakers give no sound during lectures.'],
  ['internet_network', 'Wi-Fi keeps disconnecting', 'Wi-Fi disconnects every few minutes in this area.'],
  ['internet_network', 'No internet in the lab', 'There is no internet connection on the lab computers.'],
  ['electrical', 'Tube lights not working', 'Two tube lights are not working and the area is dark.'],
  ['electrical', 'Power socket not working', 'The power socket near the desk has no electricity.'],
  ['water_plumbing', 'Water tap leaking in washroom', 'The tap keeps dripping and water collects on the floor.'],
  ['electrical', 'Ceiling fan makes a loud noise', 'The ceiling fan makes a loud rattling noise at medium speed.'],
  ['furniture_classroom', 'Broken chair in classroom', 'One of the chairs has a broken leg and is unsafe to use.'],
  ['furniture_classroom', 'Whiteboard surface damaged', 'The whiteboard is scratched and the marker will not wipe off.'],
  ['building_maintenance', 'Water leaking from ceiling', 'Water drips from the ceiling when it rains.'],
  ['building_maintenance', 'Door lock is stuck', 'The classroom door lock is stuck and the door cannot be locked.'],
  ['cleanliness_sanitation', 'Washroom needs cleaning', 'The washroom has not been cleaned and needs urgent attention.'],
  ['canteen', 'Dustbins overflowing at the cafeteria', 'The dustbins near the cafeteria are overflowing.'],
  ['parking_transport', 'Parking area light not working', 'The parking area is dark in the evening because a light is out.'],
  ['safety_security', 'Fire extinguisher missing', 'The fire extinguisher is missing from its stand in the corridor.'],
  ['other', 'Notice board needs to be moved', 'The notice board blocks the corridor and should be moved.'],
];
const PLACES: [string, string][] = [['Block A', 'Room 101'], ['Block B', 'Lab 2'], ['Library', '2nd Floor'], ['Block C', 'Seminar Hall'], ['Block A', 'Room 14'], ['Block B', 'Room 305']];
const TEAM: Record<Category, string> = {
  computer_hardware: 'IT Support', projector_av: 'AV / Classroom Tech', internet_network: 'Network Team', electrical: 'Electrical Team',
  building_maintenance: 'Facilities & Maintenance', water_plumbing: 'Facilities & Maintenance', cleanliness_sanitation: 'Facilities & Maintenance',
  canteen: 'Facilities & Maintenance', furniture_classroom: 'Facilities & Maintenance', parking_transport: 'Facilities & Maintenance',
  safety_security: 'Facilities & Maintenance', other: 'Facilities & Maintenance',
};
const PRIORITY_CYCLE: Priority[] = ['high', 'medium', 'low', 'medium', 'high', 'medium', 'low'];

/** Clearly-labelled SAMPLE records so the dashboards have something to show. They are not real campus reports. */
export function makeDemoComplaints(): Complaint[] {
  const now = Date.now();
  return Array.from({ length: DEMO_COUNT }, (_, i) => {
    const [category, title, description] = TEMPLATES[(i * 5) % TEMPLATES.length];
    const [building, room] = PLACES[i % PLACES.length];
    const ageDays = i < 6 ? i * 0.7 + 0.2 : i * 5.6 + 1;
    const createdAt = new Date(now - ageDays * DAY).toISOString();
    let status: Status = (['pending', 'in_progress', 'resolved', 'resolved'] as Status[])[i % 4];
    if (ageDays > 60) status = i % 6 === 0 ? 'in_progress' : 'resolved';
    if (ageDays < 1) status = 'pending';
    const at = (hours: number) => new Date(Math.min(now, Date.parse(createdAt) + hours * 3_600_000)).toISOString();
    const history: Complaint['history'] = [{ status: 'pending', at: createdAt }];
    let resolvedAt: string | undefined;
    let resolutionNote: string | undefined;
    if (status !== 'pending') history.push({ status: 'in_progress', at: at(5), by: 'Sample admin' });
    if (status === 'resolved') {
      resolvedAt = at(30 + (i % 3) * 20);
      resolutionNote = 'Inspected and fixed by the assigned team. Confirmed working afterwards.';
      history.push({ status: 'resolved', at: resolvedAt, by: 'Sample admin', note: resolutionNote });
    }
    return {
      id: `SAMPLE-${String(i + 1).padStart(4, '0')}`,
      title,
      category,
      building,
      room,
      description: `${description} (${building}, ${room})`,
      status,
      priority: PRIORITY_CYCLE[i % PRIORITY_CYCLE.length],
      assignedTo: status === 'pending' ? undefined : TEAM[category],
      resolutionNote,
      resolvedAt,
      resolvedBy: resolvedAt ? 'Sample admin' : undefined,
      history,
      createdAt,
      isDemo: true,
    };
  });
}
