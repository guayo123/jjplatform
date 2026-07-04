import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { startStudentDetailTour } from './studentDetailTour';
import { studentsApi } from '../../api/students';
import { beltPromotionsApi } from '../../api/beltPromotions';
import { studentDisciplinesApi } from '../../api/studentDisciplines';
import { academiesApi } from '../../api/academies';
import { useToast } from '../../components/ToastContext';
import { useConfirm } from '../../components/ConfirmContext';
import BeltImage from '../../components/BeltImage';
import DatePicker from '../../components/DatePicker';
import type { Student, BeltPromotion, PromotionType, StudentDiscipline, CompetitionResultForm, Discipline, DisciplineBelt } from '../../types';

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

const ALL_BELTS = ['Blanco', 'Gris', 'Amarillo', 'Naranja', 'Verde', 'Azul', 'Morado', 'Café', 'Negro'];

const TYPE_CONFIG: Record<PromotionType, { icon: string; label: string; color: string }> = {
  PROMOCION:   { icon: '🏆', label: 'Promoción',   color: 'text-green-600' },
  DEGRADACION: { icon: '🔻', label: 'Degradación', color: 'text-red-500' },
  GRADO:       { icon: '⭐', label: 'Grado',        color: 'text-amber-500' },
};


const TOUR_KEY = 'jjp_student_detail_tour';

function maxStripes(belt: string | null) {
  return belt === 'Negro' ? 9 : 4;
}

