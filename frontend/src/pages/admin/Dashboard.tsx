import { useAuthStore } from '../../stores/authStore';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const academyName = useAuthStore((s) => s.academyName);

  const cards = [
    { title: 'Alumnos', desc: 'Gestiona tu lista de estudiantes', link: '/admin/students', icon: '👥' },
    { title: 'Pagos', desc: 'Control de pagos mensuales', link: '/admin/payments', icon: '💰' },
    { title: 'Torneos', desc: 'Crea torneos y genera brackets', link: '/admin/tournaments', icon: '🏆' },
    { title: 'Fotos', desc: 'Galería de tu academia', link: '/admin/photos', icon: '📸' },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Bienvenido</h1>
      <p className="text-gray-500 mb-8">{academyName}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
