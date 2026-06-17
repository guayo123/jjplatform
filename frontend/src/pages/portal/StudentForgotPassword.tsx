import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../../api/auth';

/**
 * "¿Olvidaste tu contraseña?" for students. Asks only for the email and triggers a
 * temporary-password email (reusing the same temp-password mechanism as registration).
 *
 * For privacy the success message is deliberately the same whether or not the email is
 * registered — the backend never reveals which addresses exist (account enumeration).
 * Skinned with the portal's dark "Ember" theme to match StudentLogin.
 */
export default function StudentForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.forgotPassword({ email: email.trim() });
      setDone(true);
    } catch {
      setError('No se pudo procesar la solicitud. Intenta de nuevo más tarde.');
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
                Si <strong>{email}</strong> corresponde a una cuenta, te enviamos una contraseña
                temporal. Revisa tu correo (y la carpeta de spam) e inicia sesión con ella.
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
