import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { studentsApi } from '../../api/students';
import { filesApi } from '../../api/files';
import { useStudentStore } from '../../stores/studentStore';
import { useToast } from '../../components/ToastContext';
import LoadingOverlay from '../../components/LoadingOverlay';
import type { StudentForm as StudentFormType } from '../../types';

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

export default function StudentForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { createStudent, updateStudent } = useStudentStore();

  const [form, setForm] = useState<StudentFormType>({
    name: '',
    rut: null,
    email: null,
    phone: null,
    joinDate: null,
    age: null,
    weight: null,
    belt: null,
    photoUrl: null,
    address: null,
    medicalNotes: null,
    active: true,
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; rut?: string; email?: string; age?: string }>({});
  const { toast } = useToast();

  const validate = () => {
    const newErrors: { name?: string; rut?: string; email?: string; age?: string } = {};
    if (!form.name.trim()) {
      newErrors.name = 'El nombre es obligatorio';
    } else if (!/^[a-zA-ZÀ-ɏ\s]+$/.test(form.name)) {
      newErrors.name = 'El nombre solo puede contener letras';
    }
    if (form.rut && !validateRut(form.rut)) {
      newErrors.rut = 'RUT inválido';
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Correo electrónico inválido';
    }
    if (form.age !== null && (form.age < 1 || form.age > 150)) {
      newErrors.age = 'La edad debe estar entre 1 y 150';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    if (id) {
      studentsApi.get(Number(id)).then((s) =>
        setForm({
          name: s.name,
          rut: s.rut,
          email: s.email,
          phone: s.phone,
          joinDate: s.joinDate,
          age: s.age,
          weight: s.weight,
          belt: s.belt,
          photoUrl: s.photoUrl,
          address: s.address,
          medicalNotes: s.medicalNotes,
          active: s.active,
        })
      );
    }
  }, [id]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await filesApi.upload(file);
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

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => {
              const val = e.target.value;
              if (/^[a-zA-ZÀ-ɏ\s]*$/.test(val)) {
                setForm({ ...form, name: val });
                setErrors((err) => ({ ...err, name: undefined }));
              }
            }}
            required
            className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none ${
              errors.name ? 'border-red-400' : 'border-gray-300'
            }`}
          />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">RUT</label>
          <input
            type="text"
            value={form.rut ?? ''}
            onChange={(e) => {
              const formatted = formatRut(e.target.value);
              setForm((f) => ({ ...f, rut: formatted || null }));
              setErrors((err) => ({ ...err, rut: undefined }));
            }}
            onBlur={() => {
              if (form.rut && !validateRut(form.rut)) {
                setErrors((err) => ({ ...err, rut: 'RUT inválido' }));
              }
            }}
            placeholder="12.345.678-9"
            maxLength={12}
            className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none ${
              errors.rut ? 'border-red-400' : 'border-gray-300'
            }`}
          />
          {errors.rut && <p className="mt-1 text-xs text-red-500">{errors.rut}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
          <input
            type="email"
            value={form.email ?? ''}
            onChange={(e) => {
              setForm((f) => ({ ...f, email: e.target.value || null }));
              setErrors((err) => ({ ...err, email: undefined }));
            }}
            onBlur={() => {
              if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
                setErrors((err) => ({ ...err, email: 'Correo electrónico inválido' }));
              }
            }}
            placeholder="nombre@ejemplo.com"
            className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none ${
              errors.email ? 'border-red-400' : 'border-gray-300'
            }`}
          />
          {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono / WhatsApp</label>
          <div className="flex">
            <span className="inline-flex items-center px-3 text-sm text-gray-600 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg font-medium select-none">
              +56
            </span>
            <input
              type="tel"
              value={form.phone?.replace(/^\+?56/, '') ?? ''}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
                setForm((f) => ({ ...f, phone: digits ? `+56${digits}` : null }));
              }}
              placeholder="9 1234 5678"
              maxLength={9}
              className="flex-1 min-w-0 border border-gray-300 rounded-r-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>
          <p className="mt-1 text-xs text-gray-400">Se usará para enviar recordatorios de pago por WhatsApp</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de ingreso</label>
          <input
            type="date"
            value={form.joinDate ?? ''}
            max={new Date().toISOString().split('T')[0]}
            onChange={(e) => setForm((f) => ({ ...f, joinDate: e.target.value || null }))}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Edad</label>
          <input
            type="number"
            value={form.age ?? ''}
            onChange={(e) => {
              const val = e.target.value ? Number(e.target.value) : null;
              setForm({ ...form, age: val });
              if (val !== null && (val < 1 || val > 150)) {
                setErrors((err) => ({ ...err, age: 'La edad debe estar entre 1 y 150' }));
              } else {
                setErrors((err) => ({ ...err, age: undefined }));
              }
            }}
            min={1}
            max={150}
            className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none ${
              errors.age ? 'border-red-400' : 'border-gray-300'
            }`}
          />
          {errors.age && <p className="mt-1 text-xs text-red-500">{errors.age}</p>}
        </div>

        <div className={isEdit ? '' : 'grid grid-cols-2 gap-4'}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Peso (kg)</label>
            <input
              type="number"
              value={form.weight ?? ''}
              onChange={(e) => setForm({ ...form, weight: e.target.value ? Number(e.target.value) : null })}
              min={1}
              max={300}
              step={0.1}
              placeholder="ej: 72.5"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            />
          </div>
          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cinturón inicial</label>
              <select
                value={form.belt ?? ''}
                onChange={(e) => setForm({ ...form, belt: e.target.value || null })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-white"
              >
                <option value="">Sin cinturón</option>
                <optgroup label="Juveniles (≤ 15 años)">
                  <option value="Blanco">Blanco</option>
                  <option value="Gris">Gris</option>
                  <option value="Amarillo">Amarillo</option>
                  <option value="Naranja">Naranja</option>
                  <option value="Verde">Verde</option>
                </optgroup>
                <optgroup label="Adultos (16+ años)">
                  <option value="Blanco">Blanco</option>
                  <option value="Azul">Azul</option>
                  <option value="Morado">Morado</option>
                  <option value="Café">Café</option>
                  <option value="Negro">Negro</option>
                </optgroup>
              </select>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Foto</label>
          <input type="file" accept="image/*" onChange={handlePhotoUpload} className="text-sm" />
          {uploading && <p className="text-sm text-gray-500 mt-1">Subiendo...</p>}
          {form.photoUrl && (
            <img src={form.photoUrl} alt="preview" className="mt-2 w-24 h-24 rounded-lg object-cover" />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
          <input
            type="text"
            value={form.address ?? ''}
            onChange={(e) => setForm({ ...form, address: e.target.value || null })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Enfermedades de base / Notas médicas</label>
          <textarea
            value={form.medicalNotes ?? ''}
            onChange={(e) => setForm({ ...form, medicalNotes: e.target.value || null })}
            rows={3}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
          <button
            type="button"
            onClick={() => setForm({ ...form, active: !form.active })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              form.active ? 'bg-green-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                form.active ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className="ml-3 text-sm text-gray-600">{form.active ? 'Activo' : 'Inactivo'}</span>
        </div>

        <div className="flex gap-3 pt-2">
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
            className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
