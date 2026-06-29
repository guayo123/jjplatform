/**
 * Public account-deletion instructions, served at /eliminar-cuenta
 * (e.g. https://jjplatform.vercel.app/eliminar-cuenta). Required by Google Play: apps that let users
 * create an account must provide a public URL with clear steps to request account + data deletion,
 * stating what is deleted vs retained and for how long. Self-contained, no auth.
 *
 * IMPORTANT: CONTACT_EMAIL must be a real, monitored address (same as the privacy policy).
 */

const CONTACT_EMAIL = 'drivaspalma@gmail.com'; // correo que recibe las solicitudes de eliminación
const LAST_UPDATED = '28 de junio de 2026';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-7">
      <h2 className="text-lg font-bold text-gray-900 mb-2">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-gray-700">{children}</div>
    </section>
  );
}

export default function DeleteAccount() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm p-6 sm:p-10">
        <h1 className="text-2xl font-extrabold text-gray-900">Eliminar tu cuenta de JJPlatform</h1>
        <p className="text-xs text-gray-400 mt-1 mb-8">Última actualización: {LAST_UPDATED}</p>

        <Section title="Sobre esta página">
          <p>
            JJPlatform es la aplicación de gestión para academias de artes marciales (portal del alumno).
            Aquí explicamos cómo solicitar la eliminación de tu cuenta y de los datos personales asociados.
          </p>
        </Section>

        <Section title="Cómo solicitar la eliminación">
          <p>Tienes dos formas:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Escríbenos a{' '}
              <a href={`mailto:${CONTACT_EMAIL}?subject=Eliminar%20mi%20cuenta%20JJPlatform`} className="text-orange-600 font-semibold">{CONTACT_EMAIL}</a>{' '}
              <strong>desde el correo asociado a tu cuenta</strong>, indicando tu <strong>nombre</strong> y la{' '}
              <strong>academia</strong> a la que perteneces, con el asunto "Eliminar mi cuenta".
            </li>
            <li>O contacta directamente a tu academia, que puede tramitar la baja por ti.</li>
          </ul>
          <p>
            Verificaremos que la solicitud venga del titular de la cuenta y la procesaremos dentro de un plazo
            máximo de <strong>30 días</strong>.
          </p>
        </Section>

        <Section title="Qué datos se eliminan">
          <p>Al eliminar tu cuenta borramos los datos personales que tratamos de ti, incluyendo:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Identificación:</strong> nombre, RUT, correo, teléfono, fecha de nacimiento y foto de perfil.</li>
            <li><strong>Cuenta y acceso:</strong> usuario y contraseña.</li>
            <li><strong>Actividad:</strong> entrenamientos, sesiones, peso, cinturón y grados, técnicas, retos/duelos, resultados y rachas.</li>
            <li><strong>Datos técnicos:</strong> el identificador del dispositivo para notificaciones (token de mensajería).</li>
          </ul>
        </Section>

        <Section title="Qué datos podemos conservar (y por cuánto)">
          <p>
            Solo conservamos lo que la ley nos obliga a mantener, principalmente los{' '}
            <strong>registros de pago/mensualidades</strong> con fines contables y tributarios, durante el
            período exigido por la normativa aplicable. Pasado ese plazo, también se eliminan. No conservamos
            estos datos para ningún otro uso.
          </p>
        </Section>

        <Section title="Más información">
          <p>
            Para más detalle sobre cómo tratamos tus datos, revisa nuestra{' '}
            <a href="/privacidad" className="text-orange-600 font-semibold">Política de Privacidad</a>. Si tienes
            dudas, escríbenos a{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-orange-600 font-semibold">{CONTACT_EMAIL}</a>.
          </p>
        </Section>

        <p className="text-xs text-gray-400 border-t border-gray-100 pt-5 mt-8">
          JJPlatform · Portal del alumno y gestión de academias.
        </p>
      </div>
    </div>
  );
}
