import { driver, type DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';

export interface GuidedTourOptions {
  welcomeTitle: string;
  /** HTML for the welcome step body (the "don't show again" checkbox is appended automatically). */
  welcomeBody: string;
  /** Element steps shown after the welcome step. */
  steps: DriveStep[];
  /** Reflects the current persisted choice so the checkbox starts in the right state. */
  initialDismiss: boolean;
  /** Called when the tour ends; receives the final checkbox state ("don't show again"). */
  onFinish: (dismissForever: boolean) => void;
}

/**
 * Runs a Driver.js guided tour with the app's standard styling (`jjp-tour`). The first step is a
 * welcome popover carrying a "No volver a mostrar" checkbox; its value is reported via onFinish so the
 * caller decides whether to persist the dismissal.
 */
export function runGuidedTour({ welcomeTitle, welcomeBody, steps, initialDismiss, onFinish }: GuidedTourOptions) {
  let dismissForever = initialDismiss;

  const allSteps: DriveStep[] = [
    {
      popover: {
        title: welcomeTitle,
        description:
          welcomeBody +
          '<label style="display:flex;align-items:center;gap:8px;margin-top:14px;font-size:13px;color:#4b5563;cursor:pointer">' +
          `<input type="checkbox" id="guided-tour-dismiss" ${initialDismiss ? 'checked' : ''} style="width:15px;height:15px;cursor:pointer" />` +
          'No volver a mostrar esta ayuda</label>',
      },
    },
    ...steps,
  ];

  const tour = driver({
    popoverClass: 'jjp-tour',
    showProgress: true,
    progressText: '{{current}} de {{total}}',
    nextBtnText: 'Siguiente',
    prevBtnText: 'Atrás',
    doneBtnText: 'Listo',
    steps: allSteps,
    onPopoverRender: (popover) => {
      const checkbox = popover.wrapper.querySelector<HTMLInputElement>('#guided-tour-dismiss');
      if (checkbox) {
        checkbox.addEventListener('change', () => {
          dismissForever = checkbox.checked;
        });
      }
    },
    onDestroyed: () => {
      onFinish(dismissForever);
    },
  });

  tour.drive();
}
