import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { studentsApi } from '../../api/students';
import { beltPromotionsApi } from '../../api/beltPromotions';
import { useToast } from '../../components/ToastContext';
import BeltImage from '../../components/BeltImage';
import DatePicker from '../../components/DatePicker';
import type { Student, BeltPromotion, PromotionType } from '../../types';

const BELT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Blanco:  { bg: 'bg-gray-100',    text: 'text-gray-700',   border: 'border-gray-300' },
  Gris:    { bg: 'bg-gray-300',    text: 'text-gray-800',   border: 'border-gray-400' },
  Amarillo:{ bg: 'bg-yellow-100',  text: 'text-yellow-800', border: 'border-yellow-300' },
  Naranja: { bg: 'bg-orange-100',  text: 'text-orange-800', border: 'border-orange-300' },
  Verde:   { bg: 'bg-green-100',   text: 'text-green-800',  border: 'border-green-300' },
  Azul:    { bg: 'bg-blue-100',    text: 'text-blue-800',   border: 'border-blue-300' },
  Morado:  { bg: 'bg-purple-100',  text: 'text-purple-800', border: 'border-purple-300' },
  Café:    { bg: 'bg-amber-100',   text: 'text-amber-900',  border: 'border-amber-400' },
  Negro:   { bg: 'bg-gray-900',    text: 'text-white',      border: 'border-gray-700' },
};

const JUVENILE_BELTS = ['Blanco', 'Gris', 'Amarillo', 'Naranja', 'Verde'];
const ADULT_BELTS    = ['Blanco', 'Azul', 'Morado', 'Café', 'Negro'];

const TYPE_CONFIG: Record<PromotionType, { icon: string; label: string; color: string }> = {
  PROMOCION:   { icon: '🏆', label: 'Promoción',   color: 'text-green-600' },
  DEGRADACION: { icon: '🔻', label: 'Degradación', color: 'text-red-500' },
  GRADO:       { icon: '⭐', label: 'Grado',        color: 'text-amber-500' },
};

function getAvailableBelts(currentBelt: string | null, age: number | null): { juveniles: string[]; adultos: string[] } {
  const jIdx = currentBelt ? JUVENILE_BELTS.indexOf(currentBelt) : -1;
  const aIdx = currentBelt ? ADULT_BELTS.indexOf(currentBelt) : -1;

  if (age !== null && age <= 15) {
    const from = jIdx >= 0 ? jIdx + 1 : 0;
    return { juveniles: JUVENILE_BELTS.slice(from), adultos: [] };
  }
  if (age !== null && age >= 16) {
    if (aIdx > 0) return { juveniles: [], adultos: ADULT_BELTS.slice(aIdx + 1) };
    if (aIdx === 0) return { juveniles: [], adultos: ADULT_BELTS.slice(1) };
    return { juveniles: [], adultos: ADULT_BELTS };
  }
  if (!currentBelt) return { juveniles: JUVENILE_BELTS, adultos: ADULT_BELTS };
  if (jIdx > 0) return { juveniles: JUVENILE_BELTS.slice(jIdx + 1), adultos: ADULT_BELTS.slice(1) };
  if (aIdx > 0) return { juveniles: [], adultos: ADULT_BELTS.slice(aIdx + 1) };
  return { juveniles: JUVENILE_BELTS.slice(1), adultos: ADULT_BELTS.slice(1) };
}

function maxStripes(belt: string | null) {
  return belt === 'Negro' ? 9 : 4;
}

