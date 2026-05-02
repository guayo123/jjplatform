import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { professorsApi } from '../../api/professors';
import { filesApi } from '../../api/files';
import { useToast } from '../../components/ToastContext';
import LoadingOverlay from '../../components/LoadingOverlay';
import FormInput from '../../components/FormInput';
import FormSelect from '../../components/FormSelect';
import FormTextarea from '../../components/FormTextarea';
import ImageUpload from '../../components/ImageUpload';
import type { ProfessorForm as ProfessorFormType } from '../../types';

const BELT_GROUPS: { label: string; options: string[] }[] = [
  { label: 'BJJ / Jiu-Jitsu', options: ['Blanco', 'Azul', 'Morado', 'Café', 'Negro'] },
  { label: 'Capoeira (cordas)', options: ['Corda Cru', 'Corda Amarela', 'Corda Laranja', 'Corda Verde', 'Corda Azul', 'Corda Roxo', 'Corda Café', 'Corda Preto'] },
  { label: 'Kickboxing / Muay Thai', options: ['Nivel Principiante', 'Nivel Amateur', 'Nivel Semiprofesional', 'Nivel Profesional'] },
  { label: 'Judo / Karate', options: ['Blanco', 'Amarillo', 'Naranja', 'Verde', 'Azul', 'Marrón', 'Negro'] },
];

const lbl = 'block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5';
const hint = 'mt-1 text-xs text-gray-500';
const err = 'mt-1 text-xs text-red-400';

export default function ProfessorForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState<ProfessorFormType>({
    name: '', photoUrl: null, bio: null, achievements: null, belt: null, displayOrder: 0,
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (id) {
      professorsApi.get(Number(id)).then((p) =>
        setForm({ name: p.name, photoUrl: p.photoUrl, bio: p.bio, achievements: p.achievements, belt: p.belt, displayOrder: p.displayOrder ?? 0 })
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
    if (!form.name.trim()) { setNameError('El nombre es obligatorio'); return; }
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
              <label className={lbl}>Cinturón / Rango</label>
              <FormSelect
                value={form.belt ?? ''}
                onChange={(e) => setForm({ ...form, belt: e.target.value || null })}
              >
                <option value="">Sin especificar</option>
                {BELT_GROUPS.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.options.map((b) => (
                      <option key={`${group.label}-${b}`} value={b}>{b}</option>
                    ))}
                  </optgroup>
                ))}
              </FormSelect>
            </div>
          </div>
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
