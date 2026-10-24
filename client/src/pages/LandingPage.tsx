import { useCallback, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { homePath, useAuth } from '../context/AuthContext';
import { Icon, type IconName } from '../components/Icon';
import { ThemeToggle } from '../components/ThemeToggle';
import { AuthModal } from '../components/AuthModal';

const NAV: { id: string; label: string }[] = [
  { id: 'features', label: 'Features' },
  { id: 'how', label: 'How it works' },
  { id: 'who', label: 'Who it is for' },
  { id: 'faq', label: 'FAQ' },
];

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  { icon: 'alert', title: 'Report a Problem', text: 'IT, classrooms, Wi-Fi, electricity, water, canteen, parking, safety and more. Add a photo and track the status.' },
  { icon: 'help', title: 'Request Help', text: 'Academics, registration, exams and results, fees and scholarships, or your IT account.' },
  { icon: 'clipboard', title: 'Applications & Services', text: 'Leave, certificates, ID cards and equipment or access. See each decision in My Requests.' },
];

const STEPS: { title: string; text: string }[] = [
  { title: 'Register or sign in', text: 'Create an account with your email, or sign in.' },
  { title: 'Submit a request', text: 'Choose a problem, help request or application.' },
  { title: 'Staff review and reply', text: 'Staff review it and reply or ask for more information.' },
  { title: 'Track until resolved', text: 'Follow the status from Submitted to Resolved.' },
];

const FAQ: { q: string; a: string }[] = [
  { q: 'Do I need an account?', a: 'Yes. Register with your email, choose Student or Staff / Faculty, then sign in.' },
  { q: 'Which requests can I make?', a: 'You can report a problem, ask for help, or submit an application such as leave, a certificate or an ID card.' },
  { q: 'Can I see other people’s requests?', a: 'No. You only see your own requests. Administrators can see all of them.' },
  { q: 'Is this a real campus system?', a: 'This is a prototype. Accounts and requests are saved in this browser only, and nothing is sent to a real campus office.' },
  { q: 'Is the AI summary required?', a: 'No. It is optional and only needs a Gemini key on the server. The rest of the site works without it.' },
];

function SectionHead({ badge, children, sub }: { badge: string; children: React.ReactNode; sub?: string }) {
  return (
    <div className="lp-sh">
      <span className="lp-pill"><i />{badge}</span>
      <div className="lp-line"><h2>{children}</h2></div>
      {sub && <p>{sub}</p>}
    </div>
  );
}

