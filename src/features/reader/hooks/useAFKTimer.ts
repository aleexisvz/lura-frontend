import { useCallback, useEffect, useRef, useState } from "react";

const AFK_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes without activity → show warning
const AFK_WARNING_MS = 60 * 1000;      // 60 seconds countdown before session ends

type UseAFKTimerOptions = {
  onExpired: () => void;
  disabled?: boolean;
};

type UseAFKTimerResult = {
  isWarning: boolean;
  secondsRemaining: number;
  resetTimer: () => void;
};

export function useAFKTimer({ onExpired, disabled = false }: UseAFKTimerOptions): UseAFKTimerResult {
  const [isWarning, setIsWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(AFK_WARNING_MS / 1000);

  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onExpiredRef = useRef(onExpired);

  useEffect(() => {
    onExpiredRef.current = onExpired;
  }, [onExpired]);

  const clearAllTimers = useCallback(() => {
    if (warningTimerRef.current !== null) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    if (countdownIntervalRef.current !== null) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const startCountdown = useCallback(() => {
    setIsWarning(true);
    setSecondsRemaining(AFK_WARNING_MS / 1000);

    countdownIntervalRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current!);
          countdownIntervalRef.current = null;
          setIsWarning(false);
          onExpiredRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const startWarningTimer = useCallback(() => {
    warningTimerRef.current = setTimeout(() => {
      warningTimerRef.current = null;
      startCountdown();
    }, AFK_TIMEOUT_MS - AFK_WARNING_MS);
  }, [startCountdown]);

  const resetTimer = useCallback(() => {
    clearAllTimers();
    setIsWarning(false);
    setSecondsRemaining(AFK_WARNING_MS / 1000);
    if (!disabled) {
      startWarningTimer();
    }
  }, [clearAllTimers, disabled, startWarningTimer]);

  // Start the timer on mount (or when disabled changes to false)
  useEffect(() => {
    if (disabled) {
      clearAllTimers();
      setIsWarning(false);
      return;
    }
    startWarningTimer();
    return clearAllTimers;
  }, [disabled, startWarningTimer, clearAllTimers]);

  return { isWarning, secondsRemaining, resetTimer };
}
