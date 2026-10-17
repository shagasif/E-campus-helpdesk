import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type Role = 'user' | 'admin';
export interface Profile { name?: string; userType?: 'student' | 'staff'; department?: string; photo?: string }
export interface Session extends Profile { role: Role; id: string }

const KEY = 'campus-issue-reporting:session:v1';

function readSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<Session>;
    if ((p.role === 'user' || p.role === 'admin') && typeof p.id === 'string' && p.id.trim()) return { role: p.role, id: p.id, name: typeof p.name === 'string' && p.name.trim() ? p.name : undefined, userType: p.userType === 'student' || p.userType === 'staff' ? p.userType : undefined, department: typeof p.department === 'string' && p.department.trim() ? p.department : undefined, photo: typeof p.photo === 'string' && p.photo ? p.photo : undefined };
  } catch {
    /* ignore damaged or blocked storage */
  }
  return null;
}

interface AuthValue {
  session: Session | null;
  login: (role: Role, id: string, profile?: Profile) => void;
  logout: () => void;
  updateProfile: (profile: Profile) => void;
}

const Ctx = createContext<AuthValue | null>(null);

/** Name shown in greetings: the saved full name, otherwise the part of the email before the @. */
export const displayName = (s: Session | null): string => (s ? s.name || s.id.split('@')[0] || s.id : '');

export const homePath = (role: Role) => (role === 'admin' ? '/admin' : '/user');

/** Front-end session only (stored in this browser). Accounts are checked on the login page. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(readSession);

  const login = useCallback((role: Role, id: string, profile?: Profile) => {
    const s: Session = { role, id: id.trim(), name: profile?.name?.trim() || undefined, userType: profile?.userType, department: profile?.department?.trim() || undefined, photo: profile?.photo || undefined };
    setSession(s);
    try { window.localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* still logged in for this visit */ }
  }, []);

  const logout = useCallback(() => {
    setSession(null);
    try { window.localStorage.removeItem(KEY); } catch { /* ignore */ }
  }, []);

  /** Updates the name / type / department / photo of the signed-in person (the saved account is updated by the caller). */
  const updateProfile = useCallback((profile: Profile) => {
    setSession((cur) => {
      if (!cur) return cur;
      const next: Session = { ...cur, name: profile.name?.trim() || undefined, userType: profile.userType, department: profile.department?.trim() || undefined, photo: profile.photo || undefined };
      try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* keep working in memory */ }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ session, login, logout, updateProfile }), [session, login, logout, updateProfile]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}

/** '/admin' or '/user' - the URL prefix for the signed-in role. */
export function useBase(): string {
  const { session } = useAuth();
  return session ? homePath(session.role) : '/login';
}
