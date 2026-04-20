import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { tournamentsApi } from '../../api/tournaments';
import type { Tournament } from '../../types';

export default function Tournaments() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', date: '', maxParticipants: '',
    tipo: 'CATEGORIAS' as 'CATEGORIAS' | 'ABSOLUTO',
  });

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = () => {
    setLoading(true);
    tournamentsApi.list().then(setTournaments).finally(() => setLoading(false));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await tournamentsApi.create({
      name: form.name,
      description: form.description || undefined,
      date: form.date,
      maxParticipants: form.maxParticipants ? Number(form.maxParticipants) : undefined,
      tipo: form.tipo,
    });
    setShowForm(false);
    setForm({ name: '', description: '', date: '', maxParticipants: '', tipo: 'CATEGORIAS' });
    loadTournaments();
  };

  const statusLabel = (s: string) =>
    s === 'OPEN' ? 'Abierto' : s === 'IN_PROGRESS' ? 'En curso' : 'Finalizado';

  const statusColor = (s: string) =>
    s === 'OPEN' ? 'bg-green-100 text-green-700' :
    s === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-700' :
    'bg-gray-100 text-gray-600';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Torneos</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Nuevo torneo
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-sm p-6 mb-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Máximo participantes</label>
              <input
                type="number"
                value={form.maxParticipants}
                onChange={(e) => setForm({ ...form, maxParticipants: e.target.value })}
                min={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Tipo de torneo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de torneo</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, tipo: 'CATEGORIAS' })}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${form.tipo === 'CATEGORIAS' ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
              >
                Por categorías
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, tipo: 'ABSOLUTO' })}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${form.tipo === 'ABSOLUTO' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
              >
                Absoluto
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-400">
              {form.tipo === 'CATEGORIAS'
                ? 'Al generar el bracket, los participantes se agrupan automáticamente por categoría de edad, cinturón y peso.'
                : 'Todos los participantes quedan en una sola llave, sin agrupación por categoría.'}
            </p>
          </div>

          <button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            Crear torneo
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-gray-400">Cargando...</p>
      ) : tournaments.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <p className="text-gray-500">No hay torneos creados</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tournaments.map((t) => (
            <Link
              key={t.id}
              to={`/admin/tournaments/${t.id}`}
              className="bg-white rounded-xl shadow-sm hover:shadow-md p-6 transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-lg">{t.name}</h3>
                    {t.tipo === 'ABSOLUTO' && (
                      <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">Absoluto</span>
                    )}
                  </div>
                  <p className="text-gray-500 text-sm mt-1">{t.date}</p>
                  {t.description && <p className="text-gray-400 text-sm mt-1">{t.description}</p>}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor(t.status)}`}>
                  {statusLabel(t.status)}
                </span>
              </div>
              <div className="mt-4 text-sm text-gray-500">
                {t.participants.length} participantes · {t.matches.length} combates
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