/** Public landing page. Sign In / Register opens an overlay; after signing in, the dashboard opens. */
export function LandingPage({ openAuth = false }: { openAuth?: boolean }) {
  const { session } = useAuth();
  const [authOpen, setAuthOpen] = useState(openAuth);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const trigger = useRef<HTMLElement | null>(null);

  const open = () => { trigger.current = document.activeElement as HTMLElement | null; setAuthOpen(true); };
  const close = useCallback(() => { setAuthOpen(false); trigger.current?.focus(); }, []);
  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  if (session) return <Navigate to={homePath(session.role)} replace />;

  return (
    <div className="lp">
      <header className="lp-nav">
        <div className="lp-navin">
          <div className="lp-logo"><span className="lp-mark"><Icon name="campus" size={16} /></span><b>E-Campus Helpdesk</b></div>
          <nav className="lp-links" aria-label="Page sections">
            {NAV.map((n) => <button key={n.id} type="button" onClick={() => go(n.id)}>{n.label}</button>)}
          </nav>
          <ThemeToggle variant="icon" />
          <button type="button" className="lp-btn lp-btn-d" onClick={open}>Sign In / Register</button>
        </div>
      </header>

      <section className="lp-hero">
        <div className="lp-herophoto" aria-hidden="true" />
        <div className="lp-herotint" aria-hidden="true" />
        <div className="lp-wrap lp-herocontent">
          <span className="lp-pill lp-pill-dark"><i />Campus Support Portal</span>
          <h1>One Portal for Every <em>Campus Request</em></h1>
          <p>Report problems, ask for help and submit applications in one place. Follow every request from Submitted to Resolved.</p>
          <div className="lp-cta">
            <button type="button" className="lp-btn lp-btn-a" onClick={open}>Get Started</button>
            <button type="button" className="lp-btn lp-btn-w" onClick={() => go('features')}>Learn more</button>
          </div>
        </div>
      </section>

      <section id="features" className="lp-sec lp-first">
        <i className="lp-ring lp-ring-a" aria-hidden="true" /><i className="lp-ring lp-ring-b" aria-hidden="true" />
        <div className="lp-wrap">
          <SectionHead badge="Features" sub="One place for problems, help and applications">Why Students and Staff Use <em>E-Campus Helpdesk</em></SectionHead>
          <div className="lp-grid3">
            {FEATURES.map((f, i) => (
              <article key={f.title} className="lp-card">
                <span className="lp-num">0{i + 1}</span>
                <div className="lp-ic"><Icon name={f.icon} size={18} /></div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
                <button type="button" className="lp-btn lp-btn-w lp-btn-block" onClick={open}>Get started</button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="lp-sec lp-alt">
        <div className="lp-wrap">
          <SectionHead badge="How it works">Four <em>simple</em> steps</SectionHead>
          <div className="lp-grid4">
            {STEPS.map((s, i) => (
              <article key={s.title} className="lp-card">
                <div className="lp-n">{i + 1}</div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="who" className="lp-sec">
        <i className="lp-ring lp-ring-c" aria-hidden="true" />
        <div className="lp-wrap">
          <SectionHead badge="Who it is for">Built for the <em>whole campus</em></SectionHead>
          <div className="lp-grid2">
            <article className="lp-card lp-who">
              <span className="lp-tag">Students &amp; Staff / Faculty</span>
              <h3>Your own requests, in one list</h3>
              <ul><li>Submit and track your own requests</li><li>Reply when staff need more information</li><li>Reopen a resolved complaint</li><li>See only your own records</li></ul>
            </article>
            <article className="lp-card lp-who">
              <span className="lp-tag">Administrators</span>
              <h3>Manage everything from one dashboard</h3>
              <ul><li>See all requests and filter them</li><li>Assign teams and update status</li><li>Add private notes and public replies</li><li>View reports and export CSV</li></ul>
            </article>
          </div>
        </div>
      </section>

      <section id="faq" className="lp-sec lp-alt">
        <div className="lp-wrap">
          <SectionHead badge="FAQ">Common <em>questions</em></SectionHead>
          <div className="lp-faq">
            {FAQ.map((f, i) => (
              <div key={f.q} className="lp-q">
                <button type="button" aria-expanded={openFaq === i} aria-controls={`faq-${i}`} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span>{f.q}</span><i aria-hidden="true">{openFaq === i ? '–' : '+'}</i>
                </button>
                {openFaq === i && <p id={`faq-${i}`}>{f.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-band">
        <div className="lp-bandphoto" aria-hidden="true" /><div className="lp-bandtint" aria-hidden="true" />
        <div className="lp-bandin">
          <h2>Ready to <em>get started?</em></h2>
          <p>Create an account or sign in to report, request and track.</p>
          <button type="button" className="lp-btn lp-btn-a" onClick={open}>Sign In / Register</button>
        </div>
      </section>

      <footer className="lp-foot">
        <div className="lp-wrap lp-footgrid">
          <div className="lp-fbrand">
            <div className="lp-logo"><span className="lp-mark"><Icon name="campus" size={14} /></span><b>E-Campus Helpdesk</b></div>
            <p>Report problems, ask for help and send applications in one place.</p>
          </div>
          <nav aria-label="Portal">
            <h4>Portal</h4>
            <ul>
              {NAV.map((n) => <li key={n.id}><button type="button" onClick={() => go(n.id)}>{n.label}</button></li>)}
              <li><button type="button" onClick={open}>Sign In / Register</button></li>
            </ul>
          </nav>
          <nav aria-label="Services">
            <h4>Services</h4>
            <ul>
              {['Report a Problem', 'Request Help', 'Applications & Services', 'My Requests'].map((t) => <li key={t}><button type="button" onClick={open}>{t}</button></li>)}
            </ul>
          </nav>
          <div>
            <h4>Support</h4>
            <ul className="lp-fsup">
              <li>helpdesk@yourcampus.edu</li>
              <li>+92 XXX XXXXXXX</li>
              <li>Block A, Room 101</li>
              <li>Mon–Fri, 9:00 AM – 5:00 PM</li>
            </ul>
          </div>
        </div>
        <div className="lp-wrap lp-footbar">
          <span>© 2026 E-Campus Helpdesk. All rights reserved.</span>
          <span>Prototype: accounts and requests are saved in this browser only.</span>
        </div>
      </footer>

      {authOpen && <AuthModal onClose={close} />}
    </div>
  );
}
