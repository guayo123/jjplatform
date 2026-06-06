import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

/** Guards the student portal: only the STUDENT role may enter, and temp-password users are
 *  funnelled through the change-password screen first. */
export default function StudentRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.role);
  const mustChangePassword = useAuthStore((s) => s.mustChangePassword);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (role !== 'STUDENT') {
    return <Navigate to="/admin" replace />;
  }
  if (mustChangePassword && location.pathname !== '/portal/cambiar-clave') {
    return <Navigate to="/portal/cambiar-clave" replace />;
  }
  return <Outlet />;
}
