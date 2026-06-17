import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { usePlatform } from '../../native/usePlatform';
import { getSavedCreds, saveCreds, clearSavedCreds } from '../../utils/secureStore';

/**
 * Login dedicated to students (the tenant's end users), kept separate from the staff/admin
 * login at /login. The auth endpoint is the same; only the branding and the secondary links
 * differ so a student is never one click away from "Registra tu academia" (tenant creation).
 *
 * Skinned with the portal's dark "Ember" dojo theme so the app opens on a branded screen
 * instead of the generic web login. Offers "Recordar mis datos" to pre-fill email + password
 * for faster sign-in on a personal device.
 */
export default function StudentLogin() {
  const { isNative } = usePlatform();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(isNative);
  const [error, setError] = useState('');
  const { login, loading } = useAuthStore();
  const navigate = useNavigate();

  // Pre-fill from saved credentials. If any were stored, the user clearly wanted to be
  // remembered, so default the toggle on regardless of platform.
  useEffect(() => {
    let active = true;
    void getSavedCreds().then((creds) => {
      if (active && creds) {
        setEmail(creds.email);
        setPassword(creds.password);
        setRemember(true);
      }
    });
    return () => { active = false; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login({ email, password });
      // Persist (or forget) credentials per the toggle, before navigating away.
      if (remember) await saveCreds({ email, password });
      else await clearSavedCreds();
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
    <div className="portal-theme min-h-screen flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full">
        {/* Brand mark */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg mb-4"
            style={{ background: 'var(--gradient-acc)' }}
          >
            🥋
          </div>
          <h1 className="jjp-display text-3xl font-extrabold tracking-tight text-center">
            Portal del alumno
          </h1>
          <p className="text-sm mt-1 text-center" style={{ color: 'var(--muted)' }}>
            Tus grados, pagos, entrenos y fichas técnicas
          </p>
        </div>

        <div
          className="rounded-2xl p-7 shadow-lg"
          style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
        >
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                placeholder="tu@correo.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="current-password"
                className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                placeholder="••••••••"
              />
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer select-none" style={{ color: 'var(--muted)' }}>
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 rounded accent-primary-600"
              />
              Recordar mis datos en este dispositivo
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white font-semibold py-2.5 rounded-lg transition-opacity disabled:opacity-50"
              style={{ background: 'var(--gradient-acc)' }}
            >
              {loading ? 'Cargando...' : 'Ingresar'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link to="/portal/recuperar" className="text-sm" style={{ color: 'var(--muted)' }}>
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs mb-1" style={{ color: 'var(--muted-2)' }}>¿Aún no tienes cuenta?</p>
            <Link
              to="/portal/registro"
              className="text-primary-600 hover:text-primary-700 text-sm font-semibold"
            >
              Crea tu cuenta de alumno
            </Link>
          </div>
        </div>

        <div className="mt-4 text-center">
          <Link to="/login" className="text-xs" style={{ color: 'var(--muted-2)' }}>
            ¿Eres administrador o profesor? Inicia sesión aquí
          </Link>
        </div>
      </div>
    </div>
  );
}
