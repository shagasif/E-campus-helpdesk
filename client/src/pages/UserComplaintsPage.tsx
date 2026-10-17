import { UserComplaintsList } from '../components/UserComplaintsList';
import { Icon } from '../components/Icon';
import { useVisibleComplaints } from '../context/ComplaintsContext';
import { useToast } from '../context/ToastContext';
import { complaintsToCsv, downloadCsv } from '../utils/csv';

export function UserComplaintsPage() {
  const mine = useVisibleComplaints();
  const { toast } = useToast();

  function download() {
    try {
      downloadCsv(`my-complaints-${new Date().toISOString().slice(0, 10)}.csv`, complaintsToCsv(mine));
      toast(`Downloaded ${mine.length} complaint${mine.length === 1 ? '' : 's'} as CSV.`);
    } catch {
      toast('The CSV file could not be created. Please try again.', 'error');
    }
  }

  return (
    <>
      <header className="page-head page-head-row">
        <div>
          <h1>My Complaints</h1>
          <p className="muted">Every issue you have reported, newest first.</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={download} disabled={mine.length === 0}>
          <Icon name="download" size={18} /> Download CSV
        </button>
      </header>
      <UserComplaintsList />
    </>
  );
}
