import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export const RETURN_KEY = 'portal.returnTo';

/** Where a student lands after signing in: the page that sent them to log in, else the portal. */
export function takeReturnPath(): string {
  const to = sessionStorage.getItem(RETURN_KEY);
  sessionStorage.removeItem(RETURN_KEY);
  return to && to.startsWith('/asistencia/') ? to : '/portal';
}

/** Guards the student portal: only the STUDENT role may enter, and temp-password users are
 *  funnelled through the change-password screen first. */
export default function StudentRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.role);
  const mustChangePassword = useAuthStore((s) => s.mustChangePassword);
  const location = useLocation();

  if (!isAuthenticated) {
    // Come back here after signing in (e.g. the attendance QR scanned before logging in).
    if (location.pathname !== '/portal') sessionStorage.setItem(RETURN_KEY, location.pathname);
    return <Navigate to="/portal/login" replace />;
  }
  if (role !== 'STUDENT') {
    return <Navigate to="/admin" replace />;
  }
  if (mustChangePassword && location.pathname !== '/portal/cambiar-clave') {
    return <Navigate to="/portal/cambiar-clave" replace />;
  }
  return <Outlet />;
}
