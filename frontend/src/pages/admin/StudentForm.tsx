import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { studentsApi } from '../../api/students';
import { filesApi } from '../../api/files';
import { useStudentStore } from '../../stores/studentStore';
import { useToast } from '../../components/ToastContext';
import LoadingOverlay from '../../components/LoadingOverlay';
import type { StudentForm as StudentFormType } from '../../types';

export default function StudentForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { createStudent, updateStudent } = useStudentStore();

  const [form, setForm] = useState<StudentFormType>({
    name: '',
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
  const [errors, setErrors] = useState<{ name?: string; age?: string }>({});
  const { toast } = useToast();

  const validate = () => {
    const newErrors: { name?: string; age?: string } = {};
    if (!form.name.trim()) {
      newErrors.name = 'El nombre es obligatorio';
    } else if (!/^[a-zA-Z\u00C0-\u024F\s]+$/.test(form.name)) {
      newErrors.name = 'El nombre solo puede contener letras';
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
              if (/^[a-zA-Z\u00C0-\u024F\s]*$/.test(val)) {
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

        <div className="grid grid-cols-2 gap-4">
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cinturón</label>
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
