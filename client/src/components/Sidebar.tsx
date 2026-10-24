import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Icon, type IconName } from './Icon';
import { displayName, useAuth, useBase } from '../context/AuthContext';
import { USER_TYPE_LABELS } from '../utils/accounts';
import { Avatar } from './Avatar';
import { useTheme } from '../context/ThemeContext';

type L = { to: string; label: string; short?: string; icon: IconName; end?: boolean };

/** Slim dark sidebar on desktop, bottom bar on phones (switched with CSS). */
export function Sidebar() {
  const { session, logout } = useAuth();
  const base = useBase();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { theme, toggle } = useTheme();

  // On phones the navigation is a side drawer: close it after navigating or with Escape.
  useEffect(() => { setOpen(false); setMenu(false); }, [location.pathname]);
  // The user menu closes on outside click or Escape.
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [menu]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
  const isAdmin = session?.role === 'admin';

  const links: L[] = isAdmin
    ? [
        { to: base, label: 'Dashboard', short: 'Home', icon: 'dashboard', end: true },
        { to: `${base}/requests`, label: 'All Requests', short: 'All', icon: 'inbox' },
        { to: `${base}/complaints`, label: 'Complaints & Issues', short: 'Issues', icon: 'alert' },
        { to: `${base}/help`, label: 'Help Requests', short: 'Help', icon: 'help' },
        { to: `${base}/applications`, label: 'Applications', short: 'Apply', icon: 'clipboard' },
        { to: `${base}/users`, label: 'Users', icon: 'users' },
        { to: `${base}/teams`, label: 'Teams', icon: 'building' },
        { to: `${base}/reports`, label: 'Reports & Analytics', short: 'Reports', icon: 'trend' },
      ]
    : [
        { to: base, label: 'Dashboard', short: 'Home', icon: 'dashboard', end: true },
        { to: `${base}/report`, label: 'Report a Problem', short: 'Report', icon: 'alert' },
        { to: `${base}/help`, label: 'Request Help', short: 'Help', icon: 'help' },
        { to: `${base}/applications`, label: 'Applications & Services', short: 'Apply', icon: 'clipboard' },
        { to: `${base}/requests`, label: 'My Requests', short: 'Requests', icon: 'list' },
      ];

  return (
    <>
    <header className="topbar">
      <button type="button" className="icon-btn" aria-label="Open menu" aria-expanded={open} aria-controls="side-nav" onClick={() => setOpen(true)}><Icon name="menu" size={22} /></button>
      <span className="brand-mark" aria-hidden="true"><Icon name="campus" size={18} /></span>
      <span className="topbar-title">E-Campus Helpdesk</span>
    </header>
    <div className={`nav-backdrop${open ? ' show' : ''}`} onClick={() => setOpen(false)} aria-hidden="true" />
    <nav id="side-nav" className={`sidebar${open ? ' open' : ''}`} aria-label="Main navigation">
      <button type="button" className="icon-btn sidebar-close" aria-label="Close menu" onClick={() => setOpen(false)}><Icon name="x" size={20} /></button>
      <div className="brand">
        <span className="brand-mark" aria-hidden="true"><Icon name="campus" size={22} /></span>
        <span className="brand-text">E-Campus Helpdesk</span>
      </div>
      <ul className={links.length > 6 ? 'nav-many' : undefined}>
        {links.map((l) => (
          <li key={l.to}>
            <NavLink to={l.to} end={l.end} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              <Icon name={l.icon} />
              <span className="nav-long">{l.label}</span>
              <span className="nav-short">{l.short ?? l.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="sidebar-footer" ref={menuRef}>
        {menu && (
          <div className="user-menu" role="menu" aria-label="Account menu">
            <NavLink to={`${base}/profile`} className="um-item" role="menuitem" onClick={() => setMenu(false)}><Icon name="user" size={17} /><span>Profile</span></NavLink>
            <NavLink to={isAdmin ? `${base}/settings` : `${base}/profile`} className="um-item" role="menuitem" onClick={() => setMenu(false)}><Icon name="settings" size={17} /><span>Settings</span></NavLink>
            <button type="button" className="um-item" role="menuitem" onClick={() => { toggle(); setMenu(false); }}><Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} /><span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span></button>
            <button type="button" className="um-item um-danger" role="menuitem" onClick={() => { setMenu(false); logout(); navigate('/login', { replace: true }); }}><Icon name="logout" size={17} /><span>Sign out</span></button>
          </div>
        )}
        <button type="button" className={`user-chip user-btn${menu ? ' on' : ''}`} aria-haspopup="menu" aria-expanded={menu} aria-label="Open account menu" onClick={() => setMenu((v) => !v)}>
          <Avatar session={session} />
          <div className="chip-text">
            <strong>{displayName(session)}</strong>
            <span className="small">{isAdmin ? 'Administrator' : session?.userType ? `${USER_TYPE_LABELS[session.userType]}${session.department ? ` · ${session.department}` : ''}` : 'User'}</span>
          </div>
          <Icon name="chevup" size={16} className="um-caret" />
        </button>
      </div>
    </nav>
    </>
  );
}
