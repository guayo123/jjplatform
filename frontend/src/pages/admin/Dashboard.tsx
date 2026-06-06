import { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { Link } from 'react-router-dom';
import { useGuidedTour } from '../../utils/useGuidedTour';

export default function Dashboard() {
  const academyName = useAuthStore((s) => s.academyName);
  const role = useAuthStore((s) => s.role);
  const isAdmin = role === 'ADMIN';

  // No data to load; flip a synthetic flag after mount so the tour fires once on the false edge.
  const [tourLoading, setTourLoading] = useState(true);
  useEffect(() => { setTourLoading(false); }, []);

  const startTour = useGuidedTour({
    storageKey: 'jjp_dashboard_tour',
    welcomeTitle: '👋 ¡Bienvenido!',
    welcomeBody: '<p>Este es tu panel. Desde aquí accedes a todas las secciones de tu academia.</p>',
    loading: tourLoading,
    buildSteps: () => [
      {
        element: '[data-tour="dash-cards"]',
        popover: { title: '🧭 Secciones', description: 'Toca cualquier tarjeta para ir a esa sección: alumnos, pagos, torneos, profesores, planes y más. En cada pantalla verás un botón "?" con su propia ayuda.', side: 'top', align: 'center' },
      },
    ],
  });

  const cards = [
    { title: 'Alumnos',        desc: 'Gestiona tu lista de estudiantes',      link: '/admin/students',         icon: '👥' },
    { title: 'Pagos',          desc: 'Control de pagos mensuales',             link: '/admin/payments',         icon: '💰' },
    { title: 'Reporte',        desc: 'Resumen de ingresos y pagos',            link: '/admin/payments/report',  icon: '📊' },
    { title: 'Torneos',        desc: 'Crea torneos y genera brackets',         link: '/admin/tournaments',      icon: '🏆' },
    { title: 'Profesores',     desc: 'Instructores de tu academia',            link: '/admin/professors',       icon: '🥋' },
    { title: 'Disciplinas',    desc: 'Artes marciales que ofreces',            link: '/admin/disciplines',      icon: '🎯' },
    { title: 'Planes',         desc: 'Define los planes de membresía',         link: '/admin/plans',            icon: '📋' },
    { title: 'Horarios',       desc: 'Grilla semanal de clases',               link: '/admin/schedules',        icon: '📅' },
    { title: 'Fotos',          desc: 'Galería de tu academia',                 link: '/admin/photos',           icon: '📸' },
    { title: 'Configuración',  desc: 'Datos, redes sociales y perfil público', link: '/admin/settings',         icon: '⚙️' },
    ...(isAdmin ? [{ title: 'Usuarios', desc: 'Gestión de accesos y roles', link: '/admin/users', icon: '🔐' }] : []),
  ];

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Bienvenido</h1>
          <p className="text-gray-500">{academyName}</p>
        </div>
        <button
          onClick={startTour}
          title="Ayuda"
          aria-label="Ayuda"
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 text-gray-500 hover:text-gray-700 hover:border-gray-400 text-sm font-bold transition-colors flex-shrink-0"
        >
          ?
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" data-tour="dash-cards">
        {cards.map((card) => (
          <Link
            key={card.title}
            to={card.link}
            className="bg-white rounded-xl shadow-sm hover:shadow-md p-6 transition-all hover:-translate-y-0.5"
          >
            <span className="text-3xl mb-3 block">{card.icon}</span>
            <h3 className="font-semibold text-lg">{card.title}</h3>
            <p className="text-gray-500 text-sm mt-1">{card.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
