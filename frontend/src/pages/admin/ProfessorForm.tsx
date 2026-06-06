import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { professorsApi } from '../../api/professors';
import { studentsApi } from '../../api/students';
import { academiesApi } from '../../api/academies';
import { filesApi } from '../../api/files';
import { useToast } from '../../components/ToastContext';
import LoadingOverlay from '../../components/LoadingOverlay';
import FormInput from '../../components/FormInput';
import FormSelect from '../../components/FormSelect';
import FormTextarea from '../../components/FormTextarea';
import ImageUpload from '../../components/ImageUpload';
import type { Discipline, Professor, ProfessorForm as ProfessorFormType, Student } from '../../types';


const lbl = 'block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5';
const hint = 'mt-1 text-xs text-gray-500';
const err = 'mt-1 text-xs text-red-400';

export default function ProfessorForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState<ProfessorFormType>({
    name: '', photoUrl: null, bio: null, achievements: null, displayOrder: 0, studentId: null, disciplineId: null, email: null,
  });
  const [loaded, setLoaded] = useState<Professor | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState('');
  const [disciplineError, setDisciplineError] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    studentsApi.list().then((list) => setStudents(list.filter((s) => s.active)));
    academiesApi.getDisciplines().then(setDisciplines);
    if (id) {
      professorsApi.get(Number(id)).then((p) => {
        setLoaded(p);
        setForm({
          name: p.name,
          photoUrl: p.photoUrl,
          bio: p.bio,
          achievements: p.achievements,
          displayOrder: p.displayOrder ?? 0,
          studentId: p.studentId ?? null,
          disciplineId: p.disciplineId ?? null,
          email: p.email ?? null,
        });
      });
    }
  }, [id]);

  const handlePhotoUpload = async (file: File) => {
    setUploading(true);
    setUploadProgress(0);
    try {
      const { url } = await filesApi.upload(file, {
        gallery: false,
        purpose: 'profile',
        onProgress: setUploadProgress,
      });
      setForm((f) => ({ ...f, photoUrl: url }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al subir la foto';
      toast.error(msg);
      throw err;
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let invalid = false;
    if (!form.name.trim()) { setNameError('El nombre es obligatorio'); invalid = true; }
    if (!form.disciplineId) { setDisciplineError('La disciplina es obligatoria'); invalid = true; }
    if (invalid) return;

    setSaving(true);
    try {
      const [result] = await Promise.allSettled([
        isEdit && id ? professorsApi.update(Number(id), form) : professorsApi.create(form),
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]);
      if (result.status === 'rejected') throw result.reason;
      toast.success(isEdit ? 'Profesor actualizado' : 'Profesor creado');
      setTimeout(() => navigate('/admin/professors'), 1000);
    } catch {
      toast.error('Ocurrió un error al guardar. Intente nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      {saving && <LoadingOverlay message={isEdit ? 'Actualizando profesor...' : 'Creando profesor...'} />}
      <h1 className="text-2xl font-bold mb-6">{isEdit ? 'Editar Profesor' : 'Nuevo Profesor'}</h1>

      <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">

        {/* Foto + Nombre */}
        <div className="flex gap-5 items-start">
          <ImageUpload
            value={form.photoUrl}
            onFile={handlePhotoUpload}
            onRemove={() => setForm((f) => ({ ...f, photoUrl: null }))}
            uploading={uploading}
            progress={uploadProgress}
            profile="profile"
            label="foto del profesor"
            aspect="portrait"
          />
          <div className="flex-1 space-y-4">
            <div>
              <label className={lbl}>Nombre *</label>
              <FormInput
                type="text"
                value={form.name}
                onChange={(e) => { setForm({ ...form, name: e.target.value }); setNameError(''); }}
                required
                error={nameError}
                placeholder="Nombre completo del profesor"
              />
              {nameError && <p className={err}>{nameError}</p>}
            </div>
            <div>
              <label className={lbl}>Disciplina que enseña *</label>
              <FormSelect
                value={form.disciplineId?.toString() ?? ''}
                onChange={(e) => {
                  setForm({ ...form, disciplineId: e.target.value ? Number(e.target.value) : null });
                  setDisciplineError('');
                }}
              >
                <option value="">— Selecciona una disciplina —</option>
                {disciplines.filter((d) => d.active).map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </FormSelect>
              {disciplineError && <p className={err}>{disciplineError}</p>}
            </div>
          </div>
        </div>

        {/* Cinturón actual + historial (solo en edición) */}
        {isEdit && loaded && (
          <div className="rounded-lg border border-gray-800 bg-gray-950/40 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">Cinturón / Rango actual</div>
                <div className="text-sm font-medium text-white">
                  {loaded.belt ? loaded.belt : <span className="text-gray-500 italic">Sin asignar</span>}
                </div>
              </div>
              {loaded.studentId && (
                <Link
                  to={`/admin/students/${loaded.studentId}`}
                  className="text-xs text-primary-400 hover:text-primary-300 font-medium whitespace-nowrap"
                >
                  Ver historial de grados →
                </Link>
              )}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              El cinturón y el historial de promociones se gestionan desde la ficha del alumno asociado al profesor.
            </p>
          </div>
        )}

        {/* Aviso para profesor nuevo */}
        {!isEdit && (
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-xs text-blue-300">
            Al crear el profesor se generará automáticamente una ficha asociada para registrar su cinturón e historial de grados en la disciplina seleccionada. Podrás asignar el cinturón inicial desde la ficha después de guardar.
          </div>
        )}

        <div>
          <label className={lbl}>Email de contacto <span className="text-gray-600 font-normal normal-case">(opcional)</span></label>
          <FormInput
            type="email"
            value={form.email ?? ''}
            onChange={(e) => setForm({ ...form, email: e.target.value || null })}
            placeholder="profesor@email.com"
          />
          <p className={hint}>
            Necesario para darle acceso al sistema desde la pantalla de Profesores.
            Si lo dejas vacío y el profesor está vinculado a un alumno, se usará el email del alumno.
          </p>
        </div>

        <div>
          <label className={lbl}>Biografía</label>
          <FormTextarea
            value={form.bio ?? ''}
            onChange={(e) => setForm({ ...form, bio: e.target.value || null })}
            rows={4}
            placeholder="Describe la trayectoria y experiencia del profesor..."
          />
        </div>

        <div>
          <label className={lbl}>
            Logros y títulos
            <span className="text-gray-600 font-normal ml-1 normal-case">(uno por línea)</span>
          </label>
          <FormTextarea
            value={form.achievements ?? ''}
            onChange={(e) => setForm({ ...form, achievements: e.target.value || null })}
            rows={4}
            placeholder={"Campeón Mundial IBJJF 2022\nCinturón negro bajo Prof. X\nMedalla de oro Panamericanos 2021"}
          />
        </div>

        <div>
          <label className={lbl}>Alumno vinculado <span className="text-gray-600 font-normal normal-case">(opcional)</span></label>
          <FormSelect
            value={form.studentId?.toString() ?? ''}
            onChange={(e) => setForm({ ...form, studentId: e.target.value ? Number(e.target.value) : null })}
          >
            <option value="">— Sin vínculo (se creará una ficha automática) —</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </FormSelect>
          <p className={hint}>Si el profesor también entrena y paga mensualidad, vincúlalo a su ficha de alumno para evitar duplicar datos.</p>
          {form.studentId && (
            <div className="mt-2 flex items-center gap-2 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
              Vinculado a: <span className="font-medium">{students.find(s => s.id === form.studentId)?.name}</span>
            </div>
          )}
        </div>

        <div>
          <label className={lbl}>Orden de visualización</label>
          <FormInput
            type="number"
            min={0}
            value={form.displayOrder}
            onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })}
            className="w-32"
          />
          <p className={hint}>Número menor = aparece primero en el perfil público</p>
        </div>

        <div className="flex gap-3 pt-2 border-t border-gray-800">
          <button
            type="submit"
            disabled={saving}
            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear profesor'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/professors')}
            className="px-6 py-2.5 border border-gray-700 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
