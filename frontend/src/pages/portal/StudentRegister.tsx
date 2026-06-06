import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { cleanRut, formatRut } from '../../utils/rut';

export default function StudentRegister() {
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
      await authApi.studentRegister({ rut: cleanRut(rut), email: email.trim() });
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la cuenta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-8">
        {done ? (
          <div className="text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-green-100 text-green-600 flex items-center justify-center text-3xl">
              ✓
            </div>
            <h1 className="text-2xl font-bold">¡Listo!</h1>
            <p className="text-gray-600 text-sm">
              Te enviamos un correo a <strong>{email}</strong> con una contraseña temporal. Inicia
              sesión con ella y luego cámbiala por una propia.
            </p>
            <Link
              to="/login"
              className="inline-block w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 rounded-lg transition-colors"
            >
              Ir a iniciar sesión
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-center mb-2">Crear cuenta de alumno</h1>
            <p className="text-gray-500 text-center text-sm mb-8">
              Ingresa el RUT y correo con los que estás registrado en tu academia. Te enviaremos una
              contraseña temporal.
            </p>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">RUT</label>
                <input
                  type="text"
                  value={rut}
                  onChange={(e) => setRut(formatRut(e.target.value))}
                  required
                  maxLength={12}
                  inputMode="text"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  placeholder="12.345.678-9"
                />
              </div>

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

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Enviando...' : 'Crear cuenta'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link to="/login" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                ¿Ya tienes cuenta? Inicia sesión
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
