import { useState, useCallback, useEffect } from "react";

const TOUR_STORAGE_KEY = "diadonum_tour_completed";

export function useTour() {
  const [hasSeenTour, setHasSeenTour] = useState<boolean>(() => {
    try {
      return localStorage.getItem(TOUR_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  const [isRunning, setIsRunning] = useState(false);

  // Auto-start tour for new users
  useEffect(() => {
    if (!hasSeenTour) {
      // Small delay to let the dashboard render
      const timer = setTimeout(() => {
        setIsRunning(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [hasSeenTour]);

  const startTour = useCallback(() => {
    setIsRunning(true);
  }, []);

  const completeTour = useCallback(() => {
    setIsRunning(false);
    setHasSeenTour(true);
    try {
      localStorage.setItem(TOUR_STORAGE_KEY, "true");
    } catch {
      // localStorage might be unavailable
    }
  }, []);

  const resetTour = useCallback(() => {
    setHasSeenTour(false);
    try {
      localStorage.removeItem(TOUR_STORAGE_KEY);
    } catch {
      // localStorage might be unavailable
    }
  }, []);

  return {
    hasSeenTour,
    isRunning,
    startTour,
    completeTour,
    resetTour,
    setIsRunning,
  };
}
