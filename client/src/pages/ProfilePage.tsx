import { useMemo, useRef, useState, type FormEvent } from 'react';
import { displayName, useAuth } from '../context/AuthContext';
import { useComplaints, useVisibleComplaints } from '../context/ComplaintsContext';
import { useToast } from '../context/ToastContext';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { computeStats } from '../utils/complaintStats';
import { changeAdminPassword, changeUserPassword, findAccount, updateAccount, updateAdminProfile, USER_TYPE_LABELS, type UserType } from '../utils/accounts';
import { imageToDataUrl, validateImage } from '../utils/image';
import { formatDate } from '../utils/format';

/** Profile for both roles: personal details, photo, password, and the person's own activity. */
export function ProfilePage() {
  const { session, updateProfile } = useAuth();
  const { toast } = useToast();
  const { complaints } = useComplaints();
  const mine = useVisibleComplaints();
  const isAdmin = session?.role === 'admin';
  const email = session?.id ?? '';
  const account = useMemo(() => (isAdmin ? undefined : findAccount(email)), [isAdmin, email]);

  // ---- personal information ----
  const [name, setName] = useState(session?.name ?? '');
  const [userType, setUserType] = useState<UserType | ''>(session?.userType ?? '');
  const [department, setDepartment] = useState(session?.department ?? '');
  const [photo, setPhoto] = useState<string | undefined>(session?.photo);
  const [errors, setErrors] = useState<{ name?: string; userType?: string; department?: string; photo?: string }>({});
  const [processing, setProcessing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const dirty = name.trim() !== (session?.name ?? '') || userType !== (session?.userType ?? '') || department.trim() !== (session?.department ?? '') || photo !== session?.photo;

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const problem = validateImage(file);
    if (problem) { setErrors((v) => ({ ...v, photo: problem })); return; }
    setProcessing(true);
    try {
      setPhoto(await imageToDataUrl(file, 256));
      setErrors((v) => ({ ...v, photo: undefined }));
    } catch (err) {
      setErrors((v) => ({ ...v, photo: (err as Error).message }));
    } finally {
      setProcessing(false);
    }
  }

  function saveProfile(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!name.trim()) next.name = isAdmin ? 'Please enter a display name.' : 'Please enter your full name.';
    if (!isAdmin && !userType) next.userType = 'Please choose Student or Staff / Faculty.';
    if (!isAdmin && !department.trim()) next.department = 'Please enter your department.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    if (isAdmin) {
      const saved = updateAdminProfile({ name, department, photo: photo ?? null });
      if (!saved) { toast('Your changes could not be saved (browser storage is blocked).', 'error'); return; }
      updateProfile({ name: saved.name, department: saved.department, photo: saved.photo });
    } else {
      if (!account) { toast('No saved account was found for this email. Please sign out and create an account.', 'error'); return; }
      const saved = updateAccount(email, { name, userType: userType || undefined, department, photo: photo ?? null });
      if (!saved) { toast('Your changes could not be saved (browser storage is blocked).', 'error'); return; }
      updateProfile({ name: saved.name, userType: saved.userType, department: saved.department, photo: saved.photo });
    }
    toast('Profile updated.');
  }

  function resetProfile() {
    setName(session?.name ?? ''); setUserType(session?.userType ?? ''); setDepartment(session?.department ?? ''); setPhoto(session?.photo); setErrors({});
  }

  // ---- password ----
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwErrors, setPwErrors] = useState<Partial<Record<keyof typeof pw, string>>>({});
  const [showPw, setShowPw] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    if (pwBusy) return;
    const next: typeof pwErrors = {};
    if (!pw.current) next.current = 'Please enter your current password.';
    if (!pw.next) next.next = 'Please choose a new password.';
    else if (pw.next.length < 6) next.next = 'Use at least 6 characters.';
    else if (pw.next === pw.current) next.next = 'The new password must be different from the current one.';
    if (!pw.confirm) next.confirm = 'Please confirm the new password.';
    else if (pw.confirm !== pw.next) next.confirm = 'The passwords do not match.';
    setPwErrors(next);
    if (Object.keys(next).length > 0) return;
    setPwBusy(true);
    try {
      const result = isAdmin ? await changeAdminPassword(pw.current, pw.next) : await changeUserPassword(email, pw.current, pw.next);
      if (!result.ok) { setPwErrors({ current: result.error }); return; }
      setPw({ current: '', next: '', confirm: '' });
      setShowPw(false);
      toast('Password updated. Use the new password the next time you sign in.');
    } finally {
      setPwBusy(false);
    }
  }

  // ---- activity (calculated from the real complaint records) ----
  const stats = computeStats(mine);
  const resolvedByMe = complaints.filter((c) => c.resolvedBy === email).length;
  const updatesByMe = complaints.reduce((n, c) => n + c.history.filter((h) => h.by === email).length, 0);

  const fieldErr = (id: string, msg?: string) => msg && <p id={`${id}-err`} className="field-error" role="alert">{msg}</p>;
  const aria = (id: string, msg?: string) => ({ 'aria-invalid': !!msg, 'aria-describedby': msg ? `${id}-err` : undefined });

  return (
    <>
      <header className="page-head">
        <h1>My Profile</h1>
        <p className="muted">Manage your personal details, photo and password.</p>
      </header>

      <section className="card profile-hero">
        <Avatar session={{ ...(session as NonNullable<typeof session>), name: name || session?.name, photo }} size={88} />
        <div className="profile-hero-text">
          <h2>{name.trim() || displayName(session)}</h2>
          <p className="muted">{email}</p>
          <div className="row">
            <span className="badge badge-role">{isAdmin ? 'Administrator' : userType ? USER_TYPE_LABELS[userType] : 'User'}</span>
            {department.trim() && <span className="muted small">{department.trim()}</span>}
          </div>
        </div>
      </section>

      <div className="profile-grid">
        <form className="card form-card" onSubmit={saveProfile} noValidate>
          <h2>Personal information</h2>

          <div className="field">
            <span className="label">Profile photo</span>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="visually-hidden" onChange={onPhoto} aria-label="Choose a profile photo" />
            <div className="row photo-row">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()} disabled={processing}>
                {processing ? <><Icon name="loader" size={16} className="spin" /> Processing…</> : <><Icon name="image" size={16} /> {photo ? 'Change photo' : 'Upload photo'}</>}
              </button>
              {photo && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPhoto(undefined)}><Icon name="x" size={14} /> Remove</button>}
            </div>
            <p className="muted small">JPG, PNG or WebP, up to 5 MB. Kept only in this browser.</p>
            {errors.photo && <p className="field-error" role="alert">{errors.photo}</p>}
          </div>

          <div className="field">
            <label htmlFor="p-name">{isAdmin ? 'Display name' : 'Full name'} <span className="req" aria-hidden="true">*</span></label>
            <input id="p-name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" {...aria('p-name', errors.name)} />
            {fieldErr('p-name', errors.name)}
          </div>

          <div className="field">
            <label htmlFor="p-email">Email</label>
            <input id="p-email" className="input" value={email} readOnly aria-readonly="true" />
            <p className="muted small">Your email is your sign-in ID, so it cannot be changed.</p>
          </div>

          {!isAdmin && (
            <div className="field">
              <label htmlFor="p-type">I am a <span className="req" aria-hidden="true">*</span></label>
              <select id="p-type" className="input" value={userType} onChange={(e) => setUserType(e.target.value as UserType | '')} {...aria('p-type', errors.userType)}>
                <option value="">Select…</option>
                <option value="student">{USER_TYPE_LABELS.student}</option>
                <option value="staff">{USER_TYPE_LABELS.staff}</option>
              </select>
              {fieldErr('p-type', errors.userType)}
            </div>
          )}

          <div className="field">
            <label htmlFor="p-dept">{isAdmin ? 'Office / department' : 'Department'}{!isAdmin && <span className="req" aria-hidden="true"> *</span>}</label>
            <input id="p-dept" className="input" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder={isAdmin ? 'Optional' : 'e.g. Computer Science'} {...aria('p-dept', errors.department)} />
            {fieldErr('p-dept', errors.department)}
          </div>

          <div className="row">
            <button type="submit" className="btn btn-primary" disabled={!dirty || processing}>Save changes</button>
            <button type="button" className="btn btn-secondary" onClick={resetProfile} disabled={!dirty}>Reset</button>
          </div>
        </form>

        <div className="stack">
          <form className="card form-card" onSubmit={changePassword} noValidate>
            <h2>Change password</h2>
            <div className="field">
              <label htmlFor="pw-current">Current password</label>
              <input id="pw-current" className="input" type={showPw ? 'text' : 'password'} autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} {...aria('pw-current', pwErrors.current)} />
              {fieldErr('pw-current', pwErrors.current)}
            </div>
            <div className="field">
              <label htmlFor="pw-new">New password</label>
              <input id="pw-new" className="input" type={showPw ? 'text' : 'password'} autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} placeholder="At least 6 characters" {...aria('pw-new', pwErrors.next)} />
              {fieldErr('pw-new', pwErrors.next)}
            </div>
            <div className="field">
              <label htmlFor="pw-confirm">Confirm new password</label>
              <input id="pw-confirm" className="input" type={showPw ? 'text' : 'password'} autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} {...aria('pw-confirm', pwErrors.confirm)} />
              {fieldErr('pw-confirm', pwErrors.confirm)}
            </div>
            <label className="check"><input type="checkbox" checked={showPw} onChange={(e) => setShowPw(e.target.checked)} /> Show passwords</label>
            <div className="row">
              <button type="submit" className="btn btn-primary" disabled={pwBusy}>{pwBusy ? 'Updating…' : 'Update password'}</button>
            </div>
          </form>

          <section className="card">
            <h2>{isAdmin ? 'Your activity' : 'My complaints'}</h2>
            <dl className="kv">
              {isAdmin ? (
                <>
                  <div><dt>Complaints in the system</dt><dd>{complaints.length}</dd></div>
                  <div><dt>Resolved by you</dt><dd>{resolvedByMe}</dd></div>
                  <div><dt>Status updates by you</dt><dd>{updatesByMe}</dd></div>
                  <div><dt>Role</dt><dd>Administrator</dd></div>
                </>
              ) : (
                <>
                  <div><dt>Total</dt><dd>{stats.total}</dd></div>
                  <div><dt>Pending</dt><dd>{stats.pending}</dd></div>
                  <div><dt>In Progress</dt><dd>{stats.in_progress}</dd></div>
                  <div><dt>Resolved</dt><dd>{stats.resolved}</dd></div>
                  {account && <div><dt>Member since</dt><dd>{formatDate(account.createdAt)}</dd></div>}
                </>
              )}
            </dl>
          </section>
        </div>
      </div>
    </>
  );
}
