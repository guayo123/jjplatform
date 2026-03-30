import { useEffect, useState } from 'react';
import { superApi } from '../../api/super';
import type { AcademySummary } from '../../types';

const initialForm = {
  email: '',
  password: '',
  academyName: '',
  description: '',
  address: '',
  phone: '',
};

export default function Academies() {
  const [academies, setAcademies] = useState<AcademySummary[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await superApi.listAcademies();
      setAcademies(data);
    } catch {
      setError('No se pudieron cargar las academias.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await superApi.createAcademy({
        email: form.email,
        password: form.password,
        academyName: form.academyName,
        description: form.description || undefined,
        address: form.address || undefined,
        phone: form.phone || undefined,
      });
      setForm(initialForm);
      await load();
    } catch {
      setError('No se pudo crear la academia. Verifica el email y los datos.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (academy: AcademySummary) => {
    const action = academy.active ? 'desactivar' : 'activar';
    const ok = window.confirm(`¿${action.charAt(0).toUpperCase() + action.slice(1)} ${academy.name}?`);
    if (!ok) return;

    setError(null);
    try {
      const updated = await superApi.toggleAcademyActive(academy.id);
      setAcademies((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    } catch {
      setError(`No se pudo ${action} la academia.`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Academias</h1>
        <p className="text-sm text-gray-600">
          Administra academias y usuarios administradores del sistema.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <section className="bg-white border rounded-lg p-4 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Crear academia</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            className="border rounded px-3 py-2"
            placeholder="Email administrador"
            type="email"
            required
            value={form.email}
            onChange={(e) => handleChange('email', e.target.value)}
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="Password"
            type="password"
            required
            value={form.password}
            onChange={(e) => handleChange('password', e.target.value)}
          />
          <input
            className="border rounded px-3 py-2 md:col-span-2"
            placeholder="Nombre de academia"
            required
            value={form.academyName}
            onChange={(e) => handleChange('academyName', e.target.value)}
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="Direccion"
            value={form.address}
            onChange={(e) => handleChange('address', e.target.value)}
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="Telefono"
            value={form.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
          />
          <textarea
            className="border rounded px-3 py-2 md:col-span-2"
            placeholder="Descripcion"
            rows={3}
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
          />
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-primary-700 text-white px-4 py-2 rounded hover:bg-primary-800 disabled:opacity-60"
            >
              {saving ? 'Creando...' : 'Crear academia'}
            </button>
          </div>
        </form>
      </section>

      <section className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h2 className="text-lg font-semibold">Listado</h2>
        </div>
        {loading ? (
          <div className="p-4 text-sm text-gray-600">Cargando academias...</div>
        ) : academies.length === 0 ? (
          <div className="p-4 text-sm text-gray-600">No hay academias registradas.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-2 text-left">Academia</th>
                  <th className="px-4 py-2 text-left">Admin</th>
                  <th className="px-4 py-2 text-left">Alumnos</th>
                  <th className="px-4 py-2 text-left">Estado</th>
                  <th className="px-4 py-2 text-left">Creada</th>
                  <th className="px-4 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {academies.map((academy) => (
                  <tr key={academy.id} className={`border-t ${!academy.active ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{academy.name}</div>
                      <div className="text-xs text-gray-500">{academy.address || 'Sin direccion'}</div>
                    </td>
                    <td className="px-4 py-3">{academy.adminEmail}</td>
                    <td className="px-4 py-3">{academy.studentCount}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${academy.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {academy.active ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {new Date(academy.createdAt).toLocaleDateString('es-CL')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleToggleActive(academy)}
                        className={academy.active ? 'text-amber-600 hover:text-amber-800' : 'text-green-600 hover:text-green-800'}
                      >
                        {academy.active ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
