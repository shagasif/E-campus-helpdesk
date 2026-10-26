import { Link } from 'react-router-dom';
import { Icon } from './Icon';
import { useBase } from '../context/AuthContext';
import { cloudEnabled } from '../utils/supabase';

/** Shown after a help request or application has been saved. */
export function RequestSuccessCard({ id, heading, againLabel, onAgain }: { id: string; heading: string; againLabel: string; onAgain: () => void }) {
  const base = useBase();
  return (
    <div className="card success-card" role="status">
      <span className="success-icon"><Icon name="done" size={30} /></span>
      <h2>{heading}</h2>
      <p className="muted">Your reference is:</p>
      <p className="ref-big">{id}</p>
      <p className="muted small">{cloudEnabled ? 'Saved. Staff can now see it. Keep the reference to find it later.' : 'Saved in this browser only. It is not sent to a university office, because this prototype has no backend yet. Keep the reference to find it later.'}</p>
      <div className="row">
        <Link className="btn btn-primary" to={`${base}/requests/${id}`}>View request</Link>
        <button type="button" className="btn btn-secondary" onClick={onAgain}>{againLabel}</button>
      </div>
    </div>
  );
}
