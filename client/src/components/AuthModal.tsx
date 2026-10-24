import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Icon } from './Icon';
import { createAccount, loadAdminProfile, resetUserPassword, USER_TYPE_LABELS, verifyAdmin, verifyUser, type UserType } from '../utils/accounts';

type Chip = UserType | 'admin';
const CHIPS: { key: Chip; label: string }[] = [
  { key: 'student', label: 'Student' },
  { key: 'staff', label: 'Staff / Faculty' },
  { key: 'admin', label: 'Admin' },
];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMPTY_FG = { email: '', name: '', department: '', password: '', confirm: '' };
type SignupForm = { name: string; email: string; userType: UserType | ''; department: string; password: string; confirm: string };
const EMPTY_SIGNUP: SignupForm = { name: '', email: '', userType: '', department: '', password: '', confirm: '' };

/** Sign in / Register overlay. Signing in sets the session, and the landing page then opens the right dashboard. */
export function AuthModal({ onClose }: { onClose: () => void }) {
  const { login } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [chip, setChip] = useState<Chip>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);
  const [reset, setReset] = useState(false);
  const [busy, setBusy] = useState(false);
  const [su, setSu] = useState<SignupForm>(EMPTY_SIGNUP);
  const [suErrors, setSuErrors] = useState<Partial<Record<keyof SignupForm, string>>>({});
  const [fg, setFg] = useState({ email: '', name: '', department: '', password: '', confirm: '' });
  const [fgErrors, setFgErrors] = useState<Partial<Record<keyof typeof EMPTY_FG, string>>>({});
  const [fgError, setFgError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Escape closes, the page behind does not scroll, and focus moves into the dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    dialogRef.current?.querySelector<HTMLElement>('input, select, button.am-chip')?.focus();
    return () => { document.removeEventListener('keydown', onKey); document.body.classList.remove('no-scroll'); };
  }, [onClose]);

  useEffect(() => { if (mode === 'signin' && created) passwordRef.current?.focus(); }, [mode, created]);

  function pickChip(c: Chip) { setChip(c); setErrors({}); setFormError(null); setCreated(null); }

  function switchMode(m: 'signin' | 'signup' | 'forgot') {
    setMode(m); setErrors({}); setSuErrors({}); setFgErrors({}); setFgError(null); setFormError(null); setCreated(null); setShow(false);
    if (m === 'signup') { if (chip === 'admin') setChip('student'); setSu((v) => ({ ...v, userType: v.userType || (chip === 'admin' ? 'student' : chip) })); }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const next: typeof errors = {};
    if (!email.trim()) next.email = 'Please enter your email address.';
    else if (!EMAIL_RE.test(email.trim())) next.email = 'Please enter a valid email address.';
    if (!password) next.password = 'Please enter your password.';
    setErrors(next); setFormError(null); setCreated(null); setReset(false);
    if (Object.keys(next).length > 0) return;

    const address = email.trim().toLowerCase();
    setBusy(true);
    try {
      if (chip === 'admin') {
        if (!(await verifyAdmin(address, password))) { setFormError('Incorrect email or password.'); return; }
        const p = loadAdminProfile();
        login('admin', address, { name: p.name, department: p.department, photo: p.photo });
        return;
      }
      const result = await verifyUser(address, password);
      if (!result.ok) {
        setFormError(result.reason === 'no_account' ? 'No account found for this email. Please register first.' : 'Incorrect password. Please try again.');
        return;
      }
      const { account } = result;
      if (account.userType !== chip) {
        setFormError(`This account is registered as ${USER_TYPE_LABELS[account.userType]}. Choose that option to sign in.`);
        return;
      }
      login('user', account.email, { name: account.name, userType: account.userType, department: account.department, photo: account.photo });
    } finally {
      setBusy(false);
    }
  }

  async function onSignup(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const next: typeof suErrors = {};
    if (!su.name.trim()) next.name = 'Please enter your full name.';
    if (!su.email.trim()) next.email = 'Please enter your email address.';
    else if (!EMAIL_RE.test(su.email.trim())) next.email = 'Please enter a valid email address.';
    if (!su.userType) next.userType = 'Please choose Student or Staff / Faculty.';
    if (!su.department.trim()) next.department = 'Please enter your department.';
    if (!su.password) next.password = 'Please choose a password.';
    else if (su.password.length < 6) next.password = 'Use at least 6 characters.';
    if (!su.confirm) next.confirm = 'Please confirm your password.';
    else if (su.confirm !== su.password) next.confirm = 'The passwords do not match.';
    setSuErrors(next);
    if (Object.keys(next).length > 0 || !su.userType) return;

    setBusy(true);
    try {
      const result = await createAccount({ name: su.name, email: su.email, userType: su.userType, department: su.department, password: su.password });
      if (!result.ok) { setSuErrors({ email: result.error }); return; }
      if (!result.saved) toast('Browser storage is blocked, so the account could not be saved.', 'error');
      // Back to Sign In with the email filled in. The user signs in next.
      setChip(su.userType); setCreated(su.name.trim()); setEmail(su.email.trim().toLowerCase()); setPassword('');
      setErrors({}); setSu(EMPTY_SIGNUP); setSuErrors({}); setShow(false); setMode('signin');
    } finally {
      setBusy(false);
    }
  }

  async function onForgot(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const next: typeof fgErrors = {};
    if (!fg.email.trim()) next.email = 'Please enter your email address.';
    else if (!EMAIL_RE.test(fg.email.trim())) next.email = 'Please enter a valid email address.';
    if (!fg.name.trim()) next.name = 'Please enter the full name you registered with.';
    if (!fg.department.trim()) next.department = 'Please enter your department.';
    if (!fg.password) next.password = 'Please choose a new password.';
    else if (fg.password.length < 6) next.password = 'Use at least 6 characters.';
    if (!fg.confirm) next.confirm = 'Please confirm your new password.';
    else if (fg.confirm !== fg.password) next.confirm = 'The passwords do not match.';
    setFgErrors(next); setFgError(null);
    if (Object.keys(next).length > 0) return;
    setBusy(true);
    try {
      const r = await resetUserPassword(fg.email, fg.name, fg.department, fg.password);
      if (!r.ok) { setFgError(r.error); return; }
      const addr = fg.email.trim().toLowerCase();
      setEmail(addr); setPassword(''); setFg(EMPTY_FG); setFgErrors({}); setShow(false); setErrors({}); setFormError(null);
      setCreated(null); setReset(true); setMode('signin');
    } finally {
      setBusy(false);
    }
  }
  const fgSet = (k: keyof typeof EMPTY_FG) => (e: ChangeEvent<HTMLInputElement>) => setFg((v) => ({ ...v, [k]: e.target.value }));
  const fgField = (k: keyof typeof EMPTY_FG) => ({ 'aria-invalid': !!fgErrors[k], 'aria-describedby': fgErrors[k] ? `fg-${k}-err` : undefined });
  const fgErr = (k: keyof typeof EMPTY_FG) => fgErrors[k] && <p id={`fg-${k}-err`} className="am-error" role="alert">{fgErrors[k]}</p>;

  const setField = (k: keyof SignupForm) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setSu((v) => ({ ...v, [k]: e.target.value }));
  const suField = (k: keyof SignupForm) => ({ 'aria-invalid': !!suErrors[k], 'aria-describedby': suErrors[k] ? `su-${k}-err` : undefined });
  const suErr = (k: keyof SignupForm) => suErrors[k] && <p id={`su-${k}-err`} className="am-error" role="alert">{suErrors[k]}</p>;

  const TITLES = { signin: 'Sign in', signup: 'Sign up', forgot: 'Reset password' } as const;
  const SUBS = { signin: 'Sign in to report, request and track.', signup: 'Register to report problems and make requests.', forgot: 'Confirm your details, then choose a new password.' } as const;

  return (
    <div className="am-backdrop" onMouseDown={(e) => { if (!dialogRef.current?.contains(e.target as Node) && !(e.target as HTMLElement).closest('.am-side')) onClose(); }}>
      <div className="am-photo" aria-hidden="true" />
      <div className="am-stage">
        <aside className="am-side" aria-hidden="true">
          <div className="am-sidebrand"><span className="lp-mark"><Icon name="campus" size={18} /></span><b>E-Campus Helpdesk</b></div>
          <h2>{mode === 'signup' ? <>Register and get <em>help</em> fast</> : <>Report, request and <em>track</em> in one place</>}</h2>
          <p>{mode === 'signup' ? 'Create a free account to report problems, ask for help and send applications.' : 'Complaints, help requests and applications from Submitted to Resolved.'}</p>
        </aside>
      <div className="am-panel">
        <i className="am-tab am-tab-a" aria-hidden="true" /><i className="am-tab am-tab-b" aria-hidden="true" /><i className="am-tab am-tab-c" aria-hidden="true" />
        <i className="am-tab am-tab-d" aria-hidden="true" /><i className="am-tab am-tab-e" aria-hidden="true" /><i className="am-tab am-tab-f" aria-hidden="true" />
      <div className="am-dialog" role="dialog" aria-modal="true" aria-labelledby="am-title" ref={dialogRef}>
        <button type="button" className="icon-btn am-close" onClick={onClose} aria-label="Close"><Icon name="x" size={18} /></button>
        <div className="am-brand"><span className="lp-mark"><Icon name="campus" size={16} /></span><b>E-Campus Helpdesk</b></div>
        <h2 id="am-title">{TITLES[mode]}</h2>
        <p className="am-sub">{SUBS[mode]}</p>

        {mode === 'signin' ? (
          <form onSubmit={onSubmit} noValidate className="am-form">
            {formError && <div className="am-alert" role="alert"><Icon name="alert" size={16} /><span>{formError}</span></div>}
            {reset && <div className="am-success" role="status"><Icon name="done" size={16} /><span>Password changed. Please sign in with the new password.</span></div>}
            {created && <div className="am-success" role="status"><Icon name="done" size={16} /><span>Account created for <strong>{created}</strong>. Please sign in.</span></div>}

            <div className="am-chips" role="group" aria-label="Sign in as">
              {CHIPS.map((c) => (
                <button key={c.key} type="button" className="am-chip" aria-pressed={chip === c.key} onClick={() => pickChip(c.key)}>{c.label}</button>
              ))}
            </div>

            <div className="am-field">
              <label htmlFor="am-email">Email</label>
              <input id="am-email" className="am-input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={chip === 'admin' ? 'admin@university.edu' : 'you@university.edu'} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'am-email-err' : undefined} />
              {errors.email && <p id="am-email-err" className="am-error" role="alert">{errors.email}</p>}
            </div>
            <div className="am-field">
              <label htmlFor="am-password">Password</label>
              <div className="am-pw">
                <input id="am-password" ref={passwordRef} className="am-input" type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" aria-invalid={!!errors.password} aria-describedby={errors.password ? 'am-password-err' : undefined} />
                <button type="button" className="am-eye" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}><Icon name={show ? 'eyeoff' : 'eye'} size={17} /></button>
              </div>
              {errors.password && <p id="am-password-err" className="am-error" role="alert">{errors.password}</p>}
              {chip !== 'admin' && <button type="button" className="am-forgot" onClick={() => { setFg({ ...EMPTY_FG, email: email.trim() }); switchMode('forgot'); }}>Forgot password?</button>}
            </div>
            <button type="submit" className="am-submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign In'}</button>
            {chip !== 'admin' && <p className="am-switch">Don't have an account? <button type="button" className="am-link" onClick={() => switchMode('signup')}>Register</button></p>}
          </form>
        ) : mode === 'forgot' ? (
          <form onSubmit={onForgot} noValidate className="am-form">
            {fgError && <div className="am-alert" role="alert"><Icon name="alert" size={16} /><span>{fgError}</span></div>}
            <div className="am-field"><label htmlFor="fg-email">Email</label><input id="fg-email" className="am-input" type="email" autoComplete="email" value={fg.email} onChange={fgSet('email')} placeholder="you@university.edu" {...fgField('email')} />{fgErr('email')}</div>
            <div className="am-field"><label htmlFor="fg-name">Full name used at registration</label><input id="fg-name" className="am-input" value={fg.name} onChange={fgSet('name')} placeholder="e.g. Ayesha Khan" {...fgField('name')} />{fgErr('name')}</div>
            <div className="am-field"><label htmlFor="fg-dept">Department</label><input id="fg-dept" className="am-input" value={fg.department} onChange={fgSet('department')} placeholder="e.g. Computer Science" {...fgField('department')} />{fgErr('department')}</div>
            <div className="am-field"><label htmlFor="fg-pw">New password</label><input id="fg-pw" className="am-input" type={show ? 'text' : 'password'} autoComplete="new-password" value={fg.password} onChange={fgSet('password')} placeholder="At least 6 characters" {...fgField('password')} />{fgErr('password')}</div>
            <div className="am-field"><label htmlFor="fg-confirm">Confirm new password</label><input id="fg-confirm" className="am-input" type={show ? 'text' : 'password'} autoComplete="new-password" value={fg.confirm} onChange={fgSet('confirm')} placeholder="Re-enter the new password" {...fgField('confirm')} />{fgErr('confirm')}</div>
            <label className="am-check"><input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Show passwords</label>
            <button type="submit" className="am-submit" disabled={busy}>{busy ? 'Saving…' : 'Save new password'}</button>
            <p className="am-switch">Remembered it? <button type="button" className="am-link" onClick={() => switchMode('signin')}>Sign in</button></p>
          </form>
        ) : (
          <form onSubmit={onSignup} noValidate className="am-form">
            <div className="am-field">
              <label htmlFor="su-name">Full name</label>
              <input id="su-name" className="am-input" autoComplete="name" value={su.name} onChange={setField('name')} placeholder="e.g. Ayesha Khan" {...suField('name')} />
              {suErr('name')}
            </div>
            <div className="am-field">
              <label htmlFor="su-email">Email</label>
              <input id="su-email" className="am-input" type="email" autoComplete="email" value={su.email} onChange={setField('email')} placeholder="you@university.edu" {...suField('email')} />
              {suErr('email')}
            </div>
            <div className="am-row2">
              <div className="am-field">
                <label htmlFor="su-type">I am a</label>
                <select id="su-type" className="am-input" value={su.userType} onChange={setField('userType')} {...suField('userType')}>
                  <option value="">Select…</option>
                  <option value="student">{USER_TYPE_LABELS.student}</option>
                  <option value="staff">{USER_TYPE_LABELS.staff}</option>
                </select>
                {suErr('userType')}
              </div>
              <div className="am-field">
                <label htmlFor="su-dept">Department</label>
                <input id="su-dept" className="am-input" value={su.department} onChange={setField('department')} placeholder="e.g. Computer Science" {...suField('department')} />
                {suErr('department')}
              </div>
            </div>
            <div className="am-field">
              <label htmlFor="su-password">Password</label>
              <div className="am-pw">
                <input id="su-password" className="am-input" type={show ? 'text' : 'password'} autoComplete="new-password" value={su.password} onChange={setField('password')} placeholder="At least 6 characters" {...suField('password')} />
                <button type="button" className="am-eye" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}><Icon name={show ? 'eyeoff' : 'eye'} size={17} /></button>
              </div>
              {suErr('password')}
            </div>
            <div className="am-field">
              <label htmlFor="su-confirm">Confirm password</label>
              <input id="su-confirm" className="am-input" type={show ? 'text' : 'password'} autoComplete="new-password" value={su.confirm} onChange={setField('confirm')} placeholder="Re-enter your password" {...suField('confirm')} />
              {suErr('confirm')}
            </div>
            <button type="submit" className="am-submit" disabled={busy}>{busy ? 'Creating account…' : 'Create Account'}</button>
            <p className="am-switch">Already have an account? <button type="button" className="am-link" onClick={() => switchMode('signin')}>Sign in</button></p>
          </form>
        )}
        <p className="am-note">Prototype: accounts are saved in this browser only.</p>
      </div>
      </div>
      </div>
    </div>
  );
}
