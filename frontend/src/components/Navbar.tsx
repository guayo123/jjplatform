import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function Navbar() {
  const { academyName, role, logout } = useAuthStore();
  const navigate = useNavigate();
  const isAdmin = role === 'ADMIN';
  const isSuperAdmin = role === 'SUPER_ADMIN';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-primary-700 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link to={isSuperAdmin ? '/super/academies' : '/admin'} className="text-xl font-bold tracking-tight">
              JJPlatform
            </Link>
            <div className="hidden md:flex gap-4">
              {isSuperAdmin ? (
                <NavLink to="/super/academies">Academias</NavLink>
              ) : (
                <>
                  <NavLink to="/admin/students">Alumnos</NavLink>
                  <NavLink to="/admin/payments">Pagos</NavLink>
                  <NavLink to="/admin/payments/report">Reporte</NavLink>
                  <NavLink to="/admin/tournaments">Torneos</NavLink>
                  <NavLink to="/admin/photos">Fotos</NavLink>
                  {isAdmin && <NavLink to="/admin/users">Usuarios</NavLink>}
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="block text-sm text-primary-200">
                {isSuperAdmin ? 'Plataforma' : academyName}
              </span>
              {role && (
                <span className="block text-xs text-primary-400 capitalize">{role.toLowerCase()}</span>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="text-sm bg-primary-800 hover:bg-primary-900 px-3 py-1.5 rounded transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="text-primary-100 hover:text-white transition-colors text-sm font-medium"
    >
      {children}
    </Link>
  );
}