function BeltBadge({ belt, colorHex }: { belt: string; colorHex?: string | null }) {
  if (colorHex) {
    const r = parseInt(colorHex.slice(1, 3), 16);
    const g = parseInt(colorHex.slice(3, 5), 16);
    const b = parseInt(colorHex.slice(5, 7), 16);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return (
      <span
        className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border"
        style={{ background: colorHex, color: lum < 0.45 ? '#FFF' : '#111827', borderColor: colorHex }}
      >
        {belt}
      </span>
    );
  }
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


export default function StudentDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const confirm = useConfirm();

  const [student, setStudent] = useState<Student | null>(null);
  const [premiumSaving, setPremiumSaving] = useState(false);
  const [disciplines, setDisciplines] = useState<StudentDiscipline[]>([]);
  const [academyDisciplines, setAcademyDisciplines] = useState<Discipline[]>([]);
  const [loading, setLoading] = useState(true);

  const [showDiscForm, setShowDiscForm] = useState(false);
  const [discForm, setDiscForm] = useState({ disciplineId: '', ageCategoryId: '', belt: '', stripes: 0, joinDate: todayYMD() });
  const [discSaving, setDiscSaving] = useState(false);
  const [expandedDisc, setExpandedDisc] = useState<number | null>(null);
  const [discPromotions, setDiscPromotions] = useState<Record<number, BeltPromotion[]>>({});
  const [discActiveForm, setDiscActiveForm] = useState<Record<number, string | null>>({});
  const [discFormSaving, setDiscFormSaving] = useState(false);
  const [discGradeForm, setDiscGradeForm] = useState({ promotionDate: todayYMD(), notes: '' });
  const [discBeltForm, setDiscBeltForm] = useState({ toBelt: '', promotionDate: todayYMD(), notes: '' });
  const [discAnularTarget, setDiscAnularTarget] = useState<BeltPromotion | null>(null);
  const [discAnularReason, setDiscAnularReason] = useState('');
  const [discShowAnulados, setDiscShowAnulados] = useState<Record<number, boolean>>({});
  const [showResultFormFor, setShowResultFormFor] = useState<number | null>(null);
  const [resultForm, setResultForm] = useState<CompetitionResultForm>({ tournamentName: '', date: todayYMD(), placement: '', category: '', notes: '' });

  useEffect(() => {
    if (!id) return;
    const numId = Number(id);
    Promise.all([
      studentsApi.get(numId),
      studentDisciplinesApi.list(numId),
      academiesApi.getDisciplines(),
    ]).then(([s, d, ad]) => {
      setStudent(s);
      setDisciplines(d);
      setAcademyDisciplines(ad);
    }).finally(() => setLoading(false));
  }, [id]);

  const tourStartedRef = useRef(false);

  const runTour = () => {
    const first = disciplines[0];
    const firstCanGrade = !!first?.belt && first.stripes < maxStripes(first.belt);
    startStudentDetailTour({
      hasDisciplines: disciplines.length > 0,
      firstCanGrade,
      initialDismiss: localStorage.getItem(TOUR_KEY) === 'dismissed',
      onFinish: (dismissForever) => {
        if (dismissForever) localStorage.setItem(TOUR_KEY, 'dismissed');
        else localStorage.removeItem(TOUR_KEY);
      },
    });
  };

  // Auto-run the tour once the detail finishes loading, unless dismissed forever.
  useEffect(() => {
    if (loading || tourStartedRef.current) return;
    if (localStorage.getItem(TOUR_KEY) === 'dismissed') return;
    tourStartedRef.current = true;
    runTour();
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddDiscipline = async () => {
    if (!student || !discForm.disciplineId) return;
    setDiscSaving(true);
    try {
      const created = await studentDisciplinesApi.add(student.id, {
        disciplineId: Number(discForm.disciplineId),
        ageCategoryId: discForm.ageCategoryId ? Number(discForm.ageCategoryId) : null,
        belt: discForm.belt || null,
        stripes: discForm.stripes,
        joinDate: discForm.joinDate || null,
      });
      setDisciplines((prev) => [...prev, created]);
      setShowDiscForm(false);
      setDiscForm({ disciplineId: '', ageCategoryId: '', belt: '', stripes: 0, joinDate: todayYMD() });
      toast.success('Disciplina agregada');
    } catch {
      toast.error('Error al agregar disciplina');
    } finally {
      setDiscSaving(false);
    }
  };

  const handleDeleteDiscipline = async (discId: number) => {
    const ok = await confirm({ title: 'Eliminar disciplina', message: '¿Eliminar esta ficha técnica y todos sus resultados?', confirmLabel: 'Eliminar', danger: true });
    if (!ok) return;
    try {
      await studentDisciplinesApi.remove(discId);
      setDisciplines((prev) => prev.filter((d) => d.id !== discId));
      toast.success('Disciplina eliminada');
    } catch {
      toast.error('Error al eliminar');
    }
  };

  const handleSetPremium = async (months: number) => {
    if (!student) return;
    if (months <= 0) {
      const ok = await confirm({ title: 'Quitar Pro', message: '¿Quitar el acceso Pro de este alumno?', confirmLabel: 'Quitar', danger: true });
      if (!ok) return;
    }
    setPremiumSaving(true);
    try {
      const updated = await studentsApi.setPremium(student.id, months);
      setStudent(updated);
      toast.success(months > 0 ? `Pro otorgado (+${months} ${months === 1 ? 'mes' : 'meses'})` : 'Pro quitado');
    } catch {
      toast.error('No se pudo actualizar el Pro');
    } finally {
      setPremiumSaving(false);
    }
  };

  // ── Per-discipline promotion handlers ────────────────────────────────────

  const loadDiscPromotions = async (discId: number) => {
    const list = await beltPromotionsApi.getByStudentDiscipline(discId);
    setDiscPromotions((prev) => ({ ...prev, [discId]: list }));
  };

  const setDiscActiveFormFor = (discId: number, form: string | null) =>
    setDiscActiveForm((prev) => ({ ...prev, [discId]: form }));

  const handleDiscAddGrade = async (disc: StudentDiscipline) => {
    if (!student || !disc.belt) return;
    setDiscFormSaving(true);
    try {
      const created = await beltPromotionsApi.create({
        studentId: student.id,
        studentDisciplineId: disc.id,
        fromBelt: disc.belt,
        fromStripes: disc.stripes,
        toBelt: disc.belt,
        toStripes: disc.stripes + 1,
        promotionDate: discGradeForm.promotionDate,
        notes: discGradeForm.notes || null,
      });
      const [updatedDiscs, updatedPromos] = await Promise.all([
        studentDisciplinesApi.list(student.id),
        beltPromotionsApi.getByStudentDiscipline(disc.id),
      ]);
      setDisciplines(updatedDiscs);
      setDiscPromotions((prev) => ({ ...prev, [disc.id]: updatedPromos }));
      setDiscActiveFormFor(disc.id, null);
      setDiscGradeForm({ promotionDate: todayYMD(), notes: '' });
      toast.success(`Grado ${created.toStripes} registrado`);
    } catch {
      toast.error('Error al registrar grado');
    } finally {
      setDiscFormSaving(false);
    }
  };

  const handleDiscChangeBelt = async (disc: StudentDiscipline) => {
    if (!student || !discBeltForm.toBelt) return;
    setDiscFormSaving(true);
    try {
      const created = await beltPromotionsApi.create({
        studentId: student.id,
        studentDisciplineId: disc.id,
        fromBelt: disc.belt,
        fromStripes: disc.stripes,
        toBelt: discBeltForm.toBelt,
        toStripes: 0,
        promotionDate: discBeltForm.promotionDate,
        notes: discBeltForm.notes || null,
      });
      const [updatedDiscs, updatedPromos] = await Promise.all([
        studentDisciplinesApi.list(student.id),
        beltPromotionsApi.getByStudentDiscipline(disc.id),
      ]);
      setDisciplines(updatedDiscs);
      setDiscPromotions((prev) => ({ ...prev, [disc.id]: updatedPromos }));
      setDiscActiveFormFor(disc.id, null);
      setDiscBeltForm({ toBelt: '', promotionDate: todayYMD(), notes: '' });
      const msg = created.type === 'DEGRADACION' ? 'Degradación registrada' : 'Cinturón actualizado';
      toast.success(msg);
    } catch {
      toast.error('Error al actualizar cinturón');
    } finally {
      setDiscFormSaving(false);
    }
  };

  const handleDiscAnular = async (disc: StudentDiscipline) => {
    if (!discAnularTarget) return;
    setDiscFormSaving(true);
    try {
      await beltPromotionsApi.anular(discAnularTarget.id, discAnularReason);
      const updated = await beltPromotionsApi.getByStudentDiscipline(disc.id);
      setDiscPromotions((prev) => ({ ...prev, [disc.id]: updated }));
      // Reload discipline to get updated belt/stripes
      const updatedDiscs = await studentDisciplinesApi.list(student!.id);
      setDisciplines(updatedDiscs);
      setDiscAnularTarget(null);
      setDiscAnularReason('');
      toast.success('Registro anulado');
    } catch {
      toast.error('Error al anular');
    } finally {
      setDiscFormSaving(false);
    }
  };

  const handleAddResult = async (studentDisciplineId: number) => {
    if (!resultForm.tournamentName || !resultForm.date) return;
    setDiscSaving(true);
    try {
      const created = await studentDisciplinesApi.addResult(studentDisciplineId, resultForm);
      setDisciplines((prev) => prev.map((d) =>
        d.id === studentDisciplineId ? { ...d, competitionResults: [...d.competitionResults, created] } : d
      ));
      setShowResultFormFor(null);
      setResultForm({ tournamentName: '', date: todayYMD(), placement: '', category: '', notes: '', beltAtCompetition: null, stripesAtCompetition: 0 });
      toast.success('Resultado agregado');
    } catch {
      toast.error('Error al agregar resultado');
    } finally {
      setDiscSaving(false);
    }
  };

  const handleDeleteResult = async (studentDisciplineId: number, resultId: number) => {
    const ok = await confirm({ message: '¿Eliminar este resultado de competición?', danger: true });
    if (!ok) return;
    try {
      await studentDisciplinesApi.deleteResult(resultId);
      setDisciplines((prev) => prev.map((d) =>
        d.id === studentDisciplineId ? { ...d, competitionResults: d.competitionResults.filter((r) => r.id !== resultId) } : d
      ));
      toast.success('Resultado eliminado');
    } catch {
      toast.error('Error al eliminar');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!student) return (
    <div className="text-center py-12 text-gray-400">Alumno no encontrado</div>
  );

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
              {(disciplines.length > 0
                ? disciplines.filter((d) => d.active && d.belt)
                : (student.disciplineBelts ?? []).map((d) => ({ id: d.disciplineId, disciplineName: d.disciplineName, belt: d.belt, stripes: d.stripes, beltColorHex: d.beltColorHex, active: true }))
              ).map((d) => (
                <div key={d.id} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-16 flex-shrink-0 truncate">{d.disciplineName}</span>
                  <BeltImage belt={d.belt!} stripes={d.stripes} colorHex={d.beltColorHex ?? undefined} className="max-w-[180px]" />
                </div>
              ))}
              {student.joinDate && (
                <span className="text-xs text-gray-400">
                  📅 Ingresó el {formatDate(student.joinDate)}
                </span>
              )}
            </div>
          </div>
          <div className="flex-shrink-0 flex items-center gap-2">
            <button
              onClick={runTour}
              title="Ayuda"
              aria-label="Ayuda"
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 text-gray-500 hover:text-gray-700 hover:border-gray-400 text-sm font-bold transition-colors"
            >
              ?
            </button>
            <Link
              data-tour="editar"
              to={`/admin/students/${student.id}/edit`}
              className="text-sm text-primary-600 hover:text-primary-800 border border-primary-200 hover:border-primary-400 px-3 py-1.5 rounded-lg transition-colors"
            >
              Editar
            </Link>
          </div>
        </div>
      </div>

      {/* Premium / Pro */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="font-bold text-gray-900">Progreso Pro ⭐</h2>
            {student.isPremium ? (
              <p className="text-sm text-green-600 mt-0.5">Activo hasta {student.premiumUntil}</p>
            ) : (
              <p className="text-sm text-gray-400 mt-0.5">
                Inactivo{student.premiumUntil ? ` (venció el ${student.premiumUntil})` : ''}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {[1, 3, 12].map((m) => (
              <button
                key={m}
                onClick={() => handleSetPremium(m)}
                disabled={premiumSaving}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
              >
                +{m} {m === 1 ? 'mes' : 'meses'}
              </button>
            ))}
            {student.isPremium && (
              <button
                onClick={() => handleSetPremium(0)}
                disabled={premiumSaving}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
              >
                Quitar
              </button>
            )}
          </div>
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

      {/* Fichas Técnicas por Disciplina */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="font-bold text-gray-900">Fichas Técnicas</h2>
              <p className="text-xs text-gray-400 mt-0.5">{disciplines.length} disciplina{disciplines.length !== 1 ? 's' : ''}</p>
            </div>
            <button
              data-tour="agregar-disciplina"
              onClick={() => setShowDiscForm((v) => !v)}
              className={`text-sm font-medium px-3 py-2 rounded-lg border transition-colors ${
                showDiscForm
                  ? 'bg-primary-50 border-primary-300 text-primary-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-primary-300 hover:text-primary-700'
              }`}
            >
              {showDiscForm ? '✕ Cancelar' : '+ Agregar disciplina'}
            </button>
          </div>
        </div>

        {/* Add discipline form */}
        {showDiscForm && (() => {
          const selectedDisc = academyDisciplines.find((d) => d.id === Number(discForm.disciplineId));
          const hasCategories = (selectedDisc?.ageCategories?.length ?? 0) > 0;
          const selectedCat = selectedDisc?.ageCategories?.find((c) => c.id === Number(discForm.ageCategoryId));
          const availableBelts = selectedCat ? selectedCat.belts : [];

          return (
          <div className="p-5 border-b border-gray-100 bg-primary-50">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Nueva disciplina</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Disciplina *</label>
                <select
                  value={discForm.disciplineId}
                  onChange={(e) => setDiscForm((f) => ({ ...f, disciplineId: e.target.value, ageCategoryId: '', belt: student.belt ?? '', stripes: student.stripes ?? 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                >
                  <option value="">Seleccionar...</option>
                  {academyDisciplines
                    .filter((d) => d.active && !disciplines.some((sd) => sd.disciplineId === d.id))
                    .map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              {/* Category selector — only when discipline has categories configured */}
              {hasCategories && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Categoría de edad *</label>
                  <select
                    value={discForm.ageCategoryId}
                    onChange={(e) => setDiscForm((f) => ({ ...f, ageCategoryId: e.target.value, belt: '', stripes: 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                  >
                    <option value="">Seleccionar categoría...</option>
                    {selectedDisc!.ageCategories.map((c) => {
                      const ageLabel = c.minAge != null || c.maxAge != null ? ` (${c.minAge ?? '0'}-${c.maxAge ?? '∞'} años)` : '';
                      return <option key={c.id} value={c.id}>{c.name}{ageLabel}</option>;
                    })}
                  </select>
                </div>
              )}

              {/* Belt selector — from category if configured, fallback to ALL_BELTS */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Cinturón inicial</label>
                {hasCategories && availableBelts.length > 0 ? (
                  <select
                    value={discForm.belt}
                    onChange={(e) => setDiscForm((f) => ({ ...f, belt: e.target.value, stripes: 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                  >
                    <option value="">Sin cinturón</option>
                    {availableBelts.map((b) => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                ) : hasCategories && !discForm.ageCategoryId ? (
                  <p className="text-xs text-gray-400 italic py-2">Selecciona una categoría primero</p>
                ) : (
                  <select
                    value={discForm.belt}
                    onChange={(e) => setDiscForm((f) => ({ ...f, belt: e.target.value, stripes: 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                  >
                    <option value="">Sin cinturón</option>
                    {ALL_BELTS.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                )}
                {/* Belt color preview */}
                {discForm.belt && (
                  <div className="mt-1.5 flex items-center gap-2">
                    {(() => {
                      const beltDef = availableBelts.find((b) => b.name === discForm.belt);
                      if (!beltDef) return null;
                      const r = parseInt(beltDef.colorHex.slice(1, 3), 16);
                      const g = parseInt(beltDef.colorHex.slice(3, 5), 16);
                      const bv = parseInt(beltDef.colorHex.slice(5, 7), 16);
                      const lum = (0.299 * r + 0.587 * g + 0.114 * bv) / 255;
                      return (
                        <span
                          className="inline-block px-2 py-0.5 rounded-full text-xs font-medium border"
                          style={{ background: beltDef.colorHex, color: lum < 0.45 ? '#FFF' : '#111', borderColor: beltDef.colorHex }}
                        >
                          {discForm.belt}
                        </span>
                      );
                    })()}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Grados</label>
                <select
                  value={discForm.stripes}
                  onChange={(e) => setDiscForm((f) => ({ ...f, stripes: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                >
                  {Array.from({ length: maxStripes(discForm.belt || null) + 1 }, (_, i) => (
                    <option key={i} value={i}>{i === 0 ? 'Sin grados' : `${i} grado${i !== 1 ? 's' : ''}`}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de ingreso</label>
                <DatePicker
                  value={discForm.joinDate}
                  max={todayYMD()}
                  onChange={(v) => setDiscForm((f) => ({ ...f, joinDate: v }))}
                />
              </div>
            </div>
            <button
              onClick={handleAddDiscipline}
              disabled={!discForm.disciplineId || (hasCategories && !discForm.ageCategoryId) || discSaving}
              className="mt-4 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {discSaving ? 'Guardando...' : 'Agregar disciplina'}
            </button>
          </div>
          );
        })()}

        {/* Disciplines list */}
        <div className="p-5 space-y-4">
          {disciplines.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-6">Sin disciplinas registradas</p>
          ) : (
            disciplines.map((disc, idx) => {
              const isExpanded = expandedDisc === disc.id;
              const discDef = academyDisciplines.find((d) => d.id === disc.disciplineId);
              const catBelts: DisciplineBelt[] = (() => {
                if (disc.ageCategoryId) {
                  return discDef?.ageCategories?.find((c) => c.id === disc.ageCategoryId)?.belts ?? [];
                }
                // No category assigned — collect all belts from all categories (deduped by name)
                const all = discDef?.ageCategories?.flatMap(c => c.belts) ?? [];
                const seen = new Set<string>();
                return all.filter(b => { if (seen.has(b.name)) return false; seen.add(b.name); return true; });
              })();
              const beltList: string[] = catBelts.length > 0 ? catBelts.map((b) => b.name) : ALL_BELTS;
              const canAddGradeDisc = !!disc.belt && disc.stripes < maxStripes(disc.belt);
              const activeDiscForm = discActiveForm[disc.id] ?? null;
              const discPromos = discPromotions[disc.id] ?? null;

              const getBeltColorHex = (beltName: string): string | undefined =>
                catBelts.find((b) => b.name === beltName)?.colorHex;

              return (
                <div key={disc.id} className="border border-gray-200 rounded-xl overflow-hidden">
                  {/* Discipline header */}
                  <div className="flex items-center gap-3 p-4 bg-white">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm">{disc.disciplineName}</span>
                        {disc.ageCategoryName && (
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{disc.ageCategoryName}</span>
                        )}
                        {disc.belt && <BeltBadge belt={disc.belt} colorHex={disc.beltColorHex} />}
                        {disc.stripes > 0 && (
                          <span className="text-amber-400 text-xs">{'★'.repeat(disc.stripes)}</span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${disc.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {disc.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      {disc.joinDate && (
                        <p className="text-xs text-gray-400 mt-1">Ingresó: {formatDate(disc.joinDate)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {canAddGradeDisc && (
                        <button
                          data-tour={idx === 0 ? 'grado' : undefined}
                          onClick={() => {
                            setDiscActiveFormFor(disc.id, activeDiscForm === 'grado' ? null : 'grado');
                            setDiscGradeForm({ promotionDate: todayYMD(), notes: '' });
                          }}
                          className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${
                            activeDiscForm === 'grado'
                              ? 'bg-amber-50 border-amber-300 text-amber-700'
                              : 'border-gray-200 text-gray-500 hover:border-amber-300 hover:text-amber-700'
                          }`}
                        >
                          ⭐ Grado
                        </button>
                      )}
                      <button
                        data-tour={idx === 0 ? 'cinturon' : undefined}
                        onClick={() => {
                          setDiscActiveFormFor(disc.id, activeDiscForm === 'cinturon' ? null : 'cinturon');
                          setDiscBeltForm({ toBelt: '', promotionDate: todayYMD(), notes: '' });
                        }}
                        className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${
                          activeDiscForm === 'cinturon'
                            ? 'bg-blue-50 border-blue-300 text-blue-700'
                            : 'border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-700'
                        }`}
                      >
                        🏆 Cinturón
                      </button>
                      <button
                        data-tour={idx === 0 ? 'torneo' : undefined}
                        onClick={() => {
                          setShowResultFormFor(showResultFormFor === disc.id ? null : disc.id);
                          if (showResultFormFor !== disc.id) {
                            setResultForm({
                              tournamentName: '', date: todayYMD(), placement: '', category: '', notes: '',
                              beltAtCompetition: disc.belt ?? null,
                              stripesAtCompetition: disc.stripes,
                            });
                          }
                        }}
                        className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${
                          showResultFormFor === disc.id
                            ? 'bg-green-50 border-green-300 text-green-700'
                            : 'border-gray-200 text-gray-500 hover:border-green-300 hover:text-green-700'
                        }`}
                      >
                        🏅 Torneo
                      </button>
                      <button
                        data-tour={idx === 0 ? 'historial' : undefined}
                        onClick={() => {
                          const next = isExpanded ? null : disc.id;
                          setExpandedDisc(next);
                          if (next !== null && discPromos === null) {
                            loadDiscPromotions(disc.id);
                          }
                        }}
                        className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${
                          isExpanded
                            ? 'bg-primary-50 border-primary-300 text-primary-700'
                            : 'border-gray-200 text-gray-500 hover:border-primary-300 hover:text-primary-700'
                        }`}
                      >
                        📋 Historial
                      </button>
                      <button
                        onClick={() => handleDeleteDiscipline(disc.id)}
                        className="text-gray-300 hover:text-red-400 transition-colors ml-1"
                        title="Eliminar disciplina"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Add Grade form */}
                  {activeDiscForm === 'grado' && (
                    <div className="border-t border-amber-100 bg-amber-50 px-4 py-4 space-y-4">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <p className="text-sm font-semibold text-amber-800">⭐ Nuevo grado — {disc.belt}</p>
                      </div>
                      {/* Belt image preview */}
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500 mb-2">Actual</p>
                          <BeltImage belt={disc.belt!} stripes={disc.stripes} colorHex={disc.beltColorHex ?? getBeltColorHex(disc.belt!)} className="w-full max-w-[200px]" />
                        </div>
                        <span className="text-gray-400 text-xl flex-shrink-0">→</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500 mb-2">Nuevo grado</p>
                          <BeltImage belt={disc.belt!} stripes={disc.stripes + 1} colorHex={disc.beltColorHex ?? getBeltColorHex(disc.belt!)} className="w-full max-w-[200px]" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Fecha *</label>
                          <DatePicker
                            value={discGradeForm.promotionDate}
                            max={todayYMD()}
                            onChange={(v) => setDiscGradeForm((f) => ({ ...f, promotionDate: v }))}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Notas (opcional)</label>
                          <input
                            type="text"
                            value={discGradeForm.notes}
                            onChange={(e) => setDiscGradeForm((f) => ({ ...f, notes: e.target.value }))}
                            placeholder="ej: Examen técnico aprobado"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 outline-none bg-white"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDiscAddGrade(disc)}
                          disabled={!discGradeForm.promotionDate || discFormSaving}
                          className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {discFormSaving ? 'Guardando...' : 'Confirmar grado'}
                        </button>
                        <button
                          onClick={() => setDiscActiveFormFor(disc.id, null)}
                          className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 bg-white px-4 py-2 rounded-lg transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Change Belt form */}
                  {activeDiscForm === 'cinturon' && (() => {
                    const currentIdx = disc.belt ? beltList.indexOf(disc.belt) : -1;
                    const targetIdx = discBeltForm.toBelt ? beltList.indexOf(discBeltForm.toBelt) : -1;
                    const isDemotion = targetIdx !== -1 && currentIdx !== -1 && targetIdx < currentIdx;
                    const borderColor = isDemotion ? 'border-red-100' : 'border-blue-100';
                    const bgColor = isDemotion ? 'bg-red-50' : 'bg-blue-50';
                    const arrowColor = isDemotion ? 'text-red-400' : 'text-gray-400';
                    return (
                      <div className={`border-t ${borderColor} ${bgColor} px-4 py-4 space-y-4`}>
                        <p className={`text-sm font-semibold ${isDemotion ? 'text-red-800' : 'text-blue-800'}`}>
                          {isDemotion ? '⚠️ Degradación — ' : '🏆 Cambiar cinturón — '}{disc.disciplineName}
                        </p>

                        {/* Belt image preview */}
                        <div className="flex items-center gap-4 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 mb-2">Actual</p>
                            {disc.belt
                              ? <BeltImage belt={disc.belt} stripes={disc.stripes} colorHex={disc.beltColorHex ?? getBeltColorHex(disc.belt)} className="w-full max-w-[200px]" />
                              : <p className="text-xs text-gray-400 italic">Sin cinturón</p>
                            }
                          </div>
                          <span className={`text-xl flex-shrink-0 ${arrowColor}`}>{isDemotion ? '↓' : '→'}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 mb-2">{isDemotion ? 'Degradación a' : 'Nuevo cinturón'}</p>
                            {discBeltForm.toBelt
                              ? <BeltImage belt={discBeltForm.toBelt} stripes={0} colorHex={getBeltColorHex(discBeltForm.toBelt)} className="w-full max-w-[200px]" />
                              : <p className="text-xs text-gray-400 italic">Selecciona un cinturón</p>
                            }
                          </div>
                        </div>

                        {/* Demotion warning */}
                        {isDemotion && (
                          <div className="flex items-start gap-2 bg-red-100 border border-red-200 rounded-lg px-3 py-2.5">
                            <span className="text-red-500 flex-shrink-0 mt-0.5">⚠️</span>
                            <p className="text-xs text-red-700">
                              Estás bajando de <strong>{disc.belt}</strong> a <strong>{discBeltForm.toBelt}</strong>. Esto quedará registrado como una <strong>degradación</strong> en el historial. Si fue un error de carga, usa <em>Anular</em> en el historial en vez de degradar.
                            </p>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Nuevo cinturón *</label>
                            <select
                              value={discBeltForm.toBelt}
                              onChange={(e) => setDiscBeltForm((f) => ({ ...f, toBelt: e.target.value }))}
                              className={`w-full px-3 py-2 border rounded-lg text-sm outline-none bg-white ${isDemotion ? 'border-red-300 focus:ring-2 focus:ring-red-400' : 'border-gray-200 focus:ring-2 focus:ring-blue-400'}`}
                            >
                              <option value="">Seleccionar...</option>
                              {beltList
                                .filter((b) => b !== disc.belt)
                                .map((b) => {
                                  const idx = beltList.indexOf(b);
                                  const isDown = currentIdx !== -1 && idx < currentIdx;
                                  return <option key={b} value={b}>{isDown ? `↓ ${b} (degradación)` : b}</option>;
                                })}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Fecha *</label>
                            <DatePicker
                              value={discBeltForm.promotionDate}
                              max={todayYMD()}
                              onChange={(v) => setDiscBeltForm((f) => ({ ...f, promotionDate: v }))}
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-xs text-gray-500 mb-1">
                              {isDemotion ? 'Motivo de degradación *' : 'Notas (opcional)'}
                            </label>
                            <input
                              type="text"
                              value={discBeltForm.notes}
                              onChange={(e) => setDiscBeltForm((f) => ({ ...f, notes: e.target.value }))}
                              placeholder={isDemotion ? 'ej: Decisión del instructor por...' : 'ej: Aprobó examen de graduación'}
                              className={`w-full px-3 py-2 border rounded-lg text-sm outline-none ${isDemotion ? 'border-red-300 focus:ring-2 focus:ring-red-400 bg-white' : 'border-gray-200 focus:ring-2 focus:ring-blue-400 bg-white'}`}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDiscChangeBelt(disc)}
                            disabled={!discBeltForm.toBelt || !discBeltForm.promotionDate || (isDemotion && !discBeltForm.notes.trim()) || discFormSaving}
                            className={`text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors disabled:opacity-50 ${isDemotion ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                          >
                            {discFormSaving ? 'Guardando...' : isDemotion ? 'Confirmar degradación' : 'Confirmar cambio'}
                          </button>
                          <button
                            onClick={() => setDiscActiveFormFor(disc.id, null)}
                            className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 bg-white px-4 py-2 rounded-lg transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* History + Results expanded panel */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-5">

                      {/* Belt promotion history */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Historial de graduaciones</h4>
                          {discPromos !== null && discPromos.some((p) => p.deleted) && (
                            <button
                              type="button"
                              onClick={() => setDiscShowAnulados((prev) => ({ ...prev, [disc.id]: !prev[disc.id] }))}
                              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              {discShowAnulados[disc.id]
                                ? 'Ocultar anulados'
                                : `Mostrar anulados (${discPromos.filter((p) => p.deleted).length})`}
                            </button>
                          )}
                        </div>
                        {discPromos === null ? (
                          <p className="text-xs text-gray-400 text-center py-2">Cargando...</p>
                        ) : discPromos.filter((p) => !p.deleted || discShowAnulados[disc.id]).length === 0 ? (
                          <p className="text-xs text-gray-400 text-center py-2">Sin registros de graduación</p>
                        ) : (
                          <div className="space-y-2">
                            {discPromos.filter((p) => !p.deleted || discShowAnulados[disc.id]).map((promo) => {
                              const tc = TYPE_CONFIG[promo.type];
                              const fromHex = promo.fromBelt ? getBeltColorHex(promo.fromBelt) : undefined;
                              const toHex = getBeltColorHex(promo.toBelt);
                              return (
                                <div key={promo.id} className={`flex items-start gap-3 bg-white rounded-lg p-3 border ${promo.deleted ? 'opacity-50 border-gray-100' : 'border-gray-100'}`}>
                                  <span className="text-base mt-0.5 flex-shrink-0">{tc.icon}</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className={`text-xs font-semibold ${tc.color}`}>{tc.label}</span>
                                      {promo.fromBelt && (
                                        <>
                                          <BeltBadge belt={promo.fromBelt} colorHex={fromHex} />
                                          {promo.fromStripes != null && promo.fromStripes > 0 && (
                                            <span className="text-amber-400 text-xs">{'★'.repeat(promo.fromStripes)}</span>
                                          )}
                                          <span className="text-gray-300 text-xs">→</span>
                                        </>
                                      )}
                                      <BeltBadge belt={promo.toBelt} colorHex={toHex} />
                                      {promo.toStripes > 0 && (
                                        <span className="text-amber-400 text-xs">{'★'.repeat(promo.toStripes)}</span>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-400">
                                      <span>{formatDate(promo.promotionDate)}</span>
                                      {promo.performedBy && <span>por {promo.performedBy}</span>}
                                      {promo.notes && <span className="italic">"{promo.notes}"</span>}
                                    </div>
                                    {promo.deleted && (
                                      <p className="text-xs text-red-400 mt-1">
                                        Anulado{promo.deletedBy ? ` por ${promo.deletedBy}` : ''}
                                        {promo.deletedAt ? ` · ${formatDate(promo.deletedAt)}` : ''}
                                        {promo.deletedReason ? ` — "${promo.deletedReason}"` : ''}
                                      </p>
                                    )}
                                  </div>
                                  {!promo.deleted && promo.deletable && discAnularTarget?.id !== promo.id && (
                                    <button
                                      onClick={() => { setDiscAnularTarget(promo); setDiscAnularReason(''); }}
                                      className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 text-xs"
                                      title="Anular registro"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Competition results list */}
                      <div>
                        <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Resultados de competición</h4>
                        {disc.competitionResults.length === 0 ? (
                          <p className="text-xs text-gray-400 text-center py-2">Sin resultados registrados</p>
                        ) : (
                          <div className="space-y-2">
                            {disc.competitionResults.map((result) => {
                              const resHex = result.beltAtCompetition ? getBeltColorHex(result.beltAtCompetition) : undefined;
                              return (
                                <div key={result.id} className="flex items-start gap-3 bg-white rounded-lg p-3 border border-gray-100">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm text-gray-900">{result.tournamentName}</p>
                                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-gray-500">
                                      <span>{formatDate(result.date)}</span>
                                      {result.placement && <span>🏅 {result.placement}</span>}
                                      {result.category && <span>⚖️ {result.category}</span>}
                                    </div>
                                    {result.beltAtCompetition && (
                                      <div className="flex items-center gap-1.5 mt-1.5">
                                        <span className="text-xs text-gray-400">Cinturón:</span>
                                        <BeltBadge belt={result.beltAtCompetition} colorHex={resHex} />
                                        {result.stripesAtCompetition > 0 && (
                                          <span className="text-amber-400 text-xs">{'★'.repeat(result.stripesAtCompetition)}</span>
                                        )}
                                      </div>
                                    )}
                                    {result.notes && <p className="text-xs text-gray-400 italic mt-1">"{result.notes}"</p>}
                                  </div>
                                  <button
                                    onClick={() => handleDeleteResult(disc.id, result.id)}
                                    className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                                    title="Eliminar resultado"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Add tournament result form — triggered by 🏅 Torneo button */}
                  {showResultFormFor === disc.id && (
                    <div className="border-t border-green-100 bg-green-50 px-4 py-4 space-y-3">
                      <p className="text-xs font-semibold text-gray-700">Agregar resultado de torneo — {disc.disciplineName}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-xs text-gray-500 mb-1">Torneo *</label>
                          <input
                            type="text"
                            value={resultForm.tournamentName}
                            onChange={(e) => setResultForm((f) => ({ ...f, tournamentName: e.target.value }))}
                            placeholder="ej: Campeonato Nacional 2025"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-400 outline-none bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Fecha *</label>
                          <DatePicker
                            value={resultForm.date}
                            max={todayYMD()}
                            onChange={(v) => setResultForm((f) => ({ ...f, date: v }))}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Posición</label>
                          <input
                            type="text"
                            value={resultForm.placement}
                            onChange={(e) => setResultForm((f) => ({ ...f, placement: e.target.value }))}
                            placeholder="ej: 1er lugar"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-400 outline-none bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Categoría de peso/edad</label>
                          <input
                            type="text"
                            value={resultForm.category}
                            onChange={(e) => setResultForm((f) => ({ ...f, category: e.target.value }))}
                            placeholder="ej: -70kg Adulto"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-400 outline-none bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Cinturón en el torneo</label>
                          <div className="flex gap-2">
                            <select
                              value={resultForm.beltAtCompetition ?? ''}
                              onChange={(e) => setResultForm((f) => ({ ...f, beltAtCompetition: e.target.value || null, stripesAtCompetition: 0 }))}
                              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-400 outline-none bg-white"
                            >
                              <option value="">Sin cinturón</option>
                              {beltList.map((b) => <option key={b} value={b}>{b}</option>)}
                            </select>
                            <select
                              value={resultForm.stripesAtCompetition ?? 0}
                              onChange={(e) => setResultForm((f) => ({ ...f, stripesAtCompetition: Number(e.target.value) }))}
                              className="w-20 px-2 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-400 outline-none bg-white"
                            >
                              {Array.from({ length: maxStripes(resultForm.beltAtCompetition ?? null) + 1 }, (_, i) => (
                                <option key={i} value={i}>{i === 0 ? '0★' : `${i}★`}</option>
                              ))}
                            </select>
                          </div>
                          {resultForm.beltAtCompetition && (() => {
                            const hex = getBeltColorHex(resultForm.beltAtCompetition);
                            if (!hex) return null;
                            const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), bv = parseInt(hex.slice(5,7),16);
                            const lum = (0.299*r + 0.587*g + 0.114*bv)/255;
                            return (
                              <span className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                                style={{ background: hex, color: lum < 0.45 ? '#FFF' : '#111', borderColor: hex }}>
                                {resultForm.beltAtCompetition}
                                {(resultForm.stripesAtCompetition ?? 0) > 0 && <span>{'★'.repeat(resultForm.stripesAtCompetition!)}</span>}
                              </span>
                            );
                          })()}
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Notas</label>
                          <input
                            type="text"
                            value={resultForm.notes}
                            onChange={(e) => setResultForm((f) => ({ ...f, notes: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-400 outline-none bg-white"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAddResult(disc.id)}
                          disabled={!resultForm.tournamentName || !resultForm.date || discSaving}
                          className="bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {discSaving ? 'Guardando...' : 'Guardar resultado'}
                        </button>
                        <button
                          onClick={() => {
                            setShowResultFormFor(null);
                            setResultForm({ tournamentName: '', date: todayYMD(), placement: '', category: '', notes: '', beltAtCompetition: null, stripesAtCompetition: 0 });
                          }}
                          className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 bg-white px-4 py-2 rounded-lg transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Anular per-discipline modal */}
      {discAnularTarget && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4">
            <h2 className="font-bold text-white">Anular registro</h2>
            <p className="text-sm text-gray-400">
              El registro quedará visible en el historial marcado como anulado. La acción no se puede deshacer.
            </p>
            <div className="bg-gray-800 rounded-lg px-3 py-2.5 text-xs text-gray-300 space-y-0.5">
              <p className="font-semibold">{TYPE_CONFIG[discAnularTarget.type as PromotionType]?.icon} {TYPE_CONFIG[discAnularTarget.type as PromotionType]?.label}</p>
              <p>{discAnularTarget.toBelt}{discAnularTarget.toStripes > 0 ? ` · ${'★'.repeat(discAnularTarget.toStripes)}` : ''} — {formatDate(discAnularTarget.promotionDate)}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Motivo (opcional)</label>
              <textarea
                value={discAnularReason}
                onChange={(e) => setDiscAnularReason(e.target.value)}
                rows={3}
                placeholder="ej: registro duplicado, error de fecha..."
                className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 placeholder:text-gray-500 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  const disc = disciplines.find(d => d.id === discAnularTarget.studentDisciplineId);
                  if (disc) handleDiscAnular(disc);
                }}
                disabled={discFormSaving}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {discFormSaving ? 'Anulando...' : 'Anular registro'}
              </button>
              <button
                onClick={() => { setDiscAnularTarget(null); setDiscAnularReason(''); }}
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
