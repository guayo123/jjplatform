import { useEffect, useState } from 'react';
import { academiesApi } from '../../api/academies';
import { disciplineBeltsApi } from '../../api/disciplineBelts';
import { useToast } from '../../components/ToastContext';
import { useConfirm } from '../../components/ConfirmContext';
import FormInput from '../../components/FormInput';
import type { Discipline, DisciplineAgeCategory, DisciplineBelt } from '../../types';

// Preset belt colors so the admin can pick quickly
const PRESET_COLORS = [
  { name: 'Blanco',   hex: '#F9FAFB' },
  { name: 'Gris',     hex: '#9CA3AF' },
  { name: 'Amarillo', hex: '#FBBF24' },
  { name: 'Naranja',  hex: '#F97316' },
  { name: 'Verde',    hex: '#22C55E' },
  { name: 'Azul',     hex: '#3B82F6' },
  { name: 'Morado',   hex: '#8B5CF6' },
  { name: 'Café',     hex: '#92400E' },
  { name: 'Negro',    hex: '#1F2937' },
  { name: 'Rojo',     hex: '#EF4444' },
  { name: 'Rosa',     hex: '#EC4899' },
  { name: 'Celeste',  hex: '#38BDF8' },
  { name: 'Plomo',    hex: '#6B7280' },
];

function BeltChip({ belt, onDelete }: { belt: DisciplineBelt; onDelete: () => void }) {
  const r = parseInt(belt.colorHex.slice(1, 3), 16);
  const g = parseInt(belt.colorHex.slice(3, 5), 16);
  const b = parseInt(belt.colorHex.slice(5, 7), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const textColor = lum < 0.45 ? '#FFFFFF' : '#111827';
  const borderColor = `rgba(${r},${g},${b},0.6)`;

  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
      style={{ background: belt.colorHex, color: textColor, borderColor }}
    >
      {belt.name}
      <button onClick={onDelete} className="hover:opacity-70 transition-opacity leading-none" title="Eliminar cinturón">
        ✕
      </button>
    </div>
  );
}

type AddBeltForm = { name: string; colorHex: string };
type AddCatForm  = { name: string; minAge: string; maxAge: string };

