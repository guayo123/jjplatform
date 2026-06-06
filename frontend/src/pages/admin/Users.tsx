import { useEffect, useState } from 'react';
import { usersApi } from '../../api/users';
import { useConfirm } from '../../components/ConfirmContext';
import { useGuidedTour } from '../../utils/useGuidedTour';
import type { AppUser, CreateUserRequest } from '../../types';
import FormInput from '../../components/FormInput';
import FormSelect from '../../components/FormSelect';

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  ADMIN:     { label: 'Admin',     color: 'bg-primary-100 text-primary-800' },
  ENCARGADO: { label: 'Encargado', color: 'bg-amber-100 text-amber-800' },
  PROFESOR:  { label: 'Profesor',  color: 'bg-gray-100 text-gray-700' },
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  ENCARGADO: 'Puede registrar pagos y activar/desactivar alumnos',
  PROFESOR:  'Solo puede visualizar información',
};

export default function Users() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState<CreateUserRequest>({
    email: '',
    role: 'ENCARGADO',
  });
  const [submitting, setSubmitting] = useState(false);
  const confirm = useConfirm();

  const load = async () => {
    setLoading(true);
    try {
      setUsers(await usersApi.list());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const startTour = useGuidedTour({
    storageKey: 'jjp_users_tour',
    welcomeTitle: '👋 Usuarios',
    welcomeBody: '<p>Aquí gestionas quién tiene acceso a tu academia. Te muestro las opciones.</p>',
    loading,
    buildSteps: () => [
      {
        element: '[data-tour="nuevo-usuario"]',
        popover: { title: '➕ Nuevo usuario', description: 'Crea un encargado con acceso al sistema. Recibirá una clave temporal por correo.', side: 'bottom', align: 'end' },
      },
      {
        element: '[data-tour="lista-usuarios"]',
        popover: { title: '👥 Usuarios con acceso', description: 'Aquí ves los usuarios y puedes activar o desactivar su acceso.', side: 'top', align: 'start' },
      },
    ],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await usersApi.create(form);
      setForm({ email: '', role: 'ENCARGADO' });
      setShowForm(false);
      setSuccess(`Usuario creado. Se envió un correo a ${form.email} con la contraseña temporal.`);
      setTimeout(() => setSuccess(null), 5000);
      load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear usuario';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (user: AppUser) => {
    const action = user.active ? 'desactivar' : 'activar';
    const ok = await confirm({
      message: `¿Deseas ${action} al usuario ${user.email}?`,
      confirmLabel: action.charAt(0).toUpperCase() + action.slice(1),
      danger: user.active,
    });
    if (!ok) return;
    try {
      await usersApi.toggleActive(user.id);
      setSuccess(`Usuario ${user.active ? 'desactivado' : 'activado'} correctamente`);
      setTimeout(() => setSuccess(null), 3000);
      load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar usuario';
      setError(msg);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestiona el acceso a tu academia</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={startTour}
            title="Ayuda"
            aria-label="Ayuda"
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 text-gray-500 hover:text-gray-700 hover:border-gray-400 text-sm font-bold transition-colors"
          >
            ?
          </button>
          <button
            data-tour="nuevo-usuario"
            onClick={() => setShowForm(!showForm)}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + Nuevo usuario
          </button>
        </div>
      </div>

      {/* Feedback */}
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

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="font-bold text-white">Crear nuevo usuario</h2>
          <p className="text-xs text-gray-400">
            Se generará una contraseña temporal y se enviará al correo del usuario.
            Al iniciar sesión por primera vez deberá cambiarla.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Email</label>
              <FormInput
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="usuario@email.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Rol</label>
              <FormSelect
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as 'ENCARGADO' })}
              >
                <option value="ENCARGADO">Encargado (pagos + alumnos)</option>
              </FormSelect>
              <p className="text-xs text-gray-500 mt-1">{ROLE_DESCRIPTIONS[form.role]}</p>
              <p className="text-xs text-amber-400 mt-1">
                Los <strong>profesores</strong> se gestionan desde la pantalla{' '}
                <span className="font-medium">Profesores</span>, donde podrás darles acceso al sistema.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white px-4 py-2.5 rounded-lg text-sm font-medium"
            >
              {submitting ? 'Creando...' : 'Crear usuario'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white px-4 py-2.5 rounded-lg text-sm transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Role info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-amber-400">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Encargado</span>
          </div>
          <p className="text-sm text-gray-600">Puede registrar pagos y activar/desactivar alumnos. No puede gestionar usuarios ni torneos.</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-gray-300">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">Profesor</span>
          </div>
          <p className="text-sm text-gray-600">Solo puede visualizar alumnos, pagos, torneos y el reporte. Sin acceso a modificaciones.</p>
        </div>
      </div>

      {/* Users table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden" data-tour="lista-usuarios">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Usuarios con acceso</h2>
        </div>
        {loading ? (
          <p className="px-6 py-8 text-gray-400 text-sm">Cargando...</p>
        ) : users.length === 0 ? (
          <p className="px-6 py-8 text-gray-400 text-sm text-center">
            No hay usuarios adicionales. Crea uno con el botón de arriba.
          </p>
        ) : (
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Creado</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => {
                const badge = ROLE_LABELS[u.role] ?? { label: u.role, color: 'bg-gray-100 text-gray-700' };
                return (
                  <tr key={u.id} className={`hover:bg-gray-50 ${!u.active ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badge.color}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        u.active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {u.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(u.createdAt).toLocaleDateString('es-CL')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleToggleActive(u)}
                        className={`text-xs font-medium ${
                          u.active
                            ? 'text-amber-600 hover:text-amber-800'
                            : 'text-green-600 hover:text-green-800'
                        }`}
                      >
                        {u.active ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
