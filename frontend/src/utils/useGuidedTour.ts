import { useEffect, useRef } from 'react';
import { type DriveStep } from 'driver.js';
import { runGuidedTour } from './guidedTour';

interface UseGuidedTourOptions {
  /** localStorage key; value 'dismissed' suppresses the auto-run. */
  storageKey: string;
  welcomeTitle: string;
  welcomeBody: string;
  /** Built lazily so it reads the latest data when the tour actually runs. */
  buildSteps: () => DriveStep[];
  /** Page loading flag. The tour auto-runs once on the loading true -> false edge. */
  loading: boolean;
}

/**
 * Wires a Driver.js guided tour to a page: auto-runs once when loading finishes (true -> false edge,
 * which is robust to both store-backed loading that starts false and local loading that starts true,
 * and to React StrictMode double-invokes) unless the user dismissed it. Returns a `start` function to
 * wire to a "?" help button so it can be reopened on demand.
 */
export function useGuidedTour({ storageKey, welcomeTitle, welcomeBody, buildSteps, loading }: UseGuidedTourOptions) {
  const startedRef = useRef(false);
  const prevLoadingRef = useRef(loading);

  const start = () => {
    runGuidedTour({
      welcomeTitle,
      welcomeBody,
      steps: buildSteps(),
      initialDismiss: localStorage.getItem(storageKey) === 'dismissed',
      onFinish: (dismissForever) => {
        if (dismissForever) localStorage.setItem(storageKey, 'dismissed');
        else localStorage.removeItem(storageKey);
      },
    });
  };

  useEffect(() => {
    const wasLoading = prevLoadingRef.current;
    prevLoadingRef.current = loading;
    if (!wasLoading || loading || startedRef.current) return;
    if (localStorage.getItem(storageKey) === 'dismissed') return;
    startedRef.current = true;
    start();
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  return start;
}
