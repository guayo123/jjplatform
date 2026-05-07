import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DatePicker from '../../components/DatePicker';
import FormInput from '../../components/FormInput';
import FormSelect from '../../components/FormSelect';
import FormTextarea from '../../components/FormTextarea';
import ImageUpload from '../../components/ImageUpload';
import { studentsApi } from '../../api/students';
import { academiesApi } from '../../api/academies';
import { filesApi } from '../../api/files';
import { useStudentStore } from '../../stores/studentStore';
import { useToast } from '../../components/ToastContext';
import LoadingOverlay from '../../components/LoadingOverlay';
import type { StudentForm as StudentFormType, Plan } from '../../types';

function todayYMD(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

function formatRut(value: string): string {
  const clean = value.replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length < 2) return clean;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formatted}-${dv}`;
}

function validateRut(rut: string): boolean {
  const clean = rut.replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length < 2) return false;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const remainder = 11 - (sum % 11);
  const expected = remainder === 11 ? '0' : remainder === 10 ? 'K' : String(remainder);
  return dv === expected;
}

function groupPlansByDiscipline(plans: Plan[]) {
  const grouped = new Map<string, Plan[]>();
  plans.forEach((plan) => {
    const key = plan.disciplineName || 'Sin disciplina';
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(plan);
  });
  return Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]));
}

const lbl = 'block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5';
const hint = 'mt-1 text-xs text-gray-500';
const err = 'mt-1 text-xs text-red-400';

export default function StudentForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { createStudent, updateStudent } = useStudentStore();

  const [form, setForm] = useState<StudentFormType>({
    name: '', nickname: null, rut: null, email: null, phone: null,
    emergencyPhone: null, joinDate: null, age: null, weight: null,
    belt: null, photoUrl: null, address: null, medicalNotes: null,
    bloodType: null, healthInsuranceType: null, healthInsuranceCompany: null,
    active: true, planIds: [],
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [errors, setErrors] = useState<{
    name?: string; rut?: string; email?: string; phone?: string;
    emergencyPhone?: string; joinDate?: string; age?: string;
    belt?: string; address?: string; planIds?: string;
  }>({});
  const { toast } = useToast();

  const validate = () => {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = 'El nombre es obligatorio';
    else if (!/^[a-zA-ZÀ-ɏ\s]+$/.test(form.name)) e.name = 'El nombre solo puede contener letras';
    if (!form.rut) e.rut = 'El RUT es obligatorio';
    else if (!validateRut(form.rut)) e.rut = 'RUT inválido';
    if (!form.email) e.email = 'El correo es obligatorio';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Correo electrónico inválido';
    if (!form.phone) e.phone = 'El teléfono es obligatorio';
    if (!form.emergencyPhone) e.emergencyPhone = 'El teléfono de emergencia es obligatorio';
    if (!form.joinDate) e.joinDate = 'La fecha de ingreso es obligatoria';
    if (form.age === null || form.age === undefined) e.age = 'La edad es obligatoria';
    else if (form.age < 1 || form.age > 150) e.age = 'La edad debe estar entre 1 y 150';
    if (!isEdit && !form.belt) e.belt = 'El cinturón inicial es obligatorio';
    if (!form.address?.trim()) e.address = 'La dirección es obligatoria';
    if (!form.planIds || form.planIds.length === 0) e.planIds = 'Debe seleccionar al menos un plan';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  useEffect(() => { academiesApi.getPlans().then(setPlans); }, []);

  useEffect(() => {
    if (id) {
      studentsApi.get(Number(id)).then((s) =>
        setForm({
          name: s.name, nickname: s.nickname, rut: s.rut, email: s.email,
          phone: s.phone, emergencyPhone: s.emergencyPhone, joinDate: s.joinDate,
          age: s.age, weight: s.weight, belt: s.belt, photoUrl: s.photoUrl,
          address: s.address, medicalNotes: s.medicalNotes, bloodType: s.bloodType,
          healthInsuranceType: s.healthInsuranceType, healthInsuranceCompany: s.healthInsuranceCompany,
          active: s.active, planIds: s.enrolledPlans?.map(p => p.id) || [],
        })
      );
    }
  }, [id]);

  const handlePhotoUpload = async (file: File) => {
    setUploading(true);
    try {
      const { url } = await filesApi.upload(file, false);
      setForm((f) => ({ ...f, photoUrl: url }));
    } catch {
      toast.error('Error al subir la foto');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const [result] = await Promise.allSettled([
        isEdit && id ? updateStudent(Number(id), form) : createStudent(form),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
      if (result.status === 'rejected') throw result.reason;
      toast.success(isEdit ? 'Alumno actualizado correctamente' : 'Alumno creado correctamente');
      setTimeout(() => navigate('/admin/students'), 1500);
    } catch {
      toast.error('Ocurrió un error al guardar. Intente nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      {saving && <LoadingOverlay message={isEdit ? 'Actualizando alumno...' : 'Creando alumno...'} />}
      <h1 className="text-2xl font-bold mb-6">{isEdit ? 'Editar Alumno' : 'Nuevo Alumno'}</h1>

      <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">

        {/* Foto */}
        <div className="flex gap-5 items-start">
          <ImageUpload
            value={form.photoUrl}
            onFile={handlePhotoUpload}
            onRemove={() => setForm((f) => ({ ...f, photoUrl: null }))}
            uploading={uploading}
            label="foto del alumno"
            aspect="portrait"
          />
          <div className="flex-1 space-y-4">
            <div>
              <label className={lbl}>Nombre *</label>
              <FormInput
                type="text"
                value={form.name}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^[a-zA-ZÀ-ɏ\s]*$/.test(val)) {
                    setForm({ ...form, name: val });
                    setErrors((er) => ({ ...er, name: undefined }));
                  }
                }}
                error={errors.name}
                placeholder="Nombre completo"
              />
              {errors.name && <p className={err}>{errors.name}</p>}
            </div>
            <div>
              <label className={lbl}>Apodo</label>
              <FormInput
                type="text"
                value={form.nickname ?? ''}
                onChange={(e) => setForm({ ...form, nickname: e.target.value || null })}
                placeholder="ej: El Tigre, Chico..."
              />
            </div>
          </div>
        </div>

        <div>
          <label className={lbl}>RUT *</label>
          <FormInput
            type="text"
            value={form.rut ?? ''}
            onChange={(e) => {
              setForm((f) => ({ ...f, rut: formatRut(e.target.value) || null }));
              setErrors((er) => ({ ...er, rut: undefined }));
            }}
            placeholder="12.345.678-9"
            maxLength={12}
            error={errors.rut}
          />
          {errors.rut && <p className={err}>{errors.rut}</p>}
        </div>

        <div>
          <label className={lbl}>Correo electrónico *</label>
          <FormInput
            type="email"
            value={form.email ?? ''}
            onChange={(e) => {
              setForm((f) => ({ ...f, email: e.target.value || null }));
              setErrors((er) => ({ ...er, email: undefined }));
            }}
            placeholder="nombre@ejemplo.com"
            error={errors.email}
          />
          {errors.email && <p className={err}>{errors.email}</p>}
        </div>

        <div>
          <label className={lbl}>Teléfono / WhatsApp *</label>
          <div className="flex">
            <span className="inline-flex items-center px-3 text-sm text-gray-400 bg-gray-800 border border-r-0 border-gray-700 rounded-l-lg font-medium select-none">
              +56
            </span>
            <FormInput
              type="tel"
              value={form.phone?.replace(/^\+?56/, '') ?? ''}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
                setForm((f) => ({ ...f, phone: digits ? `+56${digits}` : null }));
                setErrors((er) => ({ ...er, phone: undefined }));
              }}
              placeholder="9 1234 5678"
              maxLength={9}
              className="rounded-l-none"
              error={errors.phone}
            />
          </div>
          {errors.phone ? <p className={err}>{errors.phone}</p> : <p className={hint}>Se usará para enviar recordatorios de pago por WhatsApp</p>}
        </div>

        <div>
          <label className={lbl}>Teléfono de emergencia *</label>
          <div className="flex">
            <span className="inline-flex items-center px-3 text-sm text-gray-400 bg-gray-800 border border-r-0 border-gray-700 rounded-l-lg font-medium select-none">
              +56
            </span>
            <FormInput
              type="tel"
              value={form.emergencyPhone?.replace(/^\+?56/, '') ?? ''}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
                setForm((f) => ({ ...f, emergencyPhone: digits ? `+56${digits}` : null }));
                setErrors((er) => ({ ...er, emergencyPhone: undefined }));
              }}
              placeholder="9 1234 5678"
              maxLength={9}
              className="rounded-l-none"
              error={errors.emergencyPhone}
            />
          </div>
          {errors.emergencyPhone ? <p className={err}>{errors.emergencyPhone}</p> : <p className={hint}>Contacto en caso de emergencia</p>}
        </div>

        <div>
          <label className={lbl}>Fecha de ingreso *</label>
          <DatePicker
            value={form.joinDate ?? ''}
            max={todayYMD()}
            onChange={(v) => {
              setForm((f) => ({ ...f, joinDate: v || null }));
              setErrors((er) => ({ ...er, joinDate: undefined }));
            }}
          />
          {errors.joinDate && <p className={err}>{errors.joinDate}</p>}
        </div>

        <div className={isEdit ? '' : 'grid grid-cols-2 gap-4'}>
          <div>
            <label className={lbl}>Edad *</label>
            <FormInput
              type="number"
              value={form.age ?? ''}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : null;
                setForm({ ...form, age: val });
                if (val === null) setErrors((er) => ({ ...er, age: 'La edad es obligatoria' }));
                else if (val < 1 || val > 150) setErrors((er) => ({ ...er, age: 'La edad debe estar entre 1 y 150' }));
                else setErrors((er) => ({ ...er, age: undefined }));
              }}
              min={1} max={150}
              error={errors.age}
            />
            {errors.age && <p className={err}>{errors.age}</p>}
          </div>
          {!isEdit && (
            <div>
              <label className={lbl}>Cinturón inicial *</label>
              <FormSelect
                value={form.belt ?? ''}
                onChange={(e) => {
                  setForm({ ...form, belt: e.target.value || null });
                  setErrors((er) => ({ ...er, belt: undefined }));
                }}
                error={errors.belt}
              >
                <option value="">Seleccionar cinturón...</option>
                <optgroup label="Juveniles (≤ 15 años)">
                  {['Blanco','Gris','Amarillo','Naranja','Verde'].map(b => <option key={b} value={b}>{b}</option>)}
                </optgroup>
                <optgroup label="Adultos (16+ años)">
                  {['Blanco','Azul','Morado','Café','Negro'].map(b => <option key={b} value={b}>{b}</option>)}
                </optgroup>
              </FormSelect>
              {errors.belt && <p className={err}>{errors.belt}</p>}
            </div>
          )}
        </div>

        <div>
          <label className={lbl}>Peso (kg)</label>
          <FormInput
            type="number"
            value={form.weight ?? ''}
            onChange={(e) => setForm({ ...form, weight: e.target.value ? Number(e.target.value) : null })}
            min={1} max={300} step={0.1}
            placeholder="ej: 72.5"
          />
        </div>

        <div>
          <label className={lbl}>Dirección *</label>
          <FormInput
            type="text"
            value={form.address ?? ''}
            onChange={(e) => {
              setForm({ ...form, address: e.target.value || null });
              setErrors((er) => ({ ...er, address: undefined }));
            }}
            error={errors.address}
          />
          {errors.address && <p className={err}>{errors.address}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Tipo de sangre</label>
            <FormSelect
              value={form.bloodType ?? ''}
              onChange={(e) => setForm({ ...form, bloodType: e.target.value || null })}
            >
              <option value="">Sin especificar</option>
              {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t => <option key={t} value={t}>{t}</option>)}
            </FormSelect>
          </div>
          <div>
            <label className={lbl}>Previsión de salud</label>
            <FormSelect
              value={form.healthInsuranceType ?? ''}
              onChange={(e) => setForm({ ...form, healthInsuranceType: e.target.value || null, healthInsuranceCompany: null })}
            >
              <option value="">Sin especificar</option>
              <option value="FONASA">Fonasa</option>
              <option value="ISAPRE">Isapre</option>
            </FormSelect>
          </div>
        </div>

        {form.healthInsuranceType === 'ISAPRE' && (
          <div>
            <label className={lbl}>Isapre</label>
            <FormSelect
              value={form.healthInsuranceCompany ?? ''}
              onChange={(e) => setForm({ ...form, healthInsuranceCompany: e.target.value || null })}
            >
              <option value="">Seleccionar Isapre</option>
              {['Banmédica','Colmena','Consalud','CruzBlanca','Nueva Masvida','Vida Tres','Esencial','Isalud','Fundación','Cruz del Norte'].map(c => <option key={c} value={c}>{c}</option>)}
            </FormSelect>
          </div>
        )}

        <div>
          <label className={lbl}>Enfermedades de base / Notas médicas</label>
          <FormTextarea
            value={form.medicalNotes ?? ''}
            onChange={(e) => setForm({ ...form, medicalNotes: e.target.value || null })}
            rows={3}
          />
        </div>

        <div>
          <label className={lbl}>Estado</label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setForm({ ...form, active: !form.active })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.active ? 'bg-green-500' : 'bg-gray-700'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.active ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <span className="text-sm text-gray-400">{form.active ? 'Activo' : 'Inactivo'}</span>
          </div>
        </div>

        {plans.length > 0 && (
          <div>
            <label className={lbl}>Disciplinas y Planes *</label>
            <div className="space-y-4 mt-1">
              {groupPlansByDiscipline(plans.filter(p => p.active)).map(([discipline, disciplinePlans]) => (
                <div key={discipline}>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{discipline}</p>
                  <div className="flex flex-wrap gap-2">
                    {disciplinePlans.map((plan) => (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => {
                          const newIds = form.planIds?.includes(plan.id)
                            ? form.planIds.filter(i => i !== plan.id)
                            : [...(form.planIds || []), plan.id];
                          setForm({ ...form, planIds: newIds });
                        }}
                        className={`px-3 py-1.5 rounded-lg font-medium text-sm transition-all border ${
                          form.planIds?.includes(plan.id)
                            ? 'bg-primary-600 border-primary-500 text-white shadow-md shadow-primary-500/20'
                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'
                        }`}
                      >
                        {plan.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {errors.planIds && <p className={err}>{errors.planIds}</p>}

        <div className="flex gap-3 pt-2 border-t border-gray-800">
          <button
            type="submit"
            disabled={saving}
            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear alumno'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/students')}
            className="px-6 py-2.5 border border-gray-700 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
