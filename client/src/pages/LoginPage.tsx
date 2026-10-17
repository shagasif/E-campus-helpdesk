import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { homePath, useAuth, type Role } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Icon, type IconName } from '../components/Icon';
import { createAccount, loadAdminProfile, USER_TYPE_LABELS, verifyAdmin, verifyUser, type UserType } from '../utils/accounts';

// Remembers the chosen tab so it survives sign-out, refresh and navigation.
const ROLE_KEY = 'campus-issue-reporting:login-role:v1';
function readRole(): Role {
  try {
    const v = window.localStorage.getItem(ROLE_KEY);
    if (v === 'admin' || v === 'user') return v;
  } catch { /* storage blocked: fall back to User */ }
  return 'user';
}

const TABS: { key: Role; label: string; hint: string }[] = [
  { key: 'user', label: 'User Login', hint: 'Report issues and track your own complaints.' },
  { key: 'admin', label: 'Admin Login', hint: 'Manage all complaints and view reports.' },
];

const FEATURES: { icon: IconName; label: string }[] = [
  { icon: 'computer', label: 'Computers' },
  { icon: 'projector', label: 'Projectors' },
  { icon: 'fan', label: 'Fans' },
  { icon: 'light', label: 'Lights' },
  { icon: 'wifi', label: 'Wi-Fi' },
];

// Fixed values (not random) so the golden particles look the same on every load.
const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  x: (i * 37 + 8) % 100,
  s: 4 + ((i * 5) % 9),
  d: 14 + ((i * 7) % 12),
  delay: -((i * 3) % 14),
  dx: ((i * 23) % 60) - 30,
}));

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const fade = (delay: number): CSSProperties => ({ ['--fd' as string]: `${delay}s` });

type SignupForm = { name: string; email: string; userType: UserType | ''; department: string; password: string; confirm: string };
const EMPTY_SIGNUP: SignupForm = { name: '', email: '', userType: '', department: '', password: '', confirm: '' };

