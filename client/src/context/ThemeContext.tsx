import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Theme = 'dark' | 'light';
const KEY = 'campus-issue-reporting:theme:v2';

function readTheme(): Theme {
  try {
    const v = window.localStorage.getItem(KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch { /* storage can be blocked; fall back to the default */ }
  return 'light';
}

interface ThemeValue { theme: Theme; toggle: () => void }
const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(readTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { window.localStorage.setItem(KEY, theme); } catch { /* ignore */ }
  }, [theme]);

  const toggle = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);
  const value = useMemo(() => ({ theme, toggle }), [theme, toggle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}

/** Hex colours for the charts (SVG attributes cannot read CSS variables reliably). */
export function chartColors(theme: Theme) {
  return theme === 'dark'
    ? { primary: '#89D9F2', resolved: '#4ADE80', grid: '#323232', axis: '#A3A3A8', label: '#E5E5E5', surface: '#232323', border: '#454545', status: { pending: '#F5B54A', in_progress: '#6AA9F5', resolved: '#4ADE80' } }
    : { primary: '#0B6B86', resolved: '#15803D', grid: '#E1E6E9', axis: '#5A656D', label: '#374151', surface: '#FFFFFF', border: '#CBD3D8', status: { pending: '#B45309', in_progress: '#1D6FB8', resolved: '#15803D' } };
}
