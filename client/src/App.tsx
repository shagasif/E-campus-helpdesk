import { BrowserRouter, HashRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { AuthProvider, homePath, useAuth } from './context/AuthContext';
import { ComplaintsProvider } from './context/ComplaintsContext';
import { ToastProvider } from './context/ToastContext';
import { AppLayout } from './components/AppLayout';
import { RequireRole } from './components/RequireRole';
import { EmptyState } from './components/EmptyState';
import { LoginPage } from './pages/LoginPage';
import { UserDashboardPage } from './pages/UserDashboardPage';
import { UserComplaintsPage } from './pages/UserComplaintsPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminComplaintsPage } from './pages/AdminComplaintsPage';
import { ReportIssuePage } from './pages/ReportIssuePage';
import { ComplaintDetailsPage } from './pages/ComplaintDetailsPage';
import { ProfilePage } from './pages/ProfilePage';

function HomeRedirect() {
  const { session } = useAuth();
  return <Navigate to={session ? homePath(session.role) : '/login'} replace />;
}

// Old admin links (/admin/complaints/ID) now open the details drawer.
function OpenInDrawer() {
  const { id } = useParams();
  return <Navigate to={`/admin/complaints?open=${encodeURIComponent(id ?? '')}`} replace />;
}

// A single-file preview opened from disk (file://) cannot use clean URLs, so it uses #/ URLs instead.
const Router = window.location.protocol === 'file:' ? HashRouter : BrowserRouter;

export default function App() {
  return (
    <AuthProvider>
      <ComplaintsProvider>
        <ToastProvider>
          <Router>
            <Routes>
              <Route path="/" element={<HomeRedirect />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/admin" element={<RequireRole role="admin"><AppLayout /></RequireRole>}>
                <Route index element={<AdminDashboardPage />} />
                <Route path="complaints" element={<AdminComplaintsPage />} />
                <Route path="complaints/:id" element={<OpenInDrawer />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="*" element={<EmptyState icon="search" title="Page not found" text="That page does not exist." />} />
              </Route>
              <Route path="/user" element={<RequireRole role="user"><AppLayout /></RequireRole>}>
                <Route index element={<UserDashboardPage />} />
                <Route path="report" element={<ReportIssuePage />} />
                <Route path="complaints" element={<UserComplaintsPage />} />
                <Route path="complaints/:id" element={<ComplaintDetailsPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="*" element={<EmptyState icon="search" title="Page not found" text="That page does not exist." />} />
              </Route>
              <Route path="*" element={<HomeRedirect />} />
            </Routes>
          </Router>
        </ToastProvider>
      </ComplaintsProvider>
    </AuthProvider>
  );
}
