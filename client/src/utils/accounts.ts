// Accounts created on the login page. Stored only in this browser (localStorage).
// This is a front-end prototype: the password is stored as a salted SHA-256 hash, which is better than plain text
// but is NOT real security. Real login needs a backend and a database.
export type UserType = 'student' | 'staff';
export const USER_TYPE_LABELS: Record<UserType, string> = { student: 'Student', staff: 'Staff / Faculty' };

export interface Account { name: string; email: string; userType: UserType; department: string; createdAt: string; passwordHash?: string; photo?: string }

// The administrator account. Change these two values to change the admin login.
export const ADMIN_EMAIL = 'admin@campus.edu';
export const ADMIN_PASSWORD = 'Admin@123';

const KEY = 'campus-issue-reporting:accounts:v1';

export function loadAccounts(): Account[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((a): a is Account => !!a && typeof a.name === 'string' && typeof a.email === 'string' && (a.userType === 'student' || a.userType === 'staff') && typeof a.department === 'string');
  } catch {
    return [];
  }
}

function persist(accounts: Account[]): boolean {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(accounts));
    return true;
  } catch {
    return false;
  }
}

export function findAccount(email: string): Account | undefined {
  const id = email.trim().toLowerCase();
  return loadAccounts().find((a) => a.email.toLowerCase() === id);
}

// ---- password hashing ----
function fallbackHash(text: string): string {
  // Used only when the browser has no Web Crypto (rare). Simple 53-bit string hash.
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `c53:${(4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16)}`;
}

export async function hashPassword(email: string, password: string): Promise<string> {
  const text = `ecampus-helpdesk|${email.trim().toLowerCase()}|${password}`; // the email acts as the salt
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return `sha256:${Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')}`;
  }
  return fallbackHash(text);
}

export type CreateResult = { ok: true; saved: boolean } | { ok: false; error: string };

/** Creates an account. Refuses an email that already has an account (or is the admin email). */
export async function createAccount(input: { name: string; email: string; userType: UserType; department: string; password: string }): Promise<CreateResult> {
  const email = input.email.trim().toLowerCase();
  if (email === ADMIN_EMAIL) return { ok: false, error: 'This email address is reserved. Please use a different email.' };
  if (findAccount(email)) return { ok: false, error: 'An account with this email already exists. Please sign in instead.' };
  const account: Account = { name: input.name.trim(), email, userType: input.userType, department: input.department.trim(), createdAt: new Date().toISOString(), passwordHash: await hashPassword(email, input.password) };
  return { ok: true, saved: persist([...loadAccounts(), account]) };
}

export type VerifyResult = { ok: true; account: Account } | { ok: false; reason: 'no_account' | 'wrong_password' };

/** Checks a user's email + password against the accounts created in this browser. */
export async function verifyUser(email: string, password: string): Promise<VerifyResult> {
  const account = findAccount(email);
  if (!account) return { ok: false, reason: 'no_account' };
  const hash = await hashPassword(account.email, password);
  if (!account.passwordHash) {
    // Account created by an earlier version that stored no password: set it now, on first sign-in.
    persist(loadAccounts().map((a) => (a.email === account.email ? { ...a, passwordHash: hash } : a)));
    return { ok: true, account };
  }
  return account.passwordHash === hash ? { ok: true, account } : { ok: false, reason: 'wrong_password' };
}

// ---- administrator profile (the admin account itself is fixed; its name, photo and password can be changed) ----
export interface AdminProfile { name?: string; department?: string; photo?: string; passwordHash?: string }
const ADMIN_KEY = 'campus-issue-reporting:admin-profile:v1';

export function loadAdminProfile(): AdminProfile {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(ADMIN_KEY) ?? 'null');
    return parsed && typeof parsed === 'object' ? (parsed as AdminProfile) : {};
  } catch {
    return {};
  }
}

