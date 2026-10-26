// One place for sign in, sign up, profile and password changes.
// With Supabase configured these use Supabase Auth; otherwise they use the accounts saved in this browser (utils/accounts.ts).
import {
  ADMIN_EMAIL, changeAdminPassword, changeUserPassword, createAccount, findAccount, loadAdminProfile, resetUserPassword,
  setCloudDirectory, updateAccount, updateAdminProfile, verifyAdmin, verifyUser, type UserType,
} from './accounts';
import { fetchMyProfile, saveMyProfile, type MyProfile } from './cloud';
import { cloudEnabled, supabase } from './supabase';

export interface AuthProfile { role: 'user' | 'admin'; email: string; name?: string; userType?: UserType; department?: string; photo?: string; createdAt?: string }
export type SignInResult = { ok: true; profile: AuthProfile } | { ok: false; error: string };
export type Done = { ok: true } | { ok: false; error: string };

const fromCloud = (p: MyProfile): AuthProfile => ({ role: p.role, email: p.email, name: p.name, userType: p.userType, department: p.department, photo: p.photo, createdAt: p.createdAt });

/** Turns Supabase's English error messages into short sentences for the form. */
function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login')) return 'Incorrect email or password.';
  if (m.includes('email not confirmed')) return 'Please confirm your email first. Check your inbox for the confirmation link.';
  if (m.includes('already registered') || m.includes('already been registered')) return 'An account with this email already exists. Please sign in instead.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Too many attempts. Please wait a minute and try again.';
  if (m.includes('failed to fetch') || m.includes('network')) return 'Could not reach the server. Check your internet connection and try again.';
  if (m.includes('password') && m.includes('characters')) return 'Use at least 6 characters.';
  return message;
}

export async function signIn(email: string, password: string): Promise<SignInResult> {
  const address = email.trim().toLowerCase();
  if (supabase) {
    const { error } = await supabase.auth.signInWithPassword({ email: address, password });
    if (error) return { ok: false, error: friendly(error.message) };
    try {
      const p = await fetchMyProfile();
      if (!p) { await supabase.auth.signOut(); return { ok: false, error: 'Your profile could not be found. Please contact the administrator.' }; }
      return { ok: true, profile: fromCloud(p) };
    } catch (e) {
      await supabase.auth.signOut();
      return { ok: false, error: friendly((e as Error).message) };
    }
  }
  if (address === ADMIN_EMAIL) {
    if (!(await verifyAdmin(address, password))) return { ok: false, error: 'Incorrect email or password.' };
    const p = loadAdminProfile();
    return { ok: true, profile: { role: 'admin', email: address, name: p.name, department: p.department, photo: p.photo } };
  }
  const r = await verifyUser(address, password);
  if (!r.ok) return { ok: false, error: r.reason === 'no_account' ? 'No account found for this email. Please register first.' : 'Incorrect password. Please try again.' };
  const a = r.account;
  return { ok: true, profile: { role: 'user', email: a.email, name: a.name, userType: a.userType, department: a.department, photo: a.photo, createdAt: a.createdAt } };
}

export interface SignUpInput { name: string; email: string; userType: UserType; department: string; password: string }
export type SignUpResult = { ok: true; needsConfirm?: boolean; saved?: boolean } | { ok: false; error: string };

export async function signUp(input: SignUpInput): Promise<SignUpResult> {
  const email = input.email.trim().toLowerCase();
  if (supabase) {
    const { data, error } = await supabase.auth.signUp({
      email, password: input.password,
      options: { data: { name: input.name.trim(), user_type: input.userType, department: input.department.trim() } },
    });
    if (error) return { ok: false, error: friendly(error.message) };
    // With "Confirm email" turned on, an existing address comes back as a user with no identities.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) return { ok: false, error: 'An account with this email already exists. Please sign in instead.' };
    if (data.session) { await supabase.auth.signOut(); return { ok: true }; } // the form sends the person to Sign In next
    return { ok: true, needsConfirm: true };
  }
  const r = await createAccount(input);
  return r.ok ? { ok: true, saved: r.saved } : r;
}

/** Cloud: e-mails a reset link. Without Supabase this is not available (the form asks for name and department instead). */
export async function sendResetLink(email: string): Promise<Done> {
  if (!supabase) return { ok: false, error: 'Password reset by e-mail needs Supabase.' };
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${window.location.origin}/` });
  return error ? { ok: false, error: friendly(error.message) } : { ok: true };
}

/** Local-mode "forgot password" (name and department as proof). */
export const resetLocalPassword = resetUserPassword;

/** After the e-mailed link is opened: set the new password, then sign out so the person signs in with it. */
export async function completeRecovery(newPassword: string): Promise<Done> {
  if (!supabase) return { ok: false, error: 'Not available.' };
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, error: friendly(error.message) };
  await supabase.auth.signOut();
  return { ok: true };
}

export async function signOutEverywhere(): Promise<void> {
  setCloudDirectory(null);
  if (supabase) { try { await supabase.auth.signOut(); } catch { /* already signed out */ } }
}

export interface ProfilePatch { name: string; userType?: UserType; department: string; photo?: string }
export type SaveProfileResult = { ok: true; profile: AuthProfile } | { ok: false; error: string };

export async function saveProfile(email: string, isAdmin: boolean, patch: ProfilePatch): Promise<SaveProfileResult> {
  if (supabase) {
    try {
      return { ok: true, profile: fromCloud(await saveMyProfile({ name: patch.name, userType: isAdmin ? undefined : patch.userType, department: patch.department, photo: patch.photo })) };
    } catch (e) {
      return { ok: false, error: friendly((e as Error).message) };
    }
  }
  const storage = 'Your changes could not be saved (browser storage is blocked).';
  if (isAdmin) {
    const saved = updateAdminProfile({ name: patch.name, department: patch.department, photo: patch.photo ?? null });
    return saved ? { ok: true, profile: { role: 'admin', email, name: saved.name, department: saved.department, photo: saved.photo } } : { ok: false, error: storage };
  }
  if (!findAccount(email)) return { ok: false, error: 'No saved account was found for this email. Please sign out and create an account.' };
  const saved = updateAccount(email, { name: patch.name, userType: patch.userType, department: patch.department, photo: patch.photo ?? null });
  return saved ? { ok: true, profile: { role: 'user', email, name: saved.name, userType: saved.userType, department: saved.department, photo: saved.photo, createdAt: saved.createdAt } } : { ok: false, error: storage };
}

export async function changePassword(email: string, isAdmin: boolean, current: string, next: string): Promise<Done> {
  if (supabase) {
    const check = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: current });
    if (check.error) return { ok: false, error: 'Your current password is incorrect.' };
    const { error } = await supabase.auth.updateUser({ password: next });
    return error ? { ok: false, error: friendly(error.message) } : { ok: true };
  }
  return isAdmin ? changeAdminPassword(current, next) : changeUserPassword(email, current, next);
}

export { cloudEnabled };
