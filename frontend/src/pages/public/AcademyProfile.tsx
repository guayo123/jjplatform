import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { academiesApi } from '../../api/academies';
import type { AcademyPublic } from '../../types';

export default function AcademyProfile() {
  const { id } = useParams<{ id: string }>();
  const [academy, setAcademy] = useState<AcademyPublic | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      academiesApi.get(Number(id)).then(setAcademy).finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  if (!academy) return <div className="min-h-screen flex items-center justify-center">Academia no encontrada</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-primary-700 text-white">
        <div className="max-w-5xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <Link to="/" className="text-primary-200 hover:text-white text-sm mb-4 inline-block">
            ← Volver al listado
          </Link>
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-primary-800 rounded-full flex items-center justify-center text-3xl font-bold">
              {academy.logoUrl ? (
                <img src={academy.logoUrl} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                academy.name.charAt(0)
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold">{academy.name}</h1>
              {academy.address && <p className="text-primary-200 mt-1">{academy.address}</p>}
              {academy.phone && <p className="text-primary-200 text-sm">{academy.phone}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-10">
        {/* Description */}
        {academy.description && (
          <section>
            <h2 className="text-xl font-bold mb-3">Sobre nosotros</h2>
            <p className="text-gray-600 leading-relaxed">{academy.description}</p>
          </section>
        )}

        {/* Schedules */}
        {academy.schedules.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-4">Horarios de Clases</h2>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Día</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clase</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Horario</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {academy.schedules.map((s, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{s.dayOfWeek}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{s.className}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{s.startTime} – {s.endTime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Photos */}
        {academy.photos.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-4">Galería</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {academy.photos.map((photo) => (
                <div key={photo.id} className="aspect-square rounded-lg overflow-hidden shadow">
                  <img src={photo.url} alt={photo.caption || ''} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tournaments */}
        {academy.tournaments.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-4">Torneos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {academy.tournaments.map((t) => (
                <div key={t.id} className="bg-white rounded-lg shadow p-5">
                  <h3 className="font-semibold text-lg">{t.name}</h3>
                  <p className="text-gray-500 text-sm mt-1">Fecha: {t.date}</p>
                  <div className="mt-3 flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      t.status === 'OPEN' ? 'bg-green-100 text-green-700' :
                      t.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {t.status === 'OPEN' ? 'Abierto' : t.status === 'IN_PROGRESS' ? 'En curso' : 'Finalizado'}
                    </span>
                    <span className="text-sm text-gray-500">{t.participantCount} participantes</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
