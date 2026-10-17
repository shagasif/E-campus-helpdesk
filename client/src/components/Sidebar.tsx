import { NavLink, useNavigate } from 'react-router-dom';
import { Icon, type IconName } from './Icon';
import { displayName, useAuth, useBase } from '../context/AuthContext';
import { USER_TYPE_LABELS } from '../utils/accounts';
import { Avatar } from './Avatar';

type L = { to: string; label: string; icon: IconName; end?: boolean };

/** Slim maroon sidebar on desktop, bottom bar on phones (switched with CSS). */
export function Sidebar() {
  const { session, logout } = useAuth();
  const base = useBase();
  const navigate = useNavigate();
  const isAdmin = session?.role === 'admin';

  const links: L[] = isAdmin
    ? [
        { to: base, label: 'Dashboard', icon: 'dashboard', end: true },
        { to: `${base}/complaints`, label: 'Complaints', icon: 'list' },
      ]
    : [
        { to: base, label: 'Dashboard', icon: 'dashboard', end: true },
        { to: `${base}/report`, label: 'Report an Issue', icon: 'plus' },
        { to: `${base}/complaints`, label: 'My Complaints', icon: 'list' },
      ];

  return (
    <nav className="sidebar" aria-label="Main navigation">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true"><Icon name="headset" size={22} /></span>
        <span className="brand-text">E-Campus Helpdesk</span>
      </div>
      <ul>
        {links.map((l) => (
          <li key={l.to}>
            <NavLink to={l.to} end={l.end} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              <Icon name={l.icon} />
              <span>{l.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="sidebar-footer">
        <NavLink to={`${base}/profile`} className="user-chip" aria-label="Open my profile">
          <Avatar session={session} />
          <div className="chip-text">
            <strong>{displayName(session)}</strong>
            <span className="small">{isAdmin ? 'Administrator' : session?.userType ? `${USER_TYPE_LABELS[session.userType]}${session.department ? ` · ${session.department}` : ''}` : 'User'}</span>
          </div>
        </NavLink>
        <button type="button" className="nav-link nav-signout" onClick={() => { logout(); navigate('/login', { replace: true }); }}>
          <Icon name="logout" />
          <span>Sign out</span>
        </button>
      </div>
    </nav>
  );
}
