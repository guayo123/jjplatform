import { type DriveStep } from 'driver.js';
import { runGuidedTour } from '../../utils/guidedTour';

interface PortalTourOptions {
  firstName: string;
  hasDisciplines: boolean;
  multiAcademy: boolean;
  /** Reflects the current persisted choice so the checkbox starts in the right state. */
  initialDismiss: boolean;
  /** Called when the tour ends; receives the final checkbox state ("don't show again"). */
  onFinish: (dismissForever: boolean) => void;
}

/**
 * Runs the student-portal guided tour. Steps target elements marked with `data-tour="..."`.
 */
export function startPortalTour({
  firstName,
  hasDisciplines,
  multiAcademy,
  initialDismiss,
  onFinish,
}: PortalTourOptions) {
  const steps: DriveStep[] = [
    {
      element: '[data-tour="portada"]',
      popover: {
        title: '🎨 Tu portada',
        description: 'Personaliza esta barra superior: toca el botón 🎨 y elige un diseño (Japonés, Jiu-Jitsu o Minimalista).',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-tour="photo"]',
      popover: {
        title: '📸 Tu foto',
        description: 'Toca tu foto para subir o cambiar tu imagen de perfil.',
        side: 'right',
        align: 'start',
      },
    },
    ...(hasDisciplines
      ? [
          {
            element: '[data-tour="cinturon"]',
            popover: {
              title: '🥋 Tu cinturón',
              description: 'Este es tu cinturón actual en cada disciplina.',
              side: 'top' as const,
              align: 'start' as const,
            },
          },
          {
            element: '[data-tour="grados"]',
            popover: {
              title: '⭐ Tus grados',
              description: 'Las estrellas (★) junto al cinturón son tus grados dentro de él.',
              side: 'bottom' as const,
              align: 'start' as const,
            },
          },
          {
            element: '[data-tour="historial"]',
            popover: {
              title: '📋 Tu historial',
              description: 'Toca "Historial" para ver cuándo te promovieron, cambios de cinturón y resultados de torneos.',
              side: 'top' as const,
              align: 'start' as const,
            },
          },
        ]
      : []),
    {
      element: '[data-tour="pagos"]',
      popover: {
        title: '💳 Tus pagos',
        description: 'Aquí revisas tus cuotas mensuales y saldos pendientes.',
        side: 'top',
        align: 'start',
      },
    },
    ...(multiAcademy
      ? [{
          element: '[data-tour="academias"]',
          popover: {
            title: '🏫 Tus academias',
            description: 'Cambia entre las academias en las que estás inscrito.',
            side: 'bottom' as const,
            align: 'start' as const,
          },
        }]
      : []),
  ];

  runGuidedTour({
    welcomeTitle: `¡Hola, ${firstName}!`,
    welcomeBody: '<p>Este es tu portal. Aquí puedes ver toda tu información. Te muestro rápidamente qué puedes hacer.</p>',
    steps,
    initialDismiss,
    onFinish,
  });
}
