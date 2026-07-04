import { type DriveStep } from 'driver.js';
import { runGuidedTour } from '../../utils/guidedTour';
import { type PortalTab } from './PortalTabs';

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
      element: '[data-tour="registrar-entreno"]',
      popover: {
        title: '➕ Registrar entrenamiento',
        description: 'Toca el <b>+</b> y elige qué registrar:<br><br>🥋 <b>Jiujitsu</b> — sesión en el tatami (Gi, No-Gi, Open Mat o Competición)<br>🥊 <b>Kickboxing</b> — sesión de golpeo (striking)<br>🏋️ <b>Físico</b> — gym, pesas o cardio',
        side: 'top',
        align: 'end',
      },
    },
    {
      element: '[data-tour="peso"]',
      popover: {
        title: '⚖️ Control de peso',
        description: 'Registra tu peso corporal y sigue tu evolución con un gráfico. Disponible desde cualquier dispositivo.',
        side: 'top',
        align: 'center',
      },
    },
    {
      element: '[data-tour="cumpleanos"]',
      popover: {
        title: '🎂 Cumpleaños del mes',
        description: 'Los cumpleaños de tus compañeros de academia este mes para que no se te pase ninguno.',
        side: 'top',
        align: 'center',
      },
    },
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

interface PortalNativeTourOptions extends PortalTourOptions {
  /**
   * Switches the active bottom tab. Each tab step calls this before highlighting so the
   * real section renders behind the spotlight — the tour points to *where* each thing lives.
   */
  onNavigate: (tab: PortalTab) => void;
}

/**
 * App / responsive variant of the portal tour. In the tabbed layout each section mounts only
 * when its tab is active, so we can't anchor steps to content inside other tabs. Instead we
 * anchor to the **bottom tab buttons** (always mounted) and to the header controls, switching
 * the active tab as the tour advances. The result is a real spotlight walkthrough that shows
 * the student which button does what — not just a wall of text.
 */
export function startPortalTourNative({
  firstName,
  hasDisciplines,
  multiAcademy,
  initialDismiss,
  onFinish,
  onNavigate,
}: PortalNativeTourOptions) {
  // A tab step: switch to the tab, then spotlight its button in the bottom bar (popover above it).
  const tabStep = (tab: PortalTab, title: string, description: string): DriveStep => ({
    element: `[data-tour="tab-${tab}"]`,
    onHighlightStarted: () => onNavigate(tab),
    popover: { title, description, side: 'top', align: 'center' },
  });

  const steps: DriveStep[] = [
    tabStep(
      'entreno',
      '🥋 Entreno',
      'Toca aquí para registrar cada entrenamiento al salir del tatami, mantener tu racha de días y cumplir tu meta semanal.',
    ),
    {
      element: '[data-tour="registrar-entreno"]',
      onHighlightStarted: () => onNavigate('entreno'),
      popover: {
        title: '➕ Registrar entrenamiento',
        description: 'Toca el <b>+</b> y elige qué registrar:<br><br>🥋 <b>Jiujitsu</b> — sesión en el tatami (Gi, No-Gi, Open Mat o Competición)<br>🥊 <b>Kickboxing</b> — sesión de golpeo (striking)<br>🏋️ <b>Físico</b> — gym, pesas o cardio',
        side: 'top',
        align: 'end',
      },
    },
    {
      element: '[data-tour="peso"]',
      onHighlightStarted: () => onNavigate('entreno'),
      popover: {
        title: '⚖️ Control de peso',
        description: 'Registra tu peso corporal y sigue tu evolución con un gráfico. Tus datos se guardan en la nube — disponibles desde cualquier dispositivo.',
        side: 'top',
        align: 'center',
      },
    },
    tabStep(
      'retos',
      '⚔️ Retos',
      'Desde este botón desafías a tus compañeros a un duelo y registras los resultados.',
    ),
    tabStep(
      'fichas',
      '🥋 Fichas',
      hasDisciplines
        ? 'Aquí ves tu cinturón actual, tus grados (★) y el historial de promociones, cambios de cinturón y torneos.'
        : 'Aquí aparecerá tu cinturón, tus grados y tu historial cuando tu academia los registre.',
    ),
    {
      element: '[data-tour="cumpleanos"]',
      onHighlightStarted: () => onNavigate('fichas'),
      popover: {
        title: '🎂 Cumpleaños del mes',
        description: 'Aquí ves los cumpleaños de tus compañeros de academia este mes para que no se te pase ninguno.',
        side: 'top',
        align: 'center',
      },
    },
    tabStep('pagos', '💳 Pagos', 'En esta pestaña consultas tus cuotas mensuales y cualquier saldo pendiente.'),
    tabStep(
      'perfil',
      '🙂 Perfil',
      'Tu foto y tus datos viven aquí. Toca tu foto para cambiarla.',
    ),
    {
      element: '[data-tour="portada-btn"]',
      popover: {
        title: '🎨 Tu portada',
        description: 'Con este botón personalizas la portada de arriba: elige un diseño (Japonés, Jiu-Jitsu o Minimalista).',
        side: 'bottom',
        align: 'end',
      },
    },
    ...(multiAcademy
      ? [{
          element: '[data-tour="academias"]',
          popover: {
            title: '🏫 Tus academias',
            description: 'Si entrenas en más de una academia, cambia entre ellas con estos botones.',
            side: 'bottom' as const,
            align: 'start' as const,
          },
        }]
      : []),
    {
      element: '[data-tour="ayuda-btn"]',
      popover: {
        title: '❔ ¿La ves de nuevo?',
        description: 'Toca este botón cuando quieras repetir esta guía. ¡Listo, a entrenar!',
        side: 'bottom',
        align: 'end',
      },
    },
  ];

  runGuidedTour({
    welcomeTitle: `¡Hola, ${firstName}!`,
    welcomeBody: '<p>Este es tu portal. Sigue las flechas y te muestro <b>dónde está cada cosa</b>.</p>',
    steps,
    initialDismiss,
    onFinish,
  });
}
