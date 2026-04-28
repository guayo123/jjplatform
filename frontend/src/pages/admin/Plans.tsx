import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { academiesApi } from '../../api/academies';
import { professorsApi } from '../../api/professors';
import type { Discipline, Plan, PlanForm, Professor } from '../../types';

const emptyForm = (): PlanForm => ({
  name: '',
  description: '',
  price: 0,
  features: '',
  displayOrder: 0,
  disciplineId: null,
  professorId: null,
});

export default function Plans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<PlanForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      academiesApi.getPlans().catch(() => [] as Plan[]),
      academiesApi.getDisciplines().catch(() => [] as Discipline[]),
      professorsApi.list().catch(() => [] as Professor[]),
    ]).then(([p, d, pr]) => {
      setPlans(p);
      setDisciplines(d);
      setProfessors(pr.filter((x) => x.active));
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm());
    setError(null);
    setShowForm(true);
  };

  const openEdit = (plan: Plan) => {
    setEditingId(plan.id);
    setForm({
      name: plan.name,
      description: plan.description,
      price: plan.price,
      features: plan.features,
      displayOrder: plan.displayOrder,
      disciplineId: plan.disciplineId,
      professorId: plan.professorId,
    });
    setError(null);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editingId != null) {
        const updated = await academiesApi.updatePlan(editingId, form);
        setPlans((prev) => prev.map((p) => (p.id === editingId ? updated : p)));
      } else {
        const created = await academiesApi.createPlan(form);
        setPlans((prev) => [...prev, created]);
      }
      setShowForm(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: number) => {
    const updated = await academiesApi.togglePlan(id);
    setPlans((prev) => prev.map((p) => (p.id === id ? updated : p)));
  };

  if (loading)
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  const activeDisciplines = disciplines.filter((d) => d.active);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Planes y Tarifas</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Estos planes se muestran en tu perfil público.
          </p>
        </div>
        <button
          onClick={openNew}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Nuevo plan
        </button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="font-semibold text-gray-800">
                {editingId != null ? 'Editar plan' : 'Nuevo plan'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{error}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Disciplina</label>
                {activeDisciplines.length === 0 ? (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    No hay disciplinas creadas.{' '}
                    <Link to="/admin/disciplines" className="underline font-medium">
                      Crea disciplinas aquí
                    </Link>{' '}
                    antes de asignar un plan.
                  </p>
                ) : (
                  <select
                    value={form.disciplineId ?? ''}
                    onChange={(e) => setForm({ ...form, disciplineId: e.target.value ? Number(e.target.value) : null })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                  >
                    <option value="">Sin disciplina</option>
                    {activeDisciplines.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Profesor</label>
                {professors.length === 0 ? (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    No hay profesores creados.{' '}
                    <Link to="/admin/professors" className="underline font-medium">
                      Crea profesores aquí
                    </Link>{' '}
                    para asignarlos a un plan.
                  </p>
                ) : (
                  <select
                    value={form.professorId ?? ''}
                    onChange={(e) => setForm({ ...form, professorId: e.target.value ? Number(e.target.value) : null })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                  >
                    <option value="">Sin profesor asignado</option>
                    {professors.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}{p.belt ? ` · ${p.belt}` : ''}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del plan *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Ej: Plan Completo, BJJ Kids, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción corta</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Ej: Acceso a todas las clases"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio mensual (CLP)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.price > 0 ? form.price.toLocaleString('es-CL') : ''}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\./g, '').replace(/[^\d]/g, '');
                      setForm({ ...form, price: raw ? Number(raw) : 0 });
                    }}
                    placeholder="65.000"
                    className="w-full pl-7 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Características incluidas
                  <span className="text-gray-400 font-normal ml-1">(una por línea)</span>
                </label>
                <textarea
                  rows={4}
                  value={form.features}
                  onChange={(e) => setForm({ ...form, features: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                  placeholder={"Lunes, Miércoles y Viernes\nHorario 18:00 - 19:30\n+ $15.000 matrícula"}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Orden de visualización</label>
                <input
                  type="number"
                  min={0}
                  value={form.displayOrder}
                  onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })}
                  className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <p className="text-xs text-gray-400 mt-1">Número menor = aparece primero</p>
              </div>

              <div className="flex gap-3 pt-2">
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

      {/* Plans list */}
      {plans.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <p className="text-gray-400 text-4xl mb-3">💰</p>
          <p className="text-gray-500 font-medium">No hay planes creados aún</p>
          <p className="text-gray-400 text-sm mt-1">Crea tu primer plan de entrenamiento</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-xl shadow-sm border p-5 flex flex-col gap-3 transition-opacity ${
                plan.active ? 'border-gray-100' : 'border-gray-200 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap gap-1 mb-1">
                    {plan.disciplineName && (
                      <span className="text-xs font-semibold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                        {plan.disciplineName}
                      </span>
                    )}
                    {plan.professorName && (
                      <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        👤 {plan.professorName}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-gray-800">{plan.name}</h3>
                  {plan.description && (
                    <p className="text-sm text-gray-500 mt-0.5">{plan.description}</p>
                  )}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                  plan.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {plan.active ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              {plan.price > 0 && (
                <p className="text-2xl font-extrabold text-primary-600">
                  ${plan.price.toLocaleString('es-CL')}
                  <span className="text-sm font-normal text-gray-400 ml-1">/ mes</span>
                </p>
              )}

              {plan.features && (
                <ul className="space-y-1">
                  {plan.features.split('\n').filter(Boolean).map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-primary-500 mt-0.5">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex gap-2 mt-auto pt-2 border-t border-gray-100">
                <button
                  onClick={() => openEdit(plan)}
                  className="flex-1 text-center text-sm text-primary-600 hover:text-primary-700 font-medium py-1.5 rounded-lg hover:bg-primary-50 transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleToggle(plan.id)}
                  className={`flex-1 text-center text-sm font-medium py-1.5 rounded-lg transition-colors ${
                    plan.active
                      ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                  }`}
                >
                  {plan.active ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
