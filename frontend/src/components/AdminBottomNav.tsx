import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CalendarBlank, DotsThreeOutline, House, SignOut, UsersThree, Wallet, X } from '@phosphor-icons/react';
import { useAuthStore } from '../stores/authStore';
import { ADMIN_ONLY_LINKS, GESTION_LINKS, NAV_ICONS, PRIMARY_LINKS } from './adminNav';

const TABS = [
  { to: '/admin', label: 'Inicio', icon: House, exact: true },
  { to: '/admin/students', label: 'Alumnos', icon: UsersThree },
  { to: '/admin/payments', label: 'Pagos', icon: Wallet },
  { to: '/admin/schedules', label: 'Horarios', icon: CalendarBlank },
];

/**
 * Barra de navegacion inferior del panel en el movil (alcance con el pulgar). En escritorio
 * se oculta y manda la barra superior. "Mas" abre una hoja con el resto de las secciones.
 */
export default function AdminBottomNav() {
  const { role, academyName, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  if (role === 'SUPER_ADMIN') return null;

  const isActive = (to: string, exact?: boolean) =>
    exact ? location.pathname === to : location.pathname === to || location.pathname.startsWith(to + '/');

  const moreLinks = [
    ...PRIMARY_LINKS.filter((l) => !TABS.some((t) => t.to === l.to)),
    ...GESTION_LINKS.filter((l) => !TABS.some((t) => t.to === l.to)),
    ...(role === 'ADMIN' ? ADMIN_ONLY_LINKS : []),
  ];
  const moreActive = moreLinks.some((l) => isActive(l.to));

  return (
    <>
      {open && (
        <div className="lg:hidden fixed inset-0 z-[60]">
          <button aria-label="Cerrar" className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="sticky top-0 flex items-center justify-between bg-white px-4 py-3 border-b border-gray-100">
              <p className="font-semibold text-gray-900 truncate">{academyName}</p>
              <button onClick={() => setOpen(false)} aria-label="Cerrar menú" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100">
                <X size={20} weight="bold" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 p-3">
              {moreLinks.map((l) => {
                const Ico = NAV_ICONS[l.to];
                const active = isActive(l.to);
                return (
                  <Link
                    key={l.to}
                    to={l.to}
                    className={`flex min-h-[52px] items-center gap-3 rounded-xl border px-3 py-2 text-sm font-medium ${
                      active ? 'border-primary-300 bg-primary-50 text-primary-800' : 'border-gray-200 text-gray-700 active:bg-gray-50'
                    }`}
                  >
                    {Ico && <Ico size={22} weight={active ? 'fill' : 'regular'} className="flex-shrink-0" />}
                    <span className="min-w-0">{l.label}</span>
                  </Link>
                );
              })}
            </div>
            <div className="px-3">
              <button
                onClick={() => { logout(); navigate('/login'); }}
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 active:bg-gray-50"
              >
                <SignOut size={20} /> Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}

      <nav
        aria-label="Navegación principal"
        className="lg:hidden fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="grid grid-cols-5">
          {TABS.map(({ to, label, icon: Ico, exact }) => {
            const active = isActive(to, exact);
            return (
              <li key={to}>
                <Link
                  to={to}
                  aria-current={active ? 'page' : undefined}
                  className={`flex h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${active ? 'text-primary-700' : 'text-gray-500'}`}
                >
                  <Ico size={24} weight={active ? 'fill' : 'regular'} />
                  {label}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              onClick={() => setOpen(true)}
              aria-expanded={open}
              className={`flex h-16 w-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${moreActive ? 'text-primary-700' : 'text-gray-500'}`}
            >
              <DotsThreeOutline size={24} weight={moreActive ? 'fill' : 'regular'} />
              Más
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
