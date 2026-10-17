import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { homePath, useAuth, type Role } from '../context/AuthContext';

export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  if (session.role !== role) return <Navigate to={homePath(session.role)} replace />;
  return <>{children}</>;
}
