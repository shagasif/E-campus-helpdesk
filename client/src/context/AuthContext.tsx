import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { fetchMyProfile } from '../utils/cloud';
import { signOutEverywhere } from '../utils/authApi';
import { cloudEnabled, supabase } from '../utils/supabase';

export type Role = 'user' | 'admin';
export interface Profile { name?: string; userType?: 'student' | 'staff'; department?: string; photo?: string; createdAt?: string }
export interface Session extends Profile { role: Role; id: string }

const KEY = 'campus-issue-reporting:session:v1';

function readSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<Session>;
    if ((p.role === 'user' || p.role === 'admin') && typeof p.id === 'string' && p.id.trim()) return { role: p.role, id: p.id, name: typeof p.name === 'string' && p.name.trim() ? p.name : undefined, userType: p.userType === 'student' || p.userType === 'staff' ? p.userType : undefined, department: typeof p.department === 'string' && p.department.trim() ? p.department : undefined, photo: typeof p.photo === 'string' && p.photo ? p.photo : undefined, createdAt: typeof p.createdAt === 'string' && p.createdAt ? p.createdAt : undefined };
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
  /** True while the person has opened a password-reset link from their e-mail and still has to choose a new password. */
  recovery: boolean;
  clearRecovery: () => void;
}

const Ctx = createContext<AuthValue | null>(null);

/** Name shown in greetings: the saved full name, otherwise the part of the email before the @. */
export const displayName = (s: Session | null): string => (s ? s.name || s.id.split('@')[0] || s.id : '');

export const homePath = (role: Role) => (role === 'admin' ? '/admin' : '/user');

/** Front-end session only (stored in this browser). Accounts are checked on the login page. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(readSession);

  const login = useCallback((role: Role, id: string, profile?: Profile) => {
    const s: Session = { role, id: id.trim(), name: profile?.name?.trim() || undefined, userType: profile?.userType, department: profile?.department?.trim() || undefined, photo: profile?.photo || undefined, createdAt: profile?.createdAt };
    setSession(s);
    try { window.localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* still logged in for this visit */ }
  }, []);

  const logout = useCallback(() => {
    setSession(null);
    try { window.localStorage.removeItem(KEY); } catch { /* ignore */ }
    void signOutEverywhere();
  }, []);

  // ---- Supabase: keep the page's session in step with the real one ----
  const [recovery, setRecovery] = useState(() => cloudEnabled && /type=recovery/.test(`${window.location.hash}${window.location.search}`));
  const recoveryRef = useRef(recovery);
  recoveryRef.current = recovery;

  const clearRecovery = useCallback(() => {
    setRecovery(false);
    recoveryRef.current = false;
    if (window.location.hash || window.location.search) window.history.replaceState(null, '', window.location.pathname);
    void signOutEverywhere();
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let dead = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (dead) return;
      if (!data.session) {
        // A saved login from before Supabase was turned on (or an expired one) is no longer valid.
        setSession(null);
        try { window.localStorage.removeItem(KEY); } catch { /* ignore */ }
        return;
      }
      if (recoveryRef.current) return; // choosing a new password: do not open the dashboard yet
      try {
        const p = await fetchMyProfile();
        if (dead || !p) return;
        const s: Session = { role: p.role, id: p.email, name: p.name, userType: p.userType, department: p.department, photo: p.photo, createdAt: p.createdAt };
        setSession(s);
        try { window.localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
      } catch { /* offline: keep the saved session; the data pages show their own warning */ }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      if (event === 'SIGNED_OUT') {
        setSession(null);
        try { window.localStorage.removeItem(KEY); } catch { /* ignore */ }
      }
    });
    return () => { dead = true; sub.subscription.unsubscribe(); };
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

  const value = useMemo(() => ({ session, login, logout, updateProfile, recovery, clearRecovery }), [session, login, logout, updateProfile, recovery, clearRecovery]);
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
