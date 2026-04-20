import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { academiesApi } from '../../api/academies';
import type { AcademyPublic } from '../../types';

export default function Home() {
  const [academies, setAcademies] = useState<AcademyPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    academiesApi.list().then(setAcademies).finally(() => setLoading(false));
  }, []);

  const filtered = academies.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.address ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Hero */}
      <header className="relative overflow-hidden border-b border-gray-800">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/40 via-gray-950 to-gray-950" />
        <div className="relative max-w-7xl mx-auto px-4 pt-20 pb-16 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-primary-600/10 border border-primary-500/20 rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 bg-primary-400 rounded-full animate-pulse" />
            <span className="text-primary-300 text-sm font-medium">Plataforma de Jiu-Jitsu</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
            Encuentra tu <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-blue-400">Academia</span>
          </h1>
          <p className="mt-5 max-w-xl mx-auto text-lg text-gray-400 leading-relaxed">
            Descubre las mejores academias de Jiu-Jitsu, compara horarios y participa en torneos.
          </p>

          {/* Search */}
          <div className="mt-8 max-w-lg mx-auto relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por nombre o ubicación..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-12 pr-4 py-3.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
            />
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              to="/login"
              className="bg-primary-600 hover:bg-primary-500 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Registra tu academia
            </Link>
          </div>
        </div>
      </header>

      {/* Stats */}
      {!loading && academies.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{academies.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">Academias</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{academies.reduce((n, a) => n + a.schedules.length, 0)}</p>
              <p className="text-xs text-gray-500 mt-0.5">Clases</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{academies.reduce((n, a) => n + a.tournaments.length, 0)}</p>
              <p className="text-xs text-gray-500 mt-0.5">Torneos</p>
            </div>
          </div>
        </div>
      )}

      {/* Academy Grid */}
      <section className="max-w-7xl mx-auto px-4 pb-24 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">Academias</h2>
          {search && (
            <span className="text-sm text-gray-500">
              {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-900 rounded-xl h-80 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🥋</div>
            <p className="text-gray-400 text-lg">
              {search ? 'No se encontraron academias con esa búsqueda.' : 'Aún no hay academias registradas. ¡Sé el primero!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((academy) => (
              <Link
                key={academy.id}
                to={`/academies/${academy.id}`}
                className="group bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-primary-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary-500/5"
              >
                {/* Cover */}
                <div className="h-44 bg-gradient-to-br from-primary-700 to-primary-900 relative overflow-hidden">
                  {academy.logoUrl ? (
                    <img
                      src={academy.logoUrl}
                      alt={academy.name}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <span className="text-7xl font-black text-white/10 group-hover:text-white/15 transition-colors">
                        {academy.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  {/* Badges */}
                  <div className="absolute top-3 right-3 flex gap-1.5">
                    {academy.schedules.length > 0 && (
                      <span className="bg-black/50 backdrop-blur text-white text-xs px-2 py-0.5 rounded-full">
                        {academy.schedules.length} clases
                      </span>
                    )}
                  </div>
                </div>

                {/* Body */}
                <div className="p-5">
                  <h3 className="text-lg font-bold text-white group-hover:text-primary-400 transition-colors truncate">
                    {academy.name}
                  </h3>
                  {academy.address && (
                    <p className="text-gray-500 text-sm mt-1 flex items-center gap-1.5 truncate">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {academy.address}
                    </p>
                  )}
                  <p className="text-gray-400 text-sm mt-3 line-clamp-2 leading-relaxed">
                    {academy.description || 'Sin descripción'}
                  </p>

                  {/* Footer */}
                  <div className="mt-4 pt-4 border-t border-gray-800 flex items-center justify-between">
                    <div className="flex gap-3 text-xs text-gray-500">
                      {academy.tournaments.length > 0 && (
                        <span>🏆 {academy.tournaments.length} torneos</span>
                      )}
                      {academy.photos.length > 0 && (
                        <span>📷 {academy.photos.length} fotos</span>
                      )}
                    </div>
                    <span className="text-xs text-primary-400 font-medium group-hover:translate-x-0.5 transition-transform">
                      Ver →
                    </span>
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