function BeltBadge({ belt }: { belt: string }) {
  const c = BELT_COLORS[belt] ?? { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' };
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${c.bg} ${c.text} ${c.border}`}>
      {belt}
    </span>
  );
}


function todayYMD(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

function formatDate(iso: string) {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso ?? '';
  return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
}

type ActiveForm = null | 'grado' | 'cinturon';

export default function StudentDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const [student, setStudent] = useState<Student | null>(null);
  const [promotions, setPromotions] = useState<BeltPromotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeForm, setActiveForm] = useState<ActiveForm>(null);
  const [anularTarget, setAnularTarget] = useState<BeltPromotion | null>(null);
  const [anularReason, setAnularReason] = useState('');

  const [gradeForm, setGradeForm] = useState({
    promotionDate: todayYMD(),
    notes: '',
  });

  const [beltForm, setBeltForm] = useState({
    toBelt: '',
    promotionDate: todayYMD(),
    notes: '',
  });

  useEffect(() => {
    if (!id) return;
    const numId = Number(id);
    Promise.all([
      studentsApi.get(numId),
      beltPromotionsApi.getByStudent(numId),
    ]).then(([s, p]) => {
      setStudent(s);
      setPromotions(p);
    }).finally(() => setLoading(false));
  }, [id]);

  const handleAddGrade = async () => {
    if (!student || !gradeForm.promotionDate || !student.belt) return;
    setSaving(true);
    const currentStripes = student.stripes ?? 0;
    try {
      const created = await beltPromotionsApi.create({
        studentId: student.id,
        fromBelt: student.belt,
        fromStripes: currentStripes,
        toBelt: student.belt,
        toStripes: currentStripes + 1,
        promotionDate: gradeForm.promotionDate,
        notes: gradeForm.notes || null,
      });
      setPromotions((prev) => [created, ...prev]);
      setStudent((s) => s ? { ...s, stripes: currentStripes + 1 } : s);
      setGradeForm((f) => ({ ...f, notes: '' }));
      setActiveForm(null);
      toast.success('Grado registrado');
    } catch {
      toast.error('Error al registrar el grado');
    } finally {
      setSaving(false);
    }
  };

  const handleChangeBelt = async () => {
    if (!student || !beltForm.toBelt || !beltForm.promotionDate) return;
    setSaving(true);
    try {
      const created = await beltPromotionsApi.create({
        studentId: student.id,
        fromBelt: student.belt,
        fromStripes: student.stripes ?? 0,
        toBelt: beltForm.toBelt,
        toStripes: 0,
        promotionDate: beltForm.promotionDate,
        notes: beltForm.notes || null,
      });
      setPromotions((prev) => [created, ...prev]);
      setStudent((s) => s ? { ...s, belt: beltForm.toBelt, stripes: 0 } : s);
      setBeltForm((f) => ({ ...f, toBelt: '', notes: '' }));
      setActiveForm(null);
      toast.success(created.type === 'DEGRADACION' ? 'Degradación registrada' : 'Graduación registrada');
    } catch {
      toast.error('Error al registrar');
    } finally {
      setSaving(false);
    }
  };

  const handleAnular = async () => {
    if (!anularTarget || !student) return;
    setSaving(true);
    try {
      await beltPromotionsApi.anular(anularTarget.id, anularReason);
      const [updatedStudent, updatedPromotions] = await Promise.all([
        studentsApi.get(student.id),
        beltPromotionsApi.getByStudent(student.id),
      ]);
      setStudent(updatedStudent);
      setPromotions(updatedPromotions);
      setAnularTarget(null);
      setAnularReason('');
      toast.success('Registro anulado');
    } catch {
      toast.error('Error al anular');
    } finally {
      setSaving(false);
    }
  };

  // Agrupación cronológica de cinturones con sus grados — debe ir antes de early returns
  const beltPeriods = useMemo(() => {
    type BeltPeriod = {
      belt: string;
      startDate: string;
      grades: Array<{ stripes: number; date: string; notes: string | null }>;
    };
    const active = promotions
      .filter((p) => !p.deleted)
      .slice()
      .sort((a, b) => a.promotionDate.localeCompare(b.promotionDate) || a.id - b.id);

    const periods: BeltPeriod[] = [];
    for (const p of active) {
      if (p.type === 'PROMOCION' || p.type === 'DEGRADACION') {
        periods.push({ belt: p.toBelt, startDate: p.promotionDate, grades: [] });
      } else if (p.type === 'GRADO' && periods.length > 0) {
        periods[periods.length - 1].grades.push({
          stripes: p.toStripes,
          date: p.promotionDate,
          notes: p.notes,
        });
      }
    }
    return periods;
  }, [promotions]);

  const toggleForm = (form: ActiveForm) =>
    setActiveForm((prev) => prev === form ? null : form);

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!student) return (
    <div className="text-center py-12 text-gray-400">Alumno no encontrado</div>
  );

  const canAddGrade = !!student.belt && (student.stripes ?? 0) < maxStripes(student.belt);
  const hasActivePromotions = promotions.some((p) => !p.deleted);
  const { juveniles, adultos } = hasActivePromotions
    ? getAvailableBelts(student.belt, student.age)
    : getAvailableBelts(null, student.age);
  const hasBeltOptions = juveniles.length > 0 || adultos.length > 0;

  return (
    <div className="max-w-3xl space-y-6">
      {/* Student card */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-start gap-5">
          {student.photoUrl ? (
            <img src={student.photoUrl} alt={student.name} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center text-3xl font-bold flex-shrink-0">
              {student.name.charAt(0)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{student.name}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${student.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {student.active ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-500">
              {student.rut && <span>RUT: {student.rut}</span>}
              {student.email && <span>{student.email}</span>}
              {student.phone && <span>{student.phone}</span>}
              {student.age && <span>{student.age} años</span>}
              {student.weight && <span>{student.weight} kg</span>}
            </div>
            <div className="mt-3 space-y-2">
              {student.belt && (
                <BeltImage belt={student.belt} stripes={student.stripes ?? 0} className="max-w-[220px]" />
              )}
              {student.joinDate && (
                <span className="text-xs text-gray-400">
                  📅 Ingresó el {formatDate(student.joinDate)}
                </span>
              )}
            </div>
          </div>
          <Link
            to={`/admin/students/${student.id}/edit`}
            className="flex-shrink-0 text-sm text-primary-600 hover:text-primary-800 border border-primary-200 hover:border-primary-400 px-3 py-1.5 rounded-lg transition-colors"
          >
            Editar
          </Link>
        </div>
      </div>

      {/* Plans & professors */}
      {student.enrolledPlans && student.enrolledPlans.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="font-bold text-gray-900 mb-4">Planes y Profesores</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {student.enrolledPlans.map((plan) => (
              <div key={plan.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
                <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                  {plan.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{plan.name}</p>
                  {plan.disciplineName && (
                    <p className="text-xs text-gray-500 mt-0.5">{plan.disciplineName}</p>
                  )}
                  {plan.price != null && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      ${plan.price.toLocaleString('es-CL')}/mes
                    </p>
                  )}
                  {plan.professorName && (
                    <div className="flex items-center gap-1 mt-1.5">
                      <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="text-xs text-gray-600 font-medium">{plan.professorName}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Belt progression summary */}
      {beltPeriods.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="font-bold text-gray-900 mb-4">Progresión de Cinturones</h2>
          <div className="relative">
            {beltPeriods.map((period, idx) => {
              const isCurrent = idx === beltPeriods.length - 1;
              const c = BELT_COLORS[period.belt] ?? { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' };
              return (
                <div key={idx} className="flex gap-4">
                  {/* Línea vertical + punto */}
                  <div className="flex flex-col items-center">
                    <div className={`w-4 h-4 rounded-full border-2 border-white shadow-sm flex-shrink-0 mt-0.5 ${isCurrent ? 'bg-primary-600 ring-2 ring-primary-200' : 'bg-gray-300'}`} />
                    {idx < beltPeriods.length - 1 && (
                      <div className="w-0.5 bg-gray-200 flex-1 my-1 min-h-[1rem]" />
                    )}
                  </div>

                  {/* Contenido del período */}
                  <div className={`flex-1 pb-5 ${idx === beltPeriods.length - 1 ? 'pb-0' : ''}`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${c.bg} ${c.text} ${c.border}`}>
                        {period.belt}
                      </span>
                      <span className="text-xs text-gray-400">{formatDate(period.startDate)}</span>
                      {isCurrent && (
                        <span className="text-xs font-semibold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">Actual</span>
                      )}
                    </div>

                    {period.grades.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {period.grades.map((g, gi) => (
                          <div key={gi} className="flex items-start gap-2 text-xs text-gray-500 pl-1">
                            <span className="text-amber-400 mt-px">{'★'.repeat(g.stripes)}</span>
                            <span>
                              Grado {g.stripes} — <span className="text-gray-600">{formatDate(g.date)}</span>
                              {g.notes && <span className="italic text-gray-400 ml-1">"{g.notes}"</span>}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Belt history */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="font-bold text-gray-900">Historial de Graduaciones</h2>
              <p className="text-xs text-gray-400 mt-0.5">{promotions.length} registro{promotions.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => toggleForm('grado')}
                disabled={!canAddGrade}
                title={!canAddGrade ? (student.belt ? 'Grados máximos alcanzados' : 'El alumno no tiene cinturón') : ''}
                className={`text-sm font-medium px-3 py-2 rounded-lg border transition-colors ${
                  activeForm === 'grado'
                    ? 'bg-amber-50 border-amber-300 text-amber-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-amber-300 hover:text-amber-700 disabled:opacity-40 disabled:cursor-not-allowed'
                }`}
              >
                ⭐ {activeForm === 'grado' ? 'Cancelar' : 'Agregar grado'}
              </button>
              <button
                onClick={() => toggleForm('cinturon')}
                disabled={!hasBeltOptions}
                className={`text-sm font-medium px-3 py-2 rounded-lg border transition-colors ${
                  activeForm === 'cinturon'
                    ? 'bg-primary-50 border-primary-300 text-primary-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-primary-300 hover:text-primary-700 disabled:opacity-40 disabled:cursor-not-allowed'
                }`}
              >
                🏆 {activeForm === 'cinturon' ? 'Cancelar' : 'Cambiar cinturón'}
              </button>
            </div>
          </div>
        </div>

        {/* Grade form */}
        {activeForm === 'grado' && (
          <div className="p-5 border-b border-gray-100 bg-amber-50">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">⭐ Nuevo grado — {student.belt}</h3>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1">
                <p className="text-xs text-gray-400 mb-1">Actual</p>
                <BeltImage belt={student.belt!} stripes={student.stripes ?? 0} />
              </div>
              <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
              <div className="flex-1">
                <p className="text-xs text-gray-400 mb-1">Nuevo grado</p>
                <BeltImage belt={student.belt!} stripes={(student.stripes ?? 0) + 1} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fecha *</label>
                <DatePicker
                  value={gradeForm.promotionDate}
                  max={todayYMD()}
                  onChange={(v) => setGradeForm((f) => ({ ...f, promotionDate: v }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notas (opcional)</label>
                <input
                  type="text"
                  value={gradeForm.notes}
                  onChange={(e) => setGradeForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="ej: Examen técnico aprobado"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>
            <button
              onClick={handleAddGrade}
              disabled={!gradeForm.promotionDate || saving}
              className="mt-4 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Confirmar grado'}
            </button>
          </div>
        )}

        {/* Belt change form */}
        {activeForm === 'cinturon' && (
          <div className="p-5 border-b border-gray-100 bg-primary-50">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">🏆 Cambio de cinturón</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Cinturón actual</label>
                <div className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-500">
                  {student.belt ?? 'Sin cinturón'}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nuevo cinturón *</label>
                <select
                  value={beltForm.toBelt}
                  onChange={(e) => setBeltForm((f) => ({ ...f, toBelt: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                >
                  <option value="">Seleccionar...</option>
                  {juveniles.length > 0 && (
                    <optgroup label="Juveniles (≤ 15 años)">
                      {juveniles.map((b) => <option key={b} value={b}>{b}</option>)}
                    </optgroup>
                  )}
                  {adultos.length > 0 && (
                    <optgroup label="Adultos (16+ años)">
                      {adultos.map((b) => <option key={b} value={b}>{b}</option>)}
                    </optgroup>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fecha *</label>
                <DatePicker
                  value={beltForm.promotionDate}
                  max={todayYMD()}
                  onChange={(v) => setBeltForm((f) => ({ ...f, promotionDate: v }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notas (opcional)</label>
                <input
                  type="text"
                  value={beltForm.notes}
                  onChange={(e) => setBeltForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="ej: Aprobó examen técnico"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
            </div>
            <button
              onClick={handleChangeBelt}
              disabled={!beltForm.toBelt || !beltForm.promotionDate || saving}
              className="mt-4 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Confirmar cambio'}
            </button>
          </div>
        )}

        {/* Timeline */}
        <div className="p-5">
          {promotions.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">Sin registros aún</p>
          ) : (
            <ol className="relative border-l-2 border-gray-200 space-y-6 ml-3">
              {promotions.map((p) => {
                const cfg = TYPE_CONFIG[p.type];
                const isAnulado = p.deleted;
                return (
                  <li key={p.id} className={`ml-5 ${isAnulado ? 'opacity-40' : ''}`}>
                    <span className="absolute -left-2 w-4 h-4 rounded-full border-2 border-white bg-primary-500 flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    </span>
                    <div className={`rounded-xl p-4 border ${isAnulado ? 'bg-gray-100 border-gray-200' : p.type === 'DEGRADACION' ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <span className={`text-xs font-bold uppercase tracking-wide ${isAnulado ? 'text-gray-400 line-through' : cfg.color}`}>
                            {cfg.icon} {cfg.label}
                          </span>

                          {p.type === 'GRADO' ? (
                            <div className="flex items-center gap-3 mt-2">
                              <BeltImage belt={p.toBelt} stripes={p.fromStripes ?? 0} className="max-w-[120px]" />
                              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                              </svg>
                              <BeltImage belt={p.toBelt} stripes={p.toStripes} className="max-w-[120px]" />
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {p.fromBelt ? <BeltBadge belt={p.fromBelt} /> : <span className="text-xs text-gray-400 italic">Sin cinturón</span>}
                              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                              </svg>
                              <BeltBadge belt={p.toBelt} />
                            </div>
                          )}

                          <p className="text-xs text-gray-500 mt-2">{formatDate(p.promotionDate)}</p>
                          {p.notes && <p className="text-sm text-gray-600 mt-1 italic">"{p.notes}"</p>}

                          {isAnulado && (
                            <div className="mt-2 pt-2 border-t border-gray-200 space-y-0.5">
                              <p className="text-xs font-semibold text-gray-500">Anulado por {p.deletedBy}{p.deletedAt ? ` · ${formatDate(p.deletedAt)}` : ''}</p>
                              {p.deletedReason && <p className="text-xs text-gray-400 italic">"{p.deletedReason}"</p>}
                            </div>
                          )}
                        </div>

                        {!isAnulado && p.deletable && (
                          <button
                            onClick={() => { setAnularTarget(p); setAnularReason(''); }}
                            className="flex-shrink-0 text-gray-300 hover:text-red-400 transition-colors"
                            title="Anular registro"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                        {!isAnulado && !p.deletable && (
                          <span className="flex-shrink-0 text-xs text-gray-300 italic" title="Registro permanente">🔒</span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>

      {/* Modal anular */}
      {anularTarget && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4">
            <h2 className="font-bold text-white">Anular registro</h2>
            <p className="text-sm text-gray-400">
              Este registro quedará visible en el historial pero marcado como anulado. La acción no se puede deshacer.
            </p>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Motivo (opcional)</label>
              <textarea
                value={anularReason}
                onChange={(e) => setAnularReason(e.target.value)}
                rows={3}
                placeholder="Ej: registro duplicado, error de fecha..."
                className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 placeholder:text-gray-500 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleAnular}
                disabled={saving}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {saving ? 'Anulando...' : 'Anular registro'}
              </button>
              <button
                onClick={() => setAnularTarget(null)}
                className="border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
