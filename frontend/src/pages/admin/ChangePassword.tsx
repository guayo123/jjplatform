import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../stores/authStore';

export default function ChangePassword() {
  const navigate = useNavigate();
  const { mustChangePassword, role, markPasswordChanged, logout } = useAuthStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirm) {
      setError('La confirmación no coincide.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('La nueva contraseña debe ser distinta a la actual.');
      return;
    }
    setSubmitting(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      markPasswordChanged();
      const dest = role === 'STUDENT'
        ? '/portal'
        : role === 'SUPER_ADMIN'
          ? '/super/academies'
          : '/admin';
      navigate(dest, { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo cambiar la contraseña.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-md p-8">
        <h1 className="text-2xl font-bold mb-2">
          {mustChangePassword ? 'Cambia tu contraseña' : 'Cambiar contraseña'}
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          {mustChangePassword
            ? 'Tu cuenta fue creada con una contraseña temporal. Por seguridad, define una nueva antes de continuar.'
            : 'Define una nueva contraseña para tu cuenta.'}
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña actual (temporal)
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoFocus
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              placeholder="Mínimo 8 caracteres"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmar nueva contraseña
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {submitting ? 'Guardando...' : 'Cambiar contraseña'}
          </button>
        </form>

        {mustChangePassword && (
          <button
            onClick={() => { const dest = role === 'STUDENT' ? '/portal/login' : '/login'; logout(); navigate(dest); }}
            className="mt-4 w-full text-sm text-gray-500 hover:text-gray-700"
          >
            Cerrar sesión
          </button>
        )}
      </div>
    </div>
  );
}