function saveAdminProfile(profile: AdminProfile): boolean {
  try {
    window.localStorage.setItem(ADMIN_KEY, JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
}

export function updateAdminProfile(patch: { name?: string; department?: string; photo?: string | null }): AdminProfile | undefined {
  const cur = loadAdminProfile();
  const next: AdminProfile = {
    ...cur,
    name: patch.name !== undefined ? patch.name.trim() || undefined : cur.name,
    department: patch.department !== undefined ? patch.department.trim() || undefined : cur.department,
    photo: patch.photo === null ? undefined : patch.photo ?? cur.photo,
  };
  return saveAdminProfile(next) ? next : undefined;
}

export async function verifyAdmin(email: string, password: string): Promise<boolean> {
  if (email.trim().toLowerCase() !== ADMIN_EMAIL) return false;
  const stored = loadAdminProfile().passwordHash;
  if (stored) return stored === (await hashPassword(ADMIN_EMAIL, password));
  return password === ADMIN_PASSWORD;
}

// ---- profile editing and password change ----
export type SimpleResult = { ok: true } | { ok: false; error: string };

export function updateAccount(email: string, patch: { name?: string; userType?: UserType; department?: string; photo?: string | null }): Account | undefined {
  const accounts = loadAccounts();
  const i = accounts.findIndex((a) => a.email.toLowerCase() === email.trim().toLowerCase());
  if (i < 0) return undefined;
  const cur = accounts[i];
  const next: Account = {
    ...cur,
    name: patch.name?.trim() || cur.name,
    userType: patch.userType ?? cur.userType,
    department: patch.department !== undefined ? patch.department.trim() : cur.department,
    photo: patch.photo === null ? undefined : patch.photo ?? cur.photo,
  };
  accounts[i] = next;
  return persist(accounts) ? next : undefined;
}

export async function changeUserPassword(email: string, current: string, next: string): Promise<SimpleResult> {
  const check = await verifyUser(email, current);
  if (!check.ok) return { ok: false, error: 'Your current password is incorrect.' };
  const hash = await hashPassword(email, next);
  const saved = persist(loadAccounts().map((a) => (a.email.toLowerCase() === email.trim().toLowerCase() ? { ...a, passwordHash: hash } : a)));
  return saved ? { ok: true } : { ok: false, error: 'The new password could not be saved (browser storage is blocked).' };
}

export async function changeAdminPassword(current: string, next: string): Promise<SimpleResult> {
  if (!(await verifyAdmin(ADMIN_EMAIL, current))) return { ok: false, error: 'Your current password is incorrect.' };
  const profile = { ...loadAdminProfile(), passwordHash: await hashPassword(ADMIN_EMAIL, next) };
  return saveAdminProfile(profile) ? { ok: true } : { ok: false, error: 'The new password could not be saved (browser storage is blocked).' };
}

/**
 * "Forgot password" for a user account. A prototype cannot send e-mail, so the person proves it is their account by
 * typing the full name and department saved at registration. This is NOT real security; a real site would e-mail a reset link.
 */
export async function resetUserPassword(email: string, name: string, department: string, newPassword: string): Promise<SimpleResult> {
  const id = email.trim().toLowerCase();
  if (id === ADMIN_EMAIL) return { ok: false, error: 'The administrator password cannot be reset here.' };
  const accounts = loadAccounts();
  const i = accounts.findIndex((a) => a.email.toLowerCase() === id);
  const same = (a: string, b: string) => a.trim().toLowerCase().replace(/\s+/g, ' ') === b.trim().toLowerCase().replace(/\s+/g, ' ');
  if (i < 0 || !same(accounts[i].name, name) || !same(accounts[i].department, department)) return { ok: false, error: 'These details do not match an account in this browser.' };
  if (newPassword.length < 6) return { ok: false, error: 'Use at least 6 characters.' };
  accounts[i] = { ...accounts[i], passwordHash: await hashPassword(accounts[i].email, newPassword) };
  return persist(accounts) ? { ok: true } : { ok: false, error: 'Browser storage is blocked, so the new password could not be saved.' };
}
