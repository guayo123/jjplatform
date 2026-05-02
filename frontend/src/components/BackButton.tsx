import { Link, useLocation } from 'react-router-dom';

function resolveBack(pathname: string): string | null {
  if (/^\/admin\/students\/\d+\/edit$/.test(pathname))   return pathname.replace('/edit', '');
  if (/^\/admin\/students\/\d+$/.test(pathname))         return '/admin/students';
  if (/^\/admin\/students\/new$/.test(pathname))         return '/admin/students';
  if (/^\/admin\/professors\/\d+\/edit$/.test(pathname)) return '/admin/professors';
  if (/^\/admin\/professors\/new$/.test(pathname))       return '/admin/professors';
  if (/^\/admin\/tournaments\/\d+$/.test(pathname))      return '/admin/tournaments';
  if (pathname === '/admin/payments/report')             return '/admin/payments';

  const SECTIONS = [
    '/admin/students', '/admin/payments', '/admin/tournaments',
    '/admin/professors', '/admin/disciplines', '/admin/plans',
    '/admin/schedules', '/admin/photos', '/admin/users',
    '/admin/settings',
  ];
  if (SECTIONS.includes(pathname)) return '/admin';

  return null;
}

function resolveLabel(pathname: string): string {
  if (/^\/admin\/students\/\d+\/edit$/.test(pathname))   return 'Detalle alumno';
  if (/^\/admin\/students\/\d+$/.test(pathname))         return 'Alumnos';
  if (/^\/admin\/students\/new$/.test(pathname))         return 'Alumnos';
  if (/^\/admin\/professors\/\d+\/edit$/.test(pathname)) return 'Profesores';
  if (/^\/admin\/professors\/new$/.test(pathname))       return 'Profesores';
  if (/^\/admin\/tournaments\/\d+$/.test(pathname))      return 'Torneos';
  if (pathname === '/admin/payments/report')             return 'Pagos';
  return 'Inicio';
}

export default function BackButton() {
  const { pathname } = useLocation();
  const back = resolveBack(pathname);
  if (!back) return null;

  return (
    <Link
      to={back}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors group mb-4"
    >
      <span className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm group-hover:border-gray-400 group-hover:shadow transition-all">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </span>
      <span className="hidden sm:inline">{resolveLabel(pathname)}</span>
    </Link>
  );
}
