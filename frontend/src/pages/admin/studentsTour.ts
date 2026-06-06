import { type DriveStep } from 'driver.js';
import { runGuidedTour } from '../../utils/guidedTour';

interface StudentsTourOptions {
  canCreate: boolean;
  hasExport: boolean;
  hasFilters: boolean;
  hasRows: boolean;
  canEdit: boolean;
  initialDismiss: boolean;
  onFinish: (dismissForever: boolean) => void;
}

/**
 * Guided tour for the admin Students list. Row-action steps pick the desktop or mobile markup
 * depending on viewport, since each layout renders its own buttons.
 */
export function startStudentsTour({
  canCreate,
  hasExport,
  hasFilters,
  hasRows,
  canEdit,
  initialDismiss,
  onFinish,
}: StudentsTourOptions) {
  const isDesktop = window.matchMedia('(min-width: 768px)').matches;
  const suffix = isDesktop ? '' : '-m'; // mobile cards use the "-m" markers

  const steps: DriveStep[] = [
    ...(canCreate
      ? [{
          element: '[data-tour="nuevo"]',
          popover: {
            title: '➕ Nuevo alumno',
            description: 'Crea un alumno nuevo con sus datos personales, plan y foto.',
            side: 'bottom' as const,
            align: 'end' as const,
          },
        }]
      : []),
    ...(hasExport
      ? [
          {
            element: '[data-tour="excel"]',
            popover: {
              title: '📊 Exportar a Excel',
              description: 'Descarga el listado (con los filtros aplicados) en Excel, incluyendo las graduaciones.',
              side: 'bottom' as const,
              align: 'end' as const,
            },
          },
          {
            element: '[data-tour="pdf"]',
            popover: {
              title: '📄 Exportar a PDF',
              description: 'Descarga el mismo listado en PDF para imprimir o compartir.',
              side: 'bottom' as const,
              align: 'end' as const,
            },
          },
        ]
      : []),
    ...(hasFilters
      ? [{
          element: '[data-tour="filtros"]',
          popover: {
            title: '🔎 Filtros',
            description: 'Filtra y busca a tus alumnos por nombre, cinturón, edad, peso y estado (activo/inactivo).',
            side: 'bottom' as const,
            align: 'start' as const,
          },
        }]
      : []),
    ...(hasRows
      ? [{
          element: `[data-tour="detalle${suffix}"]`,
          popover: {
            title: '👁️ Ver detalle',
            description: 'Entra a la ficha del alumno. Ahí agregas su cinturón, grados y torneos, y revisas todo su historial.',
            side: 'top' as const,
            align: 'end' as const,
          },
        }]
      : []),
    ...(hasRows && canEdit
      ? [{
          element: `[data-tour="editar${suffix}"]`,
          popover: {
            title: '✏️ Editar',
            description: 'Modifica los datos del alumno: nombre, contacto, plan, foto y más.',
            side: 'top' as const,
            align: 'end' as const,
          },
        }]
      : []),
  ];

  runGuidedTour({
    welcomeTitle: '👋 Gestión de alumnos',
    welcomeBody: '<p>Desde aquí administras a tus alumnos. Te muestro rápidamente las opciones disponibles.</p>',
    steps,
    initialDismiss,
    onFinish,
  });
}
