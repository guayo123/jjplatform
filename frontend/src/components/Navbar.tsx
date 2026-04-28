import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const PRIMARY_LINKS = [
  { to: '/admin/students',       label: 'Alumnos' },
  { to: '/admin/payments',       label: 'Pagos' },
  { to: '/admin/payments/report',label: 'Reporte' },
  { to: '/admin/tournaments',    label: 'Torneos' },
];

const GESTION_LINKS = [
  { to: '/admin/professors',     label: 'Profesores' },
  { to: '/admin/disciplines',    label: 'Disciplinas' },
  { to: '/admin/plans',          label: 'Planes' },
  { to: '/admin/schedules',      label: 'Horarios' },
  { to: '/admin/photos',         label: 'Fotos' },
  { to: '/admin/settings',       label: 'Configuración' },
];

export default function Navbar() {
  const { academyName, role, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = role === 'ADMIN';
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const [menuOpen, setMenuOpen] = useState(false);
  const [gestionOpen, setGestionOpen] = useState(false);
  const gestionRef = useRef<HTMLDivElement>(null);

  const allLinks = isSuperAdmin
    ? [{ to: '/super/academies', label: 'Academias' }]
    : [
        ...PRIMARY_LINKS,
        ...GESTION_LINKS,
        ...(isAdmin ? [{ to: '/admin/users', label: 'Usuarios' }] : []),
      ];

  const gestionLinks = isAdmin
    ? [...GESTION_LINKS, { to: '/admin/users', label: 'Usuarios' }]
    : GESTION_LINKS;

  const gestionActive = gestionLinks.some(l => location.pathname === l.to);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (gestionRef.current && !gestionRef.current.contains(e.target as Node)) {
        setGestionOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <nav className="bg-primary-700 text-white shadow-lg relative z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link
            to={isSuperAdmin ? '/super/academies' : '/admin'}
            className="text-xl font-bold tracking-tight flex-shrink-0"
          >
            JJPlatform
          </Link>

          {/* Desktop links */}
          <div className="hidden lg:flex items-center gap-1 flex-1 ml-6">
            {isSuperAdmin ? (
              <DesktopLink to="/super/academies" active={location.pathname === '/super/academies'}>Academias</DesktopLink>
            ) : (
              <>
                {PRIMARY_LINKS.map(l => (
                  <DesktopLink key={l.to} to={l.to} active={location.pathname === l.to}>{l.label}</DesktopLink>
                ))}

                {/* Gestión dropdown */}
                <div ref={gestionRef} className="relative">
                  <button
                    onClick={() => setGestionOpen(o => !o)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      gestionActive
                        ? 'bg-primary-600 text-white'
                        : 'text-primary-100 hover:text-white hover:bg-primary-600/60'
                    }`}
                  >
                    Gestión
                    <svg className={`w-3.5 h-3.5 transition-transform ${gestionOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {gestionOpen && (
                    <div className="absolute left-0 top-full mt-1 w-44 bg-primary-800 border border-primary-600 rounded-xl shadow-xl py-1 z-50">
                      {gestionLinks.map(l => (
                        <Link
                          key={l.to}
                          to={l.to}
                          onClick={() => setGestionOpen(false)}
                          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                            location.pathname === l.to
                              ? 'bg-primary-600 text-white'
                              : 'text-primary-100 hover:bg-primary-700 hover:text-white'
                          }`}
                        >
                          {l.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <span className="block text-sm text-primary-200">
                {isSuperAdmin ? 'Plataforma' : academyName}
              </span>
              {role && (
                <span className="block text-xs text-primary-400 capitalize">{role.toLowerCase()}</span>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="hidden sm:block text-sm bg-primary-800 hover:bg-primary-900 px-3 py-1.5 rounded transition-colors"
            >
              Cerrar sesión
            </button>

            {/* Hamburger */}
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="lg:hidden p-2 rounded-lg hover:bg-primary-600 transition-colors"
              aria-label="Menú"
            >
              {menuOpen ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="lg:hidden border-t border-primary-600 bg-primary-800">
          <div className="max-w-7xl mx-auto px-4 py-3 space-y-1">
            {allLinks.map(l => (
              <MobileLink key={l.to} to={l.to} active={location.pathname === l.to} onClick={() => setMenuOpen(false)}>
                {l.label}
              </MobileLink>
            ))}
            <div className="pt-3 mt-3 border-t border-primary-700 flex items-center justify-between">
              <div>
                <p className="text-sm text-primary-200">{isSuperAdmin ? 'Plataforma' : academyName}</p>
                {role && <p className="text-xs text-primary-400 capitalize">{role.toLowerCase()}</p>}
              </div>
              <button onClick={handleLogout} className="text-sm bg-primary-700 hover:bg-primary-900 px-3 py-1.5 rounded transition-colors">
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

function DesktopLink({ to, active, children }: { to: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
        active ? 'bg-primary-600 text-white' : 'text-primary-100 hover:text-white hover:bg-primary-600/60'
      }`}
    >
      {children}
    </Link>
  );
}

function MobileLink({ to, active, onClick, children }: { to: string; active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        active ? 'bg-primary-600 text-white' : 'text-primary-100 hover:text-white hover:bg-primary-600/60'
      }`}
    >
      {children}
    </Link>
  );
}