export function LoginPage() {
  const { session, login } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [role, setRole] = useState<Role>(readRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [created, setCreated] = useState<string | null>(null); // name of the account just created
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [su, setSu] = useState<SignupForm>(EMPTY_SIGNUP);
  const [suErrors, setSuErrors] = useState<Partial<Record<keyof SignupForm, string>>>({});
  const passwordRef = useRef<HTMLInputElement>(null);

  // After creating an account, put the cursor in the password box (the email is already filled in).
  useEffect(() => {
    if (mode === 'signin' && created) passwordRef.current?.focus();
  }, [mode, created]);

  if (session) return <Navigate to={homePath(session.role)} replace />;

  function chooseRole(r: Role) {
    setRole(r);
    setErrors({});
    setCreated(null);
    setFormError(null);
    try { window.localStorage.setItem(ROLE_KEY, r); } catch { /* ignore */ }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const next: typeof errors = {};
    if (!email.trim()) next.email = 'Please enter your email address.';
    else if (!EMAIL_RE.test(email.trim())) next.email = 'Please enter a valid email address.';
    if (!password) next.password = 'Please enter your password.';
    setErrors(next);
    setFormError(null);
    setCreated(null);
    if (Object.keys(next).length > 0) return;

    const address = email.trim().toLowerCase();
    setBusy(true);
    try {
      if (role === 'admin') {
        if (!(await verifyAdmin(address, password))) { setFormError('Incorrect email or password.'); return; }
        const adminProfile = loadAdminProfile();
        login('admin', address, { name: adminProfile.name, department: adminProfile.department, photo: adminProfile.photo });
        return;
      }
      const result = await verifyUser(address, password);
      if (!result.ok) {
        setFormError(result.reason === 'no_account' ? 'No account found for this email. Please create an account first.' : 'Incorrect password. Please try again.');
        return;
      }
      const { account } = result;
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

      // Back to the sign-in screen with the email filled in. The user must now sign in.
      const address = su.email.trim().toLowerCase();
      chooseRole('user');
      setCreated(su.name.trim());
      setEmail(address);
      setPassword('');
      setErrors({});
      setSu(EMPTY_SIGNUP);
      setSuErrors({});
      setShow(false);
      setMode('signin');
    } finally {
      setBusy(false);
    }
  }

  const setField = (k: keyof SignupForm) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setSu((v) => ({ ...v, [k]: e.target.value }));
  const suField = (k: keyof SignupForm) => ({ 'aria-invalid': !!suErrors[k], 'aria-describedby': suErrors[k] ? `su-${k}-err` : undefined });
  const suErr = (k: keyof SignupForm) => suErrors[k] && <p id={`su-${k}-err`} className="cc-error" role="alert">{suErrors[k]}</p>;

  const current = TABS.find((t) => t.key === role)!;

  return (
    <div className="cc-login">
      <div className="cc-bg" aria-hidden="true" />
      <div className="cc-tint" aria-hidden="true" />
      <div className="cc-overlay" aria-hidden="true" />
      <svg className="cc-curves" viewBox="0 0 1440 900" preserveAspectRatio="none" aria-hidden="true">
        <path d="M-40 140 C 220 60, 420 260, 720 150 S 1200 40, 1480 170" fill="none" stroke="#FACC15" strokeOpacity="0.20" strokeWidth="1.5" />
        <path d="M-40 175 C 240 100, 440 290, 740 185 S 1210 85, 1480 205" fill="none" stroke="#FACC15" strokeOpacity="0.10" strokeWidth="1.5" />
        <path d="M-40 820 C 300 740, 560 920, 900 800 S 1260 760, 1480 840" fill="none" stroke="#FACC15" strokeOpacity="0.16" strokeWidth="1.5" />
      </svg>
      <div className="cc-particles" aria-hidden="true">
        {PARTICLES.map((p, i) => (
          <span key={i} className="cc-particle" style={{ ['--x' as string]: `${p.x}%`, ['--s' as string]: `${p.s}px`, ['--d' as string]: `${p.d}s`, ['--delay' as string]: `${p.delay}s`, ['--dx' as string]: `${p.dx}px` }} />
        ))}
      </div>

      <div className="cc-shell">
        <section className="cc-brand">
          <div className="cc-logo cc-fade" style={fade(0.05)}>
            <span className="cc-logo-mark" aria-hidden="true"><Icon name="headset" size={26} /></span>
            <span className="cc-logo-text">E-Campus Helpdesk</span>
          </div>
          <p className="cc-eyebrow cc-fade" style={fade(0.15)}>Campus Support Portal</p>
          <h1 className="cc-title cc-fade" style={fade(0.25)}>Your Campus,<br />Our Priority.</h1>
          <p className="cc-lead cc-fade" style={fade(0.35)}>Your centralized platform for all campus solutions. Log in to instantly report and track issues related to IT Systems, Classroom Equipment, Utilities, and Infrastructure. We ensure every complaint is tracked from Pending to Resolved in real-time.</p>
          <ul className="cc-features cc-fade" style={fade(0.5)} aria-label="Issues you can report">
            {FEATURES.map((f) => (
              <li key={f.label} className="cc-feature">
                <span className="cc-feature-icon"><Icon name={f.icon} size={26} /></span>
                <span>{f.label}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="cc-panel">
          {mode === 'signup' ? (
            <form className="cc-card cc-card-wide cc-fade" style={fade(0.1)} onSubmit={onSignup} noValidate>
              <h2>Create your account</h2>
              <p className="cc-sub">Join E-Campus Helpdesk to report and track campus issues.</p>

              <div className="cc-field">
                <label htmlFor="su-name">Full name</label>
                <input id="su-name" className="cc-input" autoComplete="name" value={su.name} onChange={setField('name')} placeholder="e.g. Ayesha Khan" {...suField('name')} />
                {suErr('name')}
              </div>
              <div className="cc-field">
                <label htmlFor="su-email">Email</label>
                <input id="su-email" className="cc-input" type="email" autoComplete="email" value={su.email} onChange={setField('email')} placeholder="you@university.edu" {...suField('email')} />
                {suErr('email')}
              </div>
              <div className="cc-row2">
                <div className="cc-field">
                  <label htmlFor="su-type">I am a</label>
                  <select id="su-type" className="cc-input" value={su.userType} onChange={setField('userType')} {...suField('userType')}>
                    <option value="">Select…</option>
                    <option value="student">{USER_TYPE_LABELS.student}</option>
                    <option value="staff">{USER_TYPE_LABELS.staff}</option>
                  </select>
                  {suErr('userType')}
                </div>
                <div className="cc-field">
                  <label htmlFor="su-dept">Department</label>
                  <input id="su-dept" className="cc-input" value={su.department} onChange={setField('department')} placeholder="e.g. Computer Science" {...suField('department')} />
                  {suErr('department')}
                </div>
              </div>
              <div className="cc-field">
                <label htmlFor="su-password">Password</label>
                <div className="cc-pw">
                  <input id="su-password" className="cc-input" type={show ? 'text' : 'password'} autoComplete="new-password" value={su.password} onChange={setField('password')} placeholder="At least 6 characters" {...suField('password')} />
                  <button type="button" className="cc-pw-toggle" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}>
                    <Icon name={show ? 'eyeoff' : 'eye'} size={18} />
                  </button>
                </div>
                {suErr('password')}
              </div>
              <div className="cc-field">
                <label htmlFor="su-confirm">Confirm password</label>
                <input id="su-confirm" className="cc-input" type={show ? 'text' : 'password'} autoComplete="new-password" value={su.confirm} onChange={setField('confirm')} placeholder="Re-enter your password" {...suField('confirm')} />
                {suErr('confirm')}
              </div>

              <button type="submit" className="cc-btn" disabled={busy}>{busy ? 'Creating account…' : 'Create Account'}</button>
              <p className="cc-switch">Already have an account? <button type="button" className="cc-link-btn" onClick={() => { setMode('signin'); setSuErrors({}); }}>Sign in</button></p>
            </form>
          ) : (
            <form className="cc-card cc-fade" style={fade(0.4)} onSubmit={onSubmit} noValidate>
              <h2>Welcome back</h2>
              <p className="cc-sub">Sign in to continue.</p>
              {formError && (
                <div className="cc-alert" role="alert">
                  <Icon name="alert" size={18} />
                  <span>{formError}</span>
                </div>
              )}
              {created && (
                <div className="cc-success" role="status">
                  <Icon name="done" size={18} />
                  <span>Account created for <strong>{created}</strong>. Please sign in to continue.</span>
                </div>
              )}

              <div className="cc-tabs" role="tablist" aria-label="Login type">
                {TABS.map((t) => (
                  <button key={t.key} type="button" role="tab" id={`tab-${t.key}`} aria-selected={role === t.key} aria-controls="login-panel" className="cc-tab" onClick={() => chooseRole(t.key)}>
                    {t.label}
                  </button>
                ))}
              </div>
              <p className="cc-hint" id="login-panel" role="tabpanel" aria-labelledby={`tab-${role}`}>{current.hint}</p>

              <div className="cc-field">
                <label htmlFor="cc-email">Email</label>
                <input id="cc-email" className="cc-input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={role === 'admin' ? 'admin@university.edu' : 'you@university.edu'} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'cc-email-err' : undefined} />
                {errors.email && <p id="cc-email-err" className="cc-error" role="alert">{errors.email}</p>}
              </div>

              <div className="cc-field">
                <label htmlFor="cc-password">Password</label>
                <div className="cc-pw">
                  <input id="cc-password" ref={passwordRef} className="cc-input" type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" aria-invalid={!!errors.password} aria-describedby={errors.password ? 'cc-password-err' : undefined} />
                  <button type="button" className="cc-pw-toggle" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}>
                    <Icon name={show ? 'eyeoff' : 'eye'} size={18} />
                  </button>
                </div>
                {errors.password && <p id="cc-password-err" className="cc-error" role="alert">{errors.password}</p>}
              </div>

              <button type="submit" className="cc-btn" disabled={busy}>{busy ? 'Signing in…' : 'Sign In'}</button>
              {role === 'user' && (
                <p className="cc-switch">New here? <button type="button" className="cc-link-btn" onClick={() => { setMode('signup'); setErrors({}); setCreated(null); }}>Create account</button></p>
              )}
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
