import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

/**
 * Login dedicated to students (the tenant's end users), kept separate from the staff/admin
 * login at /login. The auth endpoint is the same; only the branding and the secondary links
 * differ so a student is never one click away from "Registra tu academia" (tenant creation).
 */
export default function StudentLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, loading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login({ email, password });
      const state = useAuthStore.getState();
      // Route by role: a student stays in the portal; a staff member who happens to use this
      // page is still sent to the right place rather than being stuck here.
      if (state.role === 'STUDENT') {
        navigate(state.mustChangePassword ? '/portal/cambiar-clave' : '/portal');
      } else if (state.mustChangePassword) {
        navigate('/admin/change-password');
      } else {
        navigate(state.role === 'SUPER_ADMIN' ? '/super/academies' : '/admin');
      }
    } catch {
      setError('Credenciales inválidas');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-8">
        <h1 className="text-2xl font-bold text-center mb-2">Portal del alumno</h1>
        <p className="text-gray-500 text-center text-sm mb-8">
          Accede para ver tus grados, pagos y fichas técnicas
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              placeholder="tu@correo.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Cargando...' : 'Ingresar'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400 mb-1">¿Aún no tienes cuenta?</p>
          <Link
            to="/portal/registro"
            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            Crea tu cuenta de alumno
          </Link>
        </div>

        <div className="mt-3 text-center border-t border-gray-100 pt-4">
          <Link to="/login" className="text-xs text-gray-400 hover:text-gray-600">
            ¿Eres administrador o profesor? Inicia sesión aquí
          </Link>
        </div>
      </div>
    </div>
  );
}
