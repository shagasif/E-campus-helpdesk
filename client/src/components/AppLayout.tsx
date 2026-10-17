import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { ErrorBoundary } from './ErrorBoundary';
import { useComplaints } from '../context/ComplaintsContext';
import { Icon } from './Icon';

export function AppLayout() {
  const { warning } = useComplaints();
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
