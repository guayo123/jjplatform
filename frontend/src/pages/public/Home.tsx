import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { academiesApi } from '../../api/academies';
import type { AcademyPublic } from '../../types';

export default function Home() {
  const [academies, setAcademies] = useState<AcademyPublic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    academiesApi.list().then(setAcademies).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 py-24 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl">
            <span className="block">Encuentra tu</span>
            <span className="block text-primary-400">Academia de Jiu-Jitsu</span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-xl text-gray-300">
            Descubre las mejores academias, horarios de clases y próximos torneos
            en un solo lugar.
          </p>
          <div className="mt-10">
            <Link
              to="/login"
              className="inline-block bg-primary-600 hover:bg-primary-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
            >
              Registra tu academia
            </Link>
          </div>
        </div>
      </header>

      {/* Academy Grid */}
      <section className="max-w-7xl mx-auto px-4 pb-24 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold mb-8 text-center">Academias</h2>

        {loading ? (
          <div className="text-center text-gray-400 py-12">Cargando...</div>
        ) : academies.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            Aún no hay academias registradas. ¡Sé el primero!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {academies.map((academy) => (
              <Link
                key={academy.id}
                to={`/academies/${academy.id}`}
                className="group bg-gray-800 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all hover:-translate-y-1"
              >
                <div className="h-48 bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center">
                  {academy.logoUrl ? (
                    <img
                      src={academy.logoUrl}
                      alt={academy.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-6xl font-bold text-white/20">
                      {academy.name.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold group-hover:text-primary-400 transition-colors">
                    {academy.name}
                  </h3>
                  {academy.address && (
                    <p className="text-gray-400 text-sm mt-1">{academy.address}</p>
                  )}
                  <p className="text-gray-300 text-sm mt-3 line-clamp-2">
                    {academy.description || 'Sin descripción'}
                  </p>
                  <div className="mt-4 flex gap-4 text-xs text-gray-500">
                    <span>{academy.schedules.length} clases</span>
                    <span>{academy.tournaments.length} torneos</span>
                    <span>{academy.photos.length} fotos</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
