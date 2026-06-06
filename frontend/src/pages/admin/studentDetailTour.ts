import { type DriveStep } from 'driver.js';
import { runGuidedTour } from '../../utils/guidedTour';

interface StudentDetailTourOptions {
  hasDisciplines: boolean;
  /** First discipline has a belt and room for another grade (so the "Grado" button is shown). */
  firstCanGrade: boolean;
  initialDismiss: boolean;
  onFinish: (dismissForever: boolean) => void;
}

/**
 * Guided tour for the student detail page. Discipline action steps target the FIRST discipline's
 * buttons (marked with `data-tour="..."`).
 */
export function startStudentDetailTour({
  hasDisciplines,
  firstCanGrade,
  initialDismiss,
  onFinish,
}: StudentDetailTourOptions) {
  const steps: DriveStep[] = [
    {
      element: '[data-tour="editar"]',
      popover: {
        title: '✏️ Editar',
        description: 'Modifica los datos del alumno: nombre, contacto, plan, foto y más.',
        side: 'bottom',
        align: 'end',
      },
    },
    {
      element: '[data-tour="agregar-disciplina"]',
      popover: {
        title: '➕ Agregar disciplina',
        description: 'Inscribe al alumno en una disciplina (arte marcial) con su cinturón inicial.',
        side: 'bottom',
        align: 'end',
      },
    },
    ...(hasDisciplines
      ? [
          {
            element: '[data-tour="cinturon"]',
            popover: {
              title: '🏆 Cinturón',
              description: 'Cambia el cinturón del alumno en esta disciplina (promoción o degradación).',
              side: 'bottom' as const,
              align: 'end' as const,
            },
          },
          ...(firstCanGrade
            ? [{
                element: '[data-tour="grado"]',
                popover: {
                  title: '⭐ Grado',
                  description: 'Registra un nuevo grado (franja/estrella) dentro del cinturón actual.',
                  side: 'bottom' as const,
                  align: 'end' as const,
                },
              }]
            : []),
          {
            element: '[data-tour="torneo"]',
            popover: {
              title: '🏅 Torneo',
              description: 'Registra un resultado de competición: torneo, posición, categoría y cinturón.',
              side: 'bottom' as const,
              align: 'end' as const,
            },
          },
          {
            element: '[data-tour="historial"]',
            popover: {
              title: '📋 Historial',
              description: 'Despliega el historial de graduaciones y los resultados de torneos de la disciplina.',
              side: 'bottom' as const,
              align: 'end' as const,
            },
          },
        ]
      : []),
  ];

  runGuidedTour({
    welcomeTitle: '👋 Ficha del alumno',
    welcomeBody: '<p>Aquí ves y gestionas toda la información del alumno. Te muestro las acciones disponibles.</p>',
    steps,
    initialDismiss,
    onFinish,
  });
}
