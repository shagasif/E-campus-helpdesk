import { BrowserRouter, HashRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { AuthProvider, homePath, useAuth } from './context/AuthContext';
import { ComplaintsProvider } from './context/ComplaintsContext';
import { RequestsProvider } from './context/RequestsContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { AppLayout } from './components/AppLayout';
import { RequireRole } from './components/RequireRole';
import { EmptyState } from './components/EmptyState';
import { LandingPage } from './pages/LandingPage';
import { UserDashboardPage } from './pages/UserDashboardPage';
import { MyRequestsPage } from './pages/MyRequestsPage';
import { RequestHelpPage } from './pages/RequestHelpPage';
import { ApplicationsPage } from './pages/ApplicationsPage';
import { RequestDetailsPage } from './pages/RequestDetailsPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminComplaintsPage } from './pages/AdminComplaintsPage';
import { AdminRequestsPage } from './pages/AdminRequestsPage';
import { AdminRequestDetailsPage } from './pages/AdminRequestDetailsPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { AdminTeamsPage } from './pages/AdminTeamsPage';
import { AdminReportsPage } from './pages/AdminReportsPage';
import { AdminSettingsPage } from './pages/AdminSettingsPage';
import { ReportIssuePage } from './pages/ReportIssuePage';
import { ComplaintDetailsPage } from './pages/ComplaintDetailsPage';
import { ProfilePage } from './pages/ProfilePage';

function HomeRedirect() {
  const { session } = useAuth();
  return <Navigate to={session ? homePath(session.role) : '/'} replace />;
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
    <ThemeProvider>
    <AuthProvider>
      <ComplaintsProvider>
        <RequestsProvider>
        <ToastProvider>
          <Router>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LandingPage openAuth />} />
              <Route path="/admin" element={<RequireRole role="admin"><AppLayout /></RequireRole>}>
                <Route index element={<AdminDashboardPage />} />
                <Route path="requests" element={<AdminRequestsPage scope="all" />} />
                <Route path="requests/:id" element={<AdminRequestDetailsPage />} />
                <Route path="help" element={<AdminRequestsPage scope="help" />} />
                <Route path="applications" element={<AdminRequestsPage scope="application" />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="teams" element={<AdminTeamsPage />} />
                <Route path="reports" element={<AdminReportsPage />} />
                <Route path="settings" element={<AdminSettingsPage />} />
                <Route path="complaints" element={<AdminComplaintsPage />} />
                <Route path="complaints/:id" element={<OpenInDrawer />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="*" element={<EmptyState icon="search" title="Page not found" text="That page does not exist." />} />
              </Route>
              <Route path="/user" element={<RequireRole role="user"><AppLayout /></RequireRole>}>
                <Route index element={<UserDashboardPage />} />
                <Route path="report" element={<ReportIssuePage />} />
                <Route path="help" element={<RequestHelpPage />} />
                <Route path="applications" element={<ApplicationsPage />} />
                <Route path="requests" element={<MyRequestsPage />} />
                <Route path="requests/:id" element={<RequestDetailsPage />} />
                <Route path="complaints" element={<Navigate to="/user/requests?type=complaint" replace />} />
                <Route path="complaints/:id" element={<ComplaintDetailsPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="*" element={<EmptyState icon="search" title="Page not found" text="That page does not exist." />} />
              </Route>
              <Route path="*" element={<HomeRedirect />} />
            </Routes>
          </Router>
        </ToastProvider>
        </RequestsProvider>
      </ComplaintsProvider>
    </AuthProvider>
    </ThemeProvider>
  );
}
