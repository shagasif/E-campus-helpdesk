import { Link } from 'react-router-dom';
import { useComplaints } from '../context/ComplaintsContext';
import { useBase } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Icon } from '../components/Icon';
import { cloudEnabled } from '../utils/supabase';

/** Only settings that really work in this prototype. */
export function AdminSettingsPage() {
  const { hasDemo, removeDemoData } = useComplaints();
  const { toast } = useToast();
  const base = useBase();

  return (
    <>
      <header className="page-head">
        <h1>Settings</h1>
        <p className="muted">Maintenance options for this prototype.</p>
      </header>

      <section className="card">
        <h2>Sample data</h2>
        <p className="muted">{hasDemo ? 'Sample complaints are included so the dashboard has something to show. They are not real reports.' : 'There are no sample complaints in this browser.'}</p>
        <button type="button" className="btn btn-secondary" disabled={!hasDemo} onClick={() => { removeDemoData(); toast('Sample data removed.'); }}>Remove sample data</button>
      </section>

      <section className="card">
        <h2>Your account</h2>
        <p className="muted">Change your name, photo or password on the Profile page.</p>
        <Link className="btn btn-secondary" to={`${base}/profile`}><Icon name="user" size={18} /> Open profile</Link>
      </section>

      <section className="card">
        <h2>About storage</h2>
        <ul className="plain-list">
          {cloudEnabled ? (
            <>
              <li>Accounts, complaints, help requests and applications are saved in your Supabase database and shared between devices and people.</li>
              <li>Sign in uses Supabase Auth. Row Level Security makes sure people only see their own requests, and only administrators can change them.</li>
              <li>Email notifications and file attachments other than pictures are not part of this project.</li>
            </>
          ) : (
            <>
              <li>Accounts, complaints, help requests and applications are saved in this browser only (localStorage).</li>
              <li>They are not shared between devices or people, and clearing the browser's site data deletes them.</li>
              <li>The login is for demonstration and is not real security.</li>
              <li>File attachments, email notifications, real staff accounts and role permissions need a backend and a database. Add the two Supabase values in client/.env.local to turn them on.</li>
            </>
          )}
        </ul>
      </section>
    </>
  );
}
