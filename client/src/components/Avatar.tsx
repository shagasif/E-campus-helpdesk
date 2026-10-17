import type { Session } from '../context/AuthContext';
import { displayName } from '../context/AuthContext';

/** Round profile picture, or the first letter of the name when there is no photo. */
export function Avatar({ session, size = 34 }: { session: Session | null; size?: number }) {
  const photo = session?.photo;
  return (
    <span
      className={`avatar${photo ? ' has-photo' : ''}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42), backgroundImage: photo ? `url(${photo})` : undefined }}
      aria-hidden="true"
    >
      {photo ? '' : displayName(session).charAt(0).toUpperCase()}
    </span>
  );
}
