import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { usePlatform } from '../../native/usePlatform';
import { getSavedCreds, saveCreds, clearSavedCreds, type SavedCreds } from '../../utils/secureStore';
import { getBiometry, verifyBiometric, type BiometryInfo } from '../../native/biometric';

/**
 * Login dedicated to students (the tenant's end users), kept separate from the staff/admin
 * login at /login. The auth endpoint is the same; only the branding and the secondary links
 * differ so a student is never one click away from "Registra tu academia" (tenant creation).
 *
 * Skinned with the portal's dark "Ember" dojo theme so the app opens on a branded screen
 * instead of the generic web login. Offers "Recordar mis datos" to pre-fill email + password
 * for faster sign-in; when the device has biometrics, the saved password stays behind a
 * fingerprint / Face ID prompt instead of being pre-filled in clear text.
 */
export default function StudentLogin() {
  const { isNative } = usePlatform();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(isNative);
  const [error, setError] = useState('');
  const [savedCreds, setSavedCreds] = useState<SavedCreds | null>(null);
  const [biometry, setBiometry] = useState<BiometryInfo | null>(null);
  const { login, loading } = useAuthStore();
  const navigate = useNavigate();

  // Saved credentials + a biometric gate: when biometrics are available we keep the password
  // behind the fingerprint prompt; otherwise we fall back to pre-filling it (no gate possible).
  const biometricLock = !!savedCreds && !!biometry?.available;

  useEffect(() => {
    let active = true;
    void (async () => {
      const [creds, bio] = await Promise.all([getSavedCreds(), getBiometry()]);
      if (!active) return;
      setBiometry(bio);
      if (creds) {
        setSavedCreds(creds);
        setEmail(creds.email);
        setRemember(true);
        // Only auto-fill the password when there's no biometric gate to protect it.
        if (!bio.available) setPassword(creds.password);
      }
    })();
    return () => { active = false; };
  }, []);

  /** Shared login path used by the manual form and the biometric unlock. */
  const doLogin = async (em: string, pw: string) => {
    setError('');
    try {
      await login({ email: em, password: pw });
      // Persist (or forget) credentials per the toggle, before navigating away.
      if (remember) await saveCreds({ email: em, password: pw });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await doLogin(email, password);
  };

  const handleBiometric = async () => {
    if (!savedCreds) return;
    setError('');
    const ok = await verifyBiometric('Ingresa a tu portal');
    if (!ok) {
      setError('No se pudo verificar tu identidad. Ingresa con tu contraseña.');
      return;
    }
    await doLogin(savedCreds.email, savedCreds.password);
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

          {biometricLock && (
            <div className="mb-5">
              <button
                type="button"
                onClick={handleBiometric}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 text-white font-semibold py-2.5 rounded-lg transition-opacity disabled:opacity-50"
                style={{ background: 'var(--gradient-acc)' }}
              >
                <span aria-hidden>👆</span> Ingresar con {biometry?.label}
              </button>
              <div className="flex items-center gap-3 my-4" aria-hidden>
                <span className="flex-1 h-px" style={{ background: 'var(--line)' }} />
                <span className="text-xs" style={{ color: 'var(--muted-2)' }}>o con tu contraseña</span>
                <span className="flex-1 h-px" style={{ background: 'var(--line)' }} />
              </div>
            </div>
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
