/**
 * Public privacy policy, served at /privacidad (e.g. https://jjplatform.vercel.app/privacidad).
 * Required by Google Play for any app that handles personal data. Self-contained, no auth.
 *
 * IMPORTANT: replace CONTACT_EMAIL with a real, monitored address before publishing — Google Play
 * (and data-protection law) require a working contact for data access/deletion requests.
 */

const CONTACT_EMAIL = 'drivaspalma@gmail.com'; // correo de contacto para solicitudes de datos/eliminación
const LAST_UPDATED = '23 de junio de 2026';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-7">
      <h2 className="text-lg font-bold text-gray-900 mb-2">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-gray-700">{children}</div>
    </section>
  );
}

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm p-6 sm:p-10">
        <h1 className="text-2xl font-extrabold text-gray-900">Política de Privacidad</h1>
        <p className="text-xs text-gray-400 mt-1 mb-8">Última actualización: {LAST_UPDATED}</p>

        <Section title="1. Quiénes somos">
          <p>
            JJPlatform es una plataforma de gestión para academias de artes marciales (jiu-jitsu,
            MMA y disciplinas afines). A través de la aplicación, las academias administran a sus
            alumnos y los alumnos acceden a su portal personal (entrenamientos, pagos, retos,
            técnicas y más). Esta política explica qué datos tratamos y cómo los protegemos.
          </p>
          <p>
            La academia a la que perteneces actúa como responsable de tus datos, y JJPlatform como
            proveedor que los trata por su encargo para prestar el servicio.
          </p>
        </Section>

        <Section title="2. Qué datos recolectamos">
          <p>Según tu rol (alumno o personal de la academia), podemos tratar:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Datos de identificación:</strong> nombre, RUT, correo electrónico, teléfono, fecha de nacimiento y foto de perfil.</li>
            <li><strong>Datos de cuenta:</strong> correo y contraseña (almacenada de forma cifrada). La autenticación biométrica, cuando la activas, se procesa en tu dispositivo y no se envía a nuestros servidores.</li>
            <li><strong>Datos de actividad:</strong> entrenamientos, sesiones, peso corporal, cinturón y grados, técnicas aprendidas, retos/duelos, resultados de torneos, reservas de clases y rachas.</li>
            <li><strong>Datos de pago:</strong> registros de mensualidades y estado de pago. Los pagos en línea se procesan a través de pasarelas externas (ver sección 5); no almacenamos los datos completos de tu tarjeta.</li>
            <li><strong>Datos técnicos:</strong> identificador de dispositivo para notificaciones (token de mensajería), plataforma y datos básicos de uso necesarios para el funcionamiento.</li>
          </ul>
        </Section>

        <Section title="3. Para qué usamos tus datos">
          <ul className="list-disc pl-5 space-y-1">
            <li>Crear y gestionar tu cuenta y tu perfil en la academia.</li>
            <li>Mostrar tu progreso de entrenamiento, técnicas, retos y estadísticas.</li>
            <li>Gestionar pagos, mensualidades y recordatorios.</li>
            <li>Enviar notificaciones de la academia (retos, clases, avisos) y recordatorios.</li>
            <li>Ofrecer el asistente de la academia, que puede usar proveedores de inteligencia artificial para responder consultas (ver sección 5).</li>
            <li>Mantener la seguridad, prevenir fraudes y cumplir obligaciones legales.</li>
          </ul>
        </Section>

        <Section title="4. Base para el tratamiento">
          <p>
            Tratamos tus datos sobre la base de la prestación del servicio que solicitas, tu
            consentimiento (por ejemplo, para notificaciones) y el interés legítimo de la academia
            en gestionar su alumnado. Puedes retirar tu consentimiento en cualquier momento.
          </p>
        </Section>

        <Section title="5. Proveedores y terceros">
          <p>Compartimos datos solo con proveedores que nos ayudan a operar el servicio, y únicamente lo necesario:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Google Firebase (Cloud Messaging):</strong> envío de notificaciones push.</li>
            <li><strong>Khipu y Mercado Pago:</strong> procesamiento de pagos en línea.</li>
            <li><strong>WhatsApp / Meta:</strong> envío de recordatorios y avisos, cuando la academia lo habilita.</li>
            <li><strong>Brevo:</strong> envío de correos transaccionales (invitaciones, recuperación de clave).</li>
            <li><strong>Proveedores de IA (p. ej. Anthropic, Google, Groq):</strong> procesamiento de las consultas del asistente de la academia.</li>
            <li><strong>Railway y Vercel:</strong> alojamiento de la aplicación y la base de datos.</li>
          </ul>
          <p>No vendemos tus datos personales a terceros.</p>
        </Section>

        <Section title="6. Menores de edad">
          <p>
            Las academias pueden inscribir a alumnos menores de edad. En ese caso, los datos del
            menor son aportados y gestionados por la academia y/o su padre, madre o tutor, quienes
            autorizan su tratamiento para la prestación del servicio.
          </p>
        </Section>

        <Section title="7. Conservación de los datos">
          <p>
            Conservamos tus datos mientras tu cuenta esté activa o sea necesario para prestar el
            servicio. Si la academia o tú solicitan la eliminación, los borramos salvo que la ley
            exija conservarlos por un período (por ejemplo, registros de pago).
          </p>
        </Section>

        <Section title="8. Seguridad">
          <p>
            Aplicamos medidas razonables para proteger tus datos: contraseñas cifradas, conexiones
            seguras (HTTPS) y control de acceso por rol. Ningún sistema es 100% infalible, pero
            trabajamos para mantener tu información protegida.
          </p>
        </Section>

        <Section title="9. Tus derechos">
          <p>
            Puedes solicitar acceder, corregir, actualizar o eliminar tus datos personales, así como
            oponerte a ciertos tratamientos. Para ejercerlos, escríbenos a{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-orange-600 font-semibold">{CONTACT_EMAIL}</a>{' '}
            o contacta directamente a tu academia.
          </p>
        </Section>

        <Section title="10. Eliminación de cuenta y datos">
          <p>
            Para solicitar la eliminación de tu cuenta y de tus datos personales, envía un correo a{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-orange-600 font-semibold">{CONTACT_EMAIL}</a>{' '}
            desde la dirección asociada a tu cuenta, indicando tu nombre y academia. Procesaremos la
            solicitud y eliminaremos tus datos, salvo aquellos que debamos conservar por obligación legal.
          </p>
        </Section>

        <Section title="11. Cambios a esta política">
          <p>
            Podemos actualizar esta política para reflejar cambios en el servicio o en la normativa.
            Publicaremos la versión vigente en esta página con su fecha de actualización.
          </p>
        </Section>

        <Section title="12. Contacto">
          <p>
            Si tienes dudas sobre esta política o sobre el tratamiento de tus datos, escríbenos a{' '}
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
