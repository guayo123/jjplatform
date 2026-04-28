import { useEffect, useState } from 'react';
import { academiesApi } from '../../api/academies';
import { useToast } from '../../components/ToastContext';
import type { Discipline } from '../../types';

export default function Disciplines() {
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = () =>
    academiesApi.getDisciplines().then(setDisciplines).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditingId(null);
    setName('');
    setShowForm(true);
  };

  const openEdit = (d: Discipline) => {
    setEditingId(d.id);
    setName(d.name);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editingId != null) {
        const updated = await academiesApi.updateDiscipline(editingId, name.trim());
        setDisciplines((prev) => prev.map((d) => (d.id === editingId ? updated : d)));
        toast.success('Disciplina actualizada');
      } else {
        const created = await academiesApi.createDiscipline(name.trim());
        setDisciplines((prev) => [...prev, created]);
        toast.success('Disciplina creada');
      }
      setShowForm(false);
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: number) => {
    try {
      const updated = await academiesApi.toggleDiscipline(id);
      setDisciplines((prev) => prev.map((d) => (d.id === id ? updated : d)));
    } catch {
      toast.error('Error al cambiar estado');
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
          <h1 className="text-2xl font-bold">Disciplinas</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Las disciplinas se usan para organizar los planes y horarios.
          </p>
        </div>
        <button
          onClick={openNew}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Nueva disciplina
        </button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">
                {editingId != null ? 'Editar disciplina' : 'Nueva disciplina'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  required
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ej: Jiujitsu, Kickboxing, Capoeira"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* List */}
      {disciplines.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <p className="text-gray-400 text-4xl mb-3">🥋</p>
          <p className="text-gray-500 font-medium">No hay disciplinas creadas aún</p>
          <p className="text-gray-400 text-sm mt-1">Crea tu primera disciplina para organizar los planes</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
          {disciplines.map((d) => (
            <div key={d.id} className={`flex items-center justify-between px-5 py-4 ${!d.active ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-3">
                <span className="text-lg">🥋</span>
                <div>
                  <p className="font-medium text-gray-800">{d.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    d.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {d.active ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEdit(d)}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium px-3 py-1.5 rounded-lg hover:bg-primary-50 transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleToggle(d.id)}
                  className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                    d.active
                      ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                  }`}
                >
                  {d.active ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
