import { useEffect, useState } from 'react';
import { academiesApi } from '../../api/academies';
import { useToast } from '../../components/ToastContext';
import type { AcademySettings } from '../../types';

export default function Settings() {
  const [form, setForm] = useState<AcademySettings | null>(null);
  const [original, setOriginal] = useState<AcademySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const hasChanges = form && original ? JSON.stringify(form) !== JSON.stringify(original) : false;

  useEffect(() => {
    academiesApi.getSettings().then((data) => { setForm(data); setOriginal(data); }).finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await academiesApi.updateSettings(form);
      setForm(updated);
      setOriginal(updated);
      setSuccess('Datos actualizados correctamente');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !form) return;
    setUploadingLogo(true);
    try {
      const { url } = await academiesApi.uploadLogo(file);
      setForm((f) => f ? { ...f, logoUrl: url } : f);
      toast.success('Logo actualizado correctamente');
    } catch {
      toast.error('Error al subir el logo');
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  if (!form) return <p className="text-gray-500 py-8">No se pudo cargar la configuración.</p>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Configuración de la Academia</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Estos datos se muestran en tu perfil público.
        </p>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-5">
        {/* Logo de la academia */}
        <h2 className="font-semibold text-gray-800 border-b border-gray-100 pb-2">
          Logo de la academia
        </h2>
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 bg-gray-100 border border-gray-200 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
            {form.logoUrl ? (
              <img src={form.logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-black text-gray-400">{form.name.charAt(0)}</span>
            )}
          </div>
          <div>
            <label className="cursor-pointer inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              {uploadingLogo ? 'Subiendo...' : form.logoUrl ? 'Cambiar logo' : 'Subir logo'}
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={uploadingLogo}
                className="hidden"
              />
            </label>
            <p className="text-xs text-gray-400 mt-1.5">JPG, PNG o WebP. Se muestra en tu perfil público.</p>
          </div>
        </div>

        {/* Información básica */}
        <h2 className="font-semibold text-gray-800 border-b border-gray-100 pb-2">
          Información básica
        </h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la academia</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
            placeholder="Describe tu academia, estilos de enseñanza, etc."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Calle, número, ciudad"
            />
          </div>
        </div>

        {/* Redes sociales */}
        <h2 className="font-semibold text-gray-800 border-b border-gray-100 pb-2 pt-2">
          Redes sociales y contacto
        </h2>
        <p className="text-xs text-gray-400 -mt-3">
          Estos datos aparecerán como botones de contacto en tu perfil público.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 text-sm text-gray-600 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg font-medium select-none">
                +56
              </span>
              <input
                value={form.whatsapp?.replace(/^\+?56/, '') || ''}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
                  setForm({ ...form, whatsapp: digits ? `+56${digits}` : '' });
                }}
                className="flex-1 min-w-0 border border-gray-300 rounded-r-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="9 1234 5678"
                maxLength={9}
                inputMode="numeric"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Ingresa tu número comenzando con 9 (ej: 9 1234 5678)</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <svg className="w-4 h-4 text-pink-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
              </svg>
              Instagram
            </label>
            <input
              value={form.instagram}
              onChange={(e) => setForm({ ...form, instagram: e.target.value.trim() })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="@tu_academia"
            />
            <p className="text-xs text-gray-400 mt-1">Usuario de Instagram (con o sin @)</p>
          </div>
        </div>

        {/* Preview / Tips */}
        {(form.whatsapp || form.instagram) && (
          <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
            <p className="text-xs font-medium text-gray-500 mb-2">Vista previa de botones en tu perfil:</p>
            <div className="flex gap-2">
              {form.whatsapp && (
                <span className="inline-flex items-center gap-1.5 bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WhatsApp
                </span>
              )}
              {form.instagram && (
                <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                  </svg>
                  Instagram
                </span>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving || !hasChanges}
            className="bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}
