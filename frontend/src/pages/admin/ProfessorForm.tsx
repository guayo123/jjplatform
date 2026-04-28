import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { professorsApi } from '../../api/professors';
import { filesApi } from '../../api/files';
import { useToast } from '../../components/ToastContext';
import LoadingOverlay from '../../components/LoadingOverlay';
import type { ProfessorForm as ProfessorFormType } from '../../types';

const BELTS = ['Blanco', 'Gris', 'Amarillo', 'Naranja', 'Verde', 'Azul', 'Morado', 'Café', 'Negro'];

export default function ProfessorForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState<ProfessorFormType>({
    name: '',
    photoUrl: null,
    bio: null,
    achievements: null,
    belt: null,
    displayOrder: 0,
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (id) {
      professorsApi.get(Number(id)).then((p) =>
        setForm({
          name: p.name,
          photoUrl: p.photoUrl,
          bio: p.bio,
          achievements: p.achievements,
          belt: p.belt,
          displayOrder: p.displayOrder ?? 0,
        })
      );
    }
  }, [id]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
    if (!form.name.trim()) {
      setNameError('El nombre es obligatorio');
      return;
    }
    setSaving(true);
    try {
      const [result] = await Promise.allSettled([
        isEdit && id
          ? professorsApi.update(Number(id), form)
          : professorsApi.create(form),
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

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-5">

        {/* Nombre */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => {
              setForm({ ...form, name: e.target.value });
              setNameError('');
            }}
            required
            className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none ${
              nameError ? 'border-red-400' : 'border-gray-300'
            }`}
            placeholder="Nombre completo del profesor"
          />
          {nameError && <p className="mt-1 text-xs text-red-500">{nameError}</p>}
        </div>

        {/* Foto */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Foto</label>
          <input type="file" accept="image/*" onChange={handlePhotoUpload} className="text-sm" />
          {uploading && <p className="text-sm text-gray-500 mt-1">Subiendo...</p>}
          {form.photoUrl && (
            <div className="mt-2 flex items-center gap-3">
              <img src={form.photoUrl} alt="preview" className="w-20 h-20 rounded-xl object-cover" />
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, photoUrl: null }))}
                className="text-xs text-red-500 hover:text-red-600"
              >
                Quitar foto
              </button>
            </div>
          )}
        </div>

        {/* Cinturón */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cinturón / Rango</label>
          <select
            value={form.belt ?? ''}
            onChange={(e) => setForm({ ...form, belt: e.target.value || null })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-white"
          >
            <option value="">Sin especificar</option>
            {BELTS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        {/* Biografía */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Biografía</label>
          <textarea
            value={form.bio ?? ''}
            onChange={(e) => setForm({ ...form, bio: e.target.value || null })}
            rows={4}
            placeholder="Describe la trayectoria y experiencia del profesor..."
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none"
          />
        </div>

        {/* Logros */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Logros y títulos
            <span className="text-gray-400 font-normal ml-1">(uno por línea)</span>
          </label>
          <textarea
            value={form.achievements ?? ''}
            onChange={(e) => setForm({ ...form, achievements: e.target.value || null })}
            rows={4}
            placeholder={"Campeón Mundial IBJJF 2022\nCinturón negro bajo Prof. X\nMedalla de oro Panamericanos 2021"}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none"
          />
        </div>

        {/* Orden */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Orden de visualización</label>
          <input
            type="number"
            min={0}
            value={form.displayOrder}
            onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })}
            className="w-32 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          />
          <p className="mt-1 text-xs text-gray-400">Número menor = aparece primero en el perfil público</p>
        </div>

        <div className="flex gap-3 pt-2">
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
            className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
