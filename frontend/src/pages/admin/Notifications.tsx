import { useState } from 'react';
import { notificationsApi } from '../../api/notifications';
import { useAuthStore } from '../../stores/authStore';

/** Admin maintainer: send a push notification to the academy's students (or all, for super admin). */
export default function Notifications() {
  const { role, academyName } = useAuthStore();
  const isSuper = role === 'SUPER_ADMIN';
  const scope: 'ACADEMY' | 'ALL' = isSuper ? 'ALL' : 'ACADEMY';
  const target = isSuper ? 'todos los alumnos de la plataforma' : `los alumnos de ${academyName ?? 'tu academia'}`;

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!title.trim() || !message.trim()) {
      setError('Completa el título y el mensaje.');
      return;
    }
    if (!window.confirm(`Se enviará la notificación a ${target}. ¿Confirmar?`)) return;
    setSending(true);
    try {
      const { sent } = await notificationsApi.broadcast(title.trim(), message.trim(), scope);
      setResult(sent > 0
        ? `✓ Notificación enviada a ${sent} dispositivo${sent === 1 ? '' : 's'}.`
        : 'No hay dispositivos registrados para recibirla todavía.');
      setTitle('');
      setMessage('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar la notificación.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Enviar notificación</h1>
      <p className="text-sm text-gray-500 mb-6">Llega como notificación push a la app de {target}.</p>

      <form onSubmit={submit} className="bg-white rounded-xl shadow-sm p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 80))}
            placeholder="Ej. ¡Torneo este sábado! 🥋"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{title.length}/80</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 240))}
            rows={4}
            placeholder="Escribe el mensaje que recibirán los alumnos…"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{message.length}/240</p>
        </div>

        <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-sm text-gray-600">
          📣 Destinatarios: <strong>{target}</strong>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {result && <p className="text-sm text-green-600">{result}</p>}

        <button
          type="submit"
          disabled={sending}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50"
        >
          {sending ? 'Enviando…' : 'Enviar notificación'}
        </button>
      </form>
    </div>
  );
}