export default function Disciplines() {
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const confirm = useConfirm();

  // Which discipline panel is expanded
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Per-discipline category form state
  const [showCatFormFor, setShowCatFormFor] = useState<number | null>(null);
  const [catForm, setCatForm] = useState<AddCatForm>({ name: '', minAge: '', maxAge: '' });
  const [catSaving, setCatSaving] = useState(false);

  // Per-category belt form state
  const [showBeltFormFor, setShowBeltFormFor] = useState<number | null>(null);
  const [beltForm, setBeltForm] = useState<AddBeltForm>({ name: '', colorHex: '#9CA3AF' });
  const [beltSaving, setBeltSaving] = useState(false);

  const load = () =>
    academiesApi.getDisciplines().then(setDisciplines).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditingId(null); setName(''); setShowForm(true); };
  const openEdit = (d: Discipline) => { setEditingId(d.id); setName(d.name); setShowForm(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editingId != null) {
        const updated = await academiesApi.updateDiscipline(editingId, name.trim());
        setDisciplines((prev) => prev.map((d) => (d.id === editingId ? { ...d, ...updated } : d)));
        toast.success('Disciplina actualizada');
      } else {
        const created = await academiesApi.createDiscipline(name.trim());
        setDisciplines((prev) => [...prev, { ...created, ageCategories: [] }]);
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
      setDisciplines((prev) => prev.map((d) => (d.id === id ? { ...d, ...updated } : d)));
    } catch {
      toast.error('Error al cambiar estado');
    }
  };

  // ── Categories ──────────────────────────────────────────────────────────────

  const updateDisc = (discId: number, updater: (d: Discipline) => Discipline) =>
    setDisciplines((prev) => prev.map((d) => (d.id === discId ? updater(d) : d)));

  const handleAddCategory = async (discId: number) => {
    if (!catForm.name.trim()) return;
    setCatSaving(true);
    try {
      const created = await disciplineBeltsApi.createCategory(discId, {
        name: catForm.name.trim(),
        minAge: catForm.minAge ? Number(catForm.minAge) : null,
        maxAge: catForm.maxAge ? Number(catForm.maxAge) : null,
      });
      updateDisc(discId, (d) => ({ ...d, ageCategories: [...d.ageCategories, created] }));
      setShowCatFormFor(null);
      setCatForm({ name: '', minAge: '', maxAge: '' });
      toast.success('Categoría creada');
    } catch {
      toast.error('Error al crear categoría');
    } finally {
      setCatSaving(false);
    }
  };

  const handleDeleteCategory = async (discId: number, catId: number) => {
    const ok = await confirm({ title: 'Eliminar categoría', message: '¿Eliminar esta categoría y todos sus cinturones?', confirmLabel: 'Eliminar', danger: true });
    if (!ok) return;
    try {
      await disciplineBeltsApi.deleteCategory(catId);
      updateDisc(discId, (d) => ({ ...d, ageCategories: d.ageCategories.filter((c) => c.id !== catId) }));
      toast.success('Categoría eliminada');
    } catch {
      toast.error('Error al eliminar');
    }
  };

  // ── Belts ────────────────────────────────────────────────────────────────────

  const handleAddBelt = async (discId: number, catId: number) => {
    if (!beltForm.name.trim()) return;
    setBeltSaving(true);
    try {
      const updatedCat = await disciplineBeltsApi.addBelt(catId, { name: beltForm.name.trim(), colorHex: beltForm.colorHex });
      updateDisc(discId, (d) => ({
        ...d,
        ageCategories: d.ageCategories.map((c) => (c.id === catId ? updatedCat : c)),
      }));
      setShowBeltFormFor(null);
      setBeltForm({ name: '', colorHex: '#9CA3AF' });
      toast.success('Cinturón agregado');
    } catch {
      toast.error('Error al agregar cinturón');
    } finally {
      setBeltSaving(false);
    }
  };

  const handleDeleteBelt = async (discId: number, catId: number, beltId: number) => {
    try {
      await disciplineBeltsApi.deleteBelt(beltId);
      updateDisc(discId, (d) => ({
        ...d,
        ageCategories: d.ageCategories.map((c) =>
          c.id === catId ? { ...c, belts: c.belts.filter((b) => b.id !== beltId) } : c
        ),
      }));
      toast.success('Cinturón eliminado');
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
          <h1 className="text-2xl font-bold">Disciplinas</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Configura las disciplinas, categorías de edad y sus cinturones.
          </p>
        </div>
        <button
          onClick={openNew}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Nueva disciplina
        </button>
      </div>

      {/* Discipline form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl shadow-black/60 w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h2 className="font-bold text-white">
                {editingId != null ? 'Editar disciplina' : 'Nueva disciplina'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white text-xl leading-none transition-colors">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Nombre *</label>
                <FormInput
                  required
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ej: Jiujitsu, Kickboxing, Judo"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={saving}
                  className="bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Disciplines list */}
      {disciplines.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <p className="text-gray-400 text-4xl mb-3">🥋</p>
          <p className="text-gray-500 font-medium">No hay disciplinas creadas aún</p>
          <p className="text-gray-400 text-sm mt-1">Crea tu primera disciplina para organizar los planes</p>
        </div>
      ) : (
        <div className="space-y-3">
          {disciplines.map((d) => {
            const isExpanded = expandedId === d.id;
            return (
              <div key={d.id} className={`bg-white rounded-xl shadow-sm overflow-hidden ${!d.active ? 'opacity-60' : ''}`}>
                {/* Discipline header row */}
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg flex-shrink-0">🥋</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800">{d.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${d.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {d.active ? 'Activa' : 'Inactiva'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {d.ageCategories?.length ?? 0} categoría{(d.ageCategories?.length ?? 0) !== 1 ? 's' : ''} de edad
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : d.id)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                        isExpanded
                          ? 'bg-primary-50 border-primary-300 text-primary-700'
                          : 'border-gray-200 text-gray-500 hover:border-primary-300 hover:text-primary-700'
                      }`}
                    >
                      {isExpanded ? 'Cerrar' : 'Cinturones'}
                    </button>
                    <button onClick={() => openEdit(d)}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium px-3 py-1.5 rounded-lg hover:bg-primary-50 transition-colors">
                      Editar
                    </button>
                    <button onClick={() => handleToggle(d.id)}
                      className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                        d.active ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-50' : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                      }`}>
                      {d.active ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </div>

                {/* Expanded: age categories & belts panel */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-700">Categorías de edad y cinturones</h3>
                      <button
                        onClick={() => { setShowCatFormFor(d.id); setCatForm({ name: '', minAge: '', maxAge: '' }); }}
                        className="text-xs font-medium text-primary-600 hover:text-primary-800 border border-primary-200 hover:border-primary-400 px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        + Categoría
                      </button>
                    </div>

                    {/* Add category form */}
                    {showCatFormFor === d.id && (
                      <div className="bg-white rounded-lg border border-primary-100 p-4 space-y-3">
                        <p className="text-xs font-semibold text-gray-600">Nueva categoría de edad</p>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="col-span-3 sm:col-span-1">
                            <label className="block text-xs text-gray-500 mb-1">Nombre *</label>
                            <input
                              type="text"
                              value={catForm.name}
                              onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))}
                              placeholder="ej: Adultos, Infantil"
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                              autoFocus
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Edad mín.</label>
                            <input
                              type="number" min={0} max={150}
                              value={catForm.minAge}
                              onChange={(e) => setCatForm((f) => ({ ...f, minAge: e.target.value }))}
                              placeholder="—"
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Edad máx.</label>
                            <input
                              type="number" min={0} max={150}
                              value={catForm.maxAge}
                              onChange={(e) => setCatForm((f) => ({ ...f, maxAge: e.target.value }))}
                              placeholder="—"
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAddCategory(d.id)}
                            disabled={!catForm.name.trim() || catSaving}
                            className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {catSaving ? 'Guardando...' : 'Crear categoría'}
                          </button>
                          <button
                            onClick={() => setShowCatFormFor(null)}
                            className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-4 py-2 rounded-lg transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Categories list */}
                    {(!d.ageCategories || d.ageCategories.length === 0) ? (
                      <p className="text-sm text-gray-400 text-center py-4">
                        Sin categorías. Agrega una para configurar sus cinturones.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {d.ageCategories.map((cat) => (
                          <CategoryPanel
                            key={cat.id}
                            cat={cat}
                            discId={d.id}
                            showBeltForm={showBeltFormFor === cat.id}
                            beltForm={beltForm}
                            beltSaving={beltSaving}
                            onOpenBeltForm={() => { setShowBeltFormFor(cat.id); setBeltForm({ name: '', colorHex: '#9CA3AF' }); }}
                            onCloseBeltForm={() => setShowBeltFormFor(null)}
                            onBeltFormChange={setBeltForm}
                            onAddBelt={() => handleAddBelt(d.id, cat.id)}
                            onDeleteBelt={(beltId) => handleDeleteBelt(d.id, cat.id, beltId)}
                            onDeleteCategory={() => handleDeleteCategory(d.id, cat.id)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── CategoryPanel sub-component ──────────────────────────────────────────────

interface CategoryPanelProps {
  cat: DisciplineAgeCategory;
  discId: number;
  showBeltForm: boolean;
  beltForm: AddBeltForm;
  beltSaving: boolean;
  onOpenBeltForm: () => void;
  onCloseBeltForm: () => void;
  onBeltFormChange: (f: AddBeltForm) => void;
  onAddBelt: () => void;
  onDeleteBelt: (beltId: number) => void;
  onDeleteCategory: () => void;
}

function CategoryPanel({
  cat, showBeltForm, beltForm, beltSaving,
  onOpenBeltForm, onCloseBeltForm, onBeltFormChange,
  onAddBelt, onDeleteBelt, onDeleteCategory,
}: CategoryPanelProps) {
  const ageLabel = cat.minAge != null || cat.maxAge != null
    ? `${cat.minAge ?? '0'} – ${cat.maxAge ?? '∞'} años`
    : null;

  return (
    <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
      {/* Category header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-800 text-sm">{cat.name}</span>
          {ageLabel && (
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{ageLabel}</span>
          )}
          <span className="text-xs text-gray-400">{cat.belts.length} cinturón{cat.belts.length !== 1 ? 'es' : ''}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenBeltForm}
            className="text-xs text-primary-600 hover:text-primary-800 font-medium px-2.5 py-1 rounded-lg hover:bg-primary-50 transition-colors border border-transparent hover:border-primary-200"
          >
            + Cinturón
          </button>
          <button
            onClick={onDeleteCategory}
            className="text-gray-300 hover:text-red-400 transition-colors"
            title="Eliminar categoría"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Belts row */}
      <div className="px-4 py-3">
        {cat.belts.length === 0 ? (
          <p className="text-xs text-gray-400 italic">Sin cinturones configurados</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {cat.belts.map((belt) => (
              <BeltChip key={belt.id} belt={belt} onDelete={() => onDeleteBelt(belt.id)} />
            ))}
          </div>
        )}
      </div>

      {/* Add belt form */}
      {showBeltForm && (
        <div className="border-t border-gray-100 bg-primary-50 px-4 py-3 space-y-3">
          <p className="text-xs font-semibold text-gray-600">Nuevo cinturón</p>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nombre *</label>
              <input
                type="text"
                value={beltForm.name}
                onChange={(e) => onBeltFormChange({ ...beltForm, name: e.target.value })}
                placeholder="ej: Blanco, Plomo"
                className="w-40 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={beltForm.colorHex}
                  onChange={(e) => onBeltFormChange({ ...beltForm, colorHex: e.target.value })}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-gray-200 p-0.5 bg-white"
                />
                <span className="text-xs text-gray-500 font-mono">{beltForm.colorHex}</span>
              </div>
            </div>
          </div>
          {/* Preset color palette */}
          <div>
            <p className="text-xs text-gray-400 mb-1.5">Colores rápidos:</p>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_COLORS.map((p) => (
                <button
                  key={p.hex}
                  title={p.name}
                  onClick={() => onBeltFormChange({ ...beltForm, colorHex: p.hex, name: beltForm.name || p.name })}
                  className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none"
                  style={{
                    background: p.hex,
                    borderColor: beltForm.colorHex === p.hex ? '#6366F1' : '#E5E7EB',
                  }}
                />
              ))}
            </div>
          </div>
          {/* Preview */}
          {beltForm.name && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Vista previa:</span>
              <div
                className="px-3 py-1 rounded-full text-xs font-medium border"
                style={{
                  background: beltForm.colorHex,
                  color: luminance(beltForm.colorHex) < 0.45 ? '#FFF' : '#111',
                  borderColor: beltForm.colorHex,
                }}
              >
                {beltForm.name}
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={onAddBelt}
              disabled={!beltForm.name.trim() || beltSaving}
              className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {beltSaving ? 'Guardando...' : 'Agregar cinturón'}
            </button>
            <button
              onClick={onCloseBeltForm}
              className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-4 py-2 rounded-lg transition-colors bg-white"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function luminance(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}
