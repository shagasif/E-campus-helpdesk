import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { ErrorBoundary } from './ErrorBoundary';
import { useComplaints } from '../context/ComplaintsContext';
import { useRequests } from '../context/RequestsContext';
import { Icon } from './Icon';

export function AppLayout() {
  const { warning: complaintsWarning } = useComplaints();
  const { warning: requestsWarning } = useRequests();
  const warning = complaintsWarning ?? requestsWarning;
  return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        {warning && <div className="alert alert-warn" role="alert"><Icon name="alert" size={18} /><span>{warning}</span></div>}
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
