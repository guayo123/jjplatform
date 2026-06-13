import { useEffect, useState } from 'react';
import { techniquesApi } from '../../api/techniques';
import { useToast } from '../../components/ToastContext';
import { useConfirm } from '../../components/ConfirmContext';
import type { Technique, TechniqueForm } from '../../types';

const EMPTY: TechniqueForm = { name: '', description: '', position: '', videoUrl: '' };

interface Props {
  beltId: number;
  beltName: string;
  onClose: () => void;
}

/** Modal to manage the technique curriculum of a single belt (staff side). */
export default function TechniqueManager({ beltId, beltName, onClose }: Props) {
  const { toast } = useToast();
  const confirm = useConfirm();

  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<TechniqueForm>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    techniquesApi.listByBelt(beltId).then(setTechniques).finally(() => setLoading(false));
  }, [beltId]);

  const resetForm = () => { setEditingId(null); setForm(EMPTY); };

  const startEdit = (t: Technique) => {
    setEditingId(t.id);
    setForm({
      name: t.name,
      description: t.description ?? '',
      position: t.position ?? '',
      videoUrl: t.videoUrl ?? '',
    });
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editingId != null) {
        const updated = await techniquesApi.update(editingId, form);
        setTechniques((prev) => prev.map((t) => (t.id === editingId ? updated : t)));
        toast.success('Técnica actualizada');
      } else {
        const created = await techniquesApi.create(beltId, form);
        setTechniques((prev) => [...prev, created]);
        toast.success('Técnica agregada');
      }
      resetForm();
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (t: Technique) => {
    const ok = await confirm({ title: 'Eliminar técnica', message: `¿Eliminar "${t.name}"? Se quitará también del progreso de los alumnos.`, confirmLabel: 'Eliminar', danger: true });
    if (!ok) return;
    try {
      await techniquesApi.delete(t.id);
      setTechniques((prev) => prev.filter((x) => x.id !== t.id));
      if (editingId === t.id) resetForm();
      toast.success('Técnica eliminada');
    } catch {
      toast.error('Error al eliminar');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900">Programa técnico</h2>
            <p className="text-xs text-gray-400 mt-0.5">Cinturón {beltName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none transition-colors">✕</button>
        </div>

        {/* Technique list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : techniques.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Sin técnicas. Agrega la primera abajo.</p>
          ) : (
            techniques.map((t) => (
              <div key={t.id} className="flex items-start gap-2 rounded-lg border border-gray-100 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900">{t.name}</span>
                    {t.position && <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">{t.position}</span>}
                    {t.videoUrl && <span className="text-[10px] text-primary-600">▶ video</span>}
                  </div>
                  {t.description && <p className="text-xs text-gray-400 mt-0.5">{t.description}</p>}
                </div>
                <button onClick={() => startEdit(t)} className="text-xs text-primary-600 hover:text-primary-700 font-medium px-2 py-1 rounded hover:bg-primary-50">Editar</button>
                <button onClick={() => handleDelete(t)} className="text-gray-300 hover:text-red-400 transition-colors px-1" title="Eliminar">✕</button>
              </div>
            ))
          )}
        </div>

        {/* Add / edit form */}
        <div className="border-t border-gray-100 px-6 py-4 space-y-3 bg-gray-50 rounded-b-2xl">
          <p className="text-xs font-semibold text-gray-600">{editingId != null ? 'Editar técnica' : 'Nueva técnica'}</p>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Nombre * (ej: Armbar desde guardia)"
              className="col-span-2 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              autoFocus
            />
            <input
              type="text"
              value={form.position}
              onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
              placeholder="Posición (ej: Guardia)"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            />
            <input
              type="url"
              value={form.videoUrl}
              onChange={(e) => setForm((f) => ({ ...f, videoUrl: e.target.value }))}
              placeholder="URL video (opcional)"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            />
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Descripción / detalles (opcional)"
              rows={2}
              className="col-span-2 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={!form.name.trim() || saving}
              className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Guardando...' : editingId != null ? 'Guardar cambios' : 'Agregar técnica'}
            </button>
            {editingId != null && (
              <button onClick={resetForm} className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-4 py-2 rounded-lg transition-colors bg-white">
                Cancelar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
