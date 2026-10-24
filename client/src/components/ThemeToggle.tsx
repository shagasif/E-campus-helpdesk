import { Icon } from './Icon';
import { useTheme } from '../context/ThemeContext';

/** variant "nav" sits in the sidebar; "float" is a small round button for the login page. */
export function ThemeToggle({ variant = 'nav' }: { variant?: 'nav' | 'float' | 'icon' }) {
  const { theme, toggle } = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  if (variant === 'icon') {
    return <button type="button" className="icon-btn" onClick={toggle} aria-label={`Switch to ${next} mode`}><Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} /></button>;
  }
  if (variant === 'float') {
    return <button type="button" className="icon-btn theme-float" onClick={toggle} aria-label={`Switch to ${next} mode`}><Icon name={theme === 'dark' ? 'sun' : 'moon'} size={20} /></button>;
  }
  return (
    <button type="button" className="nav-link" onClick={toggle}>
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
      <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
    </button>
  );
}
