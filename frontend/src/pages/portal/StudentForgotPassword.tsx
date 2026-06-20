import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { cleanRut, formatRut } from '../../utils/rut';

/**
 * "¿Olvidaste tu contraseña?" for students. Verifies RUT + email (the same trust boundary as
 * registration) and triggers a temporary-password email. Requiring both means a leaked email
 * alone can't reset someone's password. Skinned with the portal's dark "Ember" theme.
 */
export default function StudentForgotPassword() {
  const [rut, setRut] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Display is formatted (12.345.678-9); the API receives it clean (digits + verifier only).
      await authApi.forgotPassword({ rut: cleanRut(rut), email: email.trim() });
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo procesar la solicitud. Intenta de nuevo más tarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-theme min-h-screen flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full">
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg mb-4"
            style={{ background: 'var(--gradient-acc)' }}
          >
            🔑
          </div>
          <h1 className="jjp-display text-3xl font-extrabold tracking-tight text-center">
            Recuperar acceso
          </h1>
          <p className="text-sm mt-1 text-center" style={{ color: 'var(--muted)' }}>
            Te enviamos una contraseña temporal a tu correo
          </p>
        </div>

        <div
          className="rounded-2xl p-7 shadow-lg"
          style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
        >
          {done ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-green-100 text-green-600 flex items-center justify-center text-3xl">
                ✓
              </div>
              <p className="text-sm" style={{ color: 'var(--text)' }}>
                Te enviamos una contraseña temporal a <strong>{email}</strong>. Revisa tu correo
                (y la carpeta de spam) e inicia sesión con ella.
              </p>
              <Link
                to="/portal/login"
                className="inline-block w-full text-white font-semibold py-2.5 rounded-lg"
                style={{ background: 'var(--gradient-acc)' }}
              >
                Ir a iniciar sesión
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
                    RUT
                  </label>
                  <input
                    type="text"
                    value={rut}
                    onChange={(e) => setRut(formatRut(e.target.value))}
                    required
                    maxLength={12}
                    inputMode="text"
                    className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    placeholder="12.345.678-9"
                  />
                </div>

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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full text-white font-semibold py-2.5 rounded-lg transition-opacity disabled:opacity-50"
                  style={{ background: 'var(--gradient-acc)' }}
                >
                  {loading ? 'Enviando...' : 'Enviar contraseña temporal'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link to="/portal/login" className="text-primary-600 hover:text-primary-700 text-sm font-semibold">
                  Volver a iniciar sesión
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
