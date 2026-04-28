import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { professorsApi } from '../../api/professors';
import { useToast } from '../../components/ToastContext';
import { useConfirm } from '../../components/ConfirmContext';
import type { Professor } from '../../types';

const BELT_COLORS: Record<string, string> = {
  Blanco:  'bg-gray-100 text-gray-700 border border-gray-300',
  Gris:    'bg-gray-300 text-gray-800',
  Amarillo:'bg-yellow-100 text-yellow-800',
  Naranja: 'bg-orange-100 text-orange-800',
  Verde:   'bg-green-100 text-green-800',
  Azul:    'bg-blue-100 text-blue-800',
  Morado:  'bg-purple-100 text-purple-800',
  Café:    'bg-amber-100 text-amber-900',
  Negro:   'bg-gray-900 text-white',
};

export default function Professors() {
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const confirm = useConfirm();

  const load = () =>
    professorsApi.list().then(setProfessors).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const handleToggleActive = async (p: Professor) => {
    try {
      const updated = await professorsApi.update(p.id, {
        name: p.name,
        photoUrl: p.photoUrl,
        bio: p.bio,
        achievements: p.achievements,
        belt: p.belt,
        displayOrder: p.displayOrder ?? 0,
        active: !p.active,
      });
      setProfessors((prev) => prev.map((x) => (x.id === p.id ? updated : x)));
    } catch {
      toast.error('Error al cambiar estado');
    }
  };

  const handleDelete = async (p: Professor) => {
    const ok = await confirm({
      message: `¿Eliminar al profesor "${p.name}"? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    try {
      await professorsApi.delete(p.id);
      setProfessors((prev) => prev.filter((x) => x.id !== p.id));
      toast.success('Profesor eliminado');
    } catch {
      toast.error('Error al eliminar');
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Profesores</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Los profesores activos se muestran en el perfil público de la academia.
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/professors/new')}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Nuevo profesor
        </button>
      </div>

      {professors.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <p className="text-gray-400 text-4xl mb-3">🥋</p>
          <p className="text-gray-500 font-medium">No hay profesores registrados</p>
          <p className="text-gray-400 text-sm mt-1">Agrega el primer profesor de tu academia</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {professors.map((p) => (
            <div
              key={p.id}
              className={`bg-white rounded-xl shadow-sm border p-5 flex flex-col gap-3 transition-opacity ${
                p.active ? 'border-gray-100' : 'border-gray-200 opacity-60'
              }`}
            >
              <div className="flex items-start gap-4">
                {p.photoUrl ? (
                  <img
                    src={p.photoUrl}
                    alt={p.name}
                    className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl font-bold text-gray-400">
                      {p.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-gray-800 truncate">{p.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                      p.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {p.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  {p.belt && (
                    <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded font-medium ${
                      BELT_COLORS[p.belt] ?? 'bg-gray-100 text-gray-600'
                    }`}>
                      {p.belt}
                    </span>
                  )}
                </div>
              </div>

              {p.bio && (
                <p className="text-sm text-gray-500 line-clamp-2">{p.bio}</p>
              )}

              {p.achievements && (
                <ul className="space-y-0.5">
                  {p.achievements.split('\n').filter(Boolean).slice(0, 3).map((a, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                      <span className="text-primary-500 mt-0.5">🏆</span>
                      {a}
                    </li>
                  ))}
                  {p.achievements.split('\n').filter(Boolean).length > 3 && (
                    <li className="text-xs text-gray-400 pl-5">
                      +{p.achievements.split('\n').filter(Boolean).length - 3} más...
                    </li>
                  )}
                </ul>
              )}

              <div className="flex gap-2 mt-auto pt-2 border-t border-gray-100">
                <button
                  onClick={() => navigate(`/admin/professors/${p.id}/edit`)}
                  className="flex-1 text-center text-sm text-primary-600 hover:text-primary-700 font-medium py-1.5 rounded-lg hover:bg-primary-50 transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleToggleActive(p)}
                  className={`flex-1 text-center text-sm font-medium py-1.5 rounded-lg transition-colors ${
                    p.active
                      ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                  }`}
                >
                  {p.active ? 'Desactivar' : 'Activar'}
                </button>
                <button
                  onClick={() => handleDelete(p)}
                  className="text-sm text-red-400 hover:text-red-600 font-medium py-1.5 px-2 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
