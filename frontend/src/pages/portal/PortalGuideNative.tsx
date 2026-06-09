import { useMemo, useState } from 'react';
import { tapLight } from '../../native/haptics';

interface Props {
  firstName: string;
  /** Whether the student belongs to more than one academy (adds the academy-switch step). */
  multiAcademy: boolean;
  /** Reflects the current persisted choice so the checkbox starts in the right state. */
  initialDismiss: boolean;
  /** Called when the guide closes; receives the final "don't show again" state. */
  onFinish: (dismissForever: boolean) => void;
}

interface GuideStep {
  icon: string;
  title: string;
  body: string;
}

/**
 * Native portal walkthrough. The web help is a Driver.js tour anchored to on-screen
 * elements, but in the app each tab mounts only when active, so element-anchored steps
 * can't find their targets. This mobile-friendly version is a self-contained carousel
 * that explains each bottom-tab section and the key features instead of highlighting DOM.
 * Shares the dismissal contract (onFinish) with the web tour.
 */
export default function PortalGuideNative({ firstName, multiAcademy, initialDismiss, onFinish }: Props) {
  const steps = useMemo<GuideStep[]>(() => {
    const base: GuideStep[] = [
      {
        icon: '👋',
        title: `¡Hola, ${firstName}!`,
        body: 'Este es tu portal. Te muestro rápido qué puedes hacer desde la app.',
      },
      {
        icon: '🔥',
        title: 'Entreno',
        body: 'Registra cada entrenamiento al salir del tatami. Mantén tu racha de días seguidos y cumple tu meta semanal.',
      },
      {
        icon: '⚔️',
        title: 'Retos',
        body: 'Desafía a tus compañeros a un duelo y registra los resultados. ¡A ver quién manda en el tatami!',
      },
      {
        icon: '🥋',
        title: 'Fichas',
        body: 'Tu cinturón actual, tus grados (★) y el historial de promociones, cambios de cinturón y torneos.',
      },
      {
        icon: '💳',
        title: 'Pagos',
        body: 'Consulta tus cuotas mensuales y cualquier saldo pendiente.',
      },
      {
        icon: '👤',
        title: 'Perfil',
        body: 'Cambia tu foto y revisa tus datos. También personalizas tu portada con el botón 🎨 de arriba.',
      },
    ];
    if (multiAcademy) {
      base.push({
        icon: '🏫',
        title: 'Tus academias',
        body: 'Si entrenas en más de una academia, cambia entre ellas con el selector que aparece arriba.',
      });
    }
    base.push({
      icon: '🧭',
      title: 'Muévete por abajo',
      body: 'Usa la barra inferior para saltar entre secciones. ¿Necesitas ver esto de nuevo? Toca el botón "?" arriba cuando quieras.',
    });
    return base;
  }, [firstName, multiAcademy]);

  const [index, setIndex] = useState(0);
  const [dismiss, setDismiss] = useState(initialDismiss);

  const isLast = index === steps.length - 1;
  const step = steps[index];

  const close = () => onFinish(dismiss);
  const next = () => {
    void tapLight();
    if (isLast) close();
    else setIndex((i) => i + 1);
  };
  const prev = () => {
    void tapLight();
    setIndex((i) => Math.max(0, i - 1));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/80 backdrop-blur-sm px-5 pt-safe pb-safe">
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-7 text-center shadow-2xl jjp-pop">
        <button
          onClick={close}
          className="absolute right-3 top-3 text-2xl leading-none text-gray-300 hover:text-gray-500"
          aria-label="Cerrar ayuda"
        >
          ×
        </button>

        <div className="mb-3 text-5xl" key={step.icon}>
          {step.icon}
        </div>
        <h2 className="text-xl font-extrabold text-gray-900">{step.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">{step.body}</p>

        {/* Progress dots */}
        <div className="mt-5 flex items-center justify-center gap-1.5">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? 'w-5 bg-primary-600' : 'w-1.5 bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="mt-6 flex items-center gap-3">
          {index > 0 && (
            <button
              onClick={prev}
              className="flex-1 rounded-xl border-2 border-gray-200 py-2.5 font-semibold text-gray-600 transition-colors hover:border-gray-300"
            >
              Atrás
            </button>
          )}
          <button
            onClick={next}
            className="flex-1 rounded-xl bg-primary-600 py-2.5 font-semibold text-white transition-colors hover:bg-primary-700"
          >
            {isLast ? '¡Listo!' : 'Siguiente'}
          </button>
        </div>

        <label className="mt-5 flex cursor-pointer items-center justify-center gap-2 text-xs text-gray-400">
          <input
            type="checkbox"
            checked={dismiss}
            onChange={(e) => setDismiss(e.target.checked)}
            className="h-3.5 w-3.5 cursor-pointer accent-primary-600"
          />
          No volver a mostrar esta ayuda
        </label>
      </div>
    </div>
  );
}
