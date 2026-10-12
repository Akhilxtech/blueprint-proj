
"use client";

import { useEffect, useRef } from "react";

type ViolationResult = {
  success?: boolean;
  ignored?: boolean;
  duplicate?: boolean;
  warningCount?: number;
  maxWarnings?: number;
  eliminated?: boolean;
  error?: string;
};

type PendingViolation = {
  clientEventId: string;
  startedAt: string;
  durationMs: number;
};

type UseTabSwitchGuardOptions = {
  enabled: boolean;
  minAwaySeconds: number;
  onViolation?: (result: ViolationResult) => void;
};

const RECONNECT_GRACE_MS = 5000;

export function useTabSwitchGuard({
  enabled,
  minAwaySeconds,
  onViolation,
}: UseTabSwitchGuardOptions) {
  const enabledRef = useRef(enabled);
  const minAwaySecondsRef = useRef(minAwaySeconds);
  const onViolationRef = useRef(onViolation);

  const awayStartedAtRef = useRef<number | null>(null);
  const awayStartedDuringGraceRef = useRef(false);
  const graceUntilRef = useRef(0);

  const pendingRef = useRef<PendingViolation[]>([]);
  const sendingRef = useRef(false);

  useEffect(() => {
    enabledRef.current = enabled;
    minAwaySecondsRef.current = minAwaySeconds;
    onViolationRef.current = onViolation;
  }, [enabled, minAwaySeconds, onViolation]);

  useEffect(() => {
    // Do not report an episode that began before this hook was mounted.
    graceUntilRef.current = Date.now() + RECONNECT_GRACE_MS;

    let disposed = false;

    function startAwayEpisode() {
      if (!enabledRef.current) return;
      if (awayStartedAtRef.current !== null) return;

      awayStartedAtRef.current = Date.now();
      awayStartedDuringGraceRef.current =
        Date.now() < graceUntilRef.current;
    }

    function endAwayEpisode() {
      // Only finish the episode once the page is visible AND focused.
      if (document.visibilityState !== "visible") return;
      if (!document.hasFocus()) return;

      const startedAtMs = awayStartedAtRef.current;
      if (startedAtMs === null) return;

      const durationMs = Math.max(0, Date.now() - startedAtMs);
      const startedDuringGrace = awayStartedDuringGraceRef.current;

      awayStartedAtRef.current = null;
      awayStartedDuringGraceRef.current = false;

      if (!enabledRef.current || startedDuringGrace) return;

      if (durationMs < minAwaySecondsRef.current * 1000) return;

      pendingRef.current.push({
        clientEventId: crypto.randomUUID(),
        startedAt: new Date(startedAtMs).toISOString(),
        durationMs,
      });

      void flushQueue();
    }

    async function flushQueue() {
      if (sendingRef.current || disposed) return;
      sendingRef.current = true;

      try {
        while (!disposed && pendingRef.current.length > 0) {
          const event = pendingRef.current[0];

          let response: Response;

          try {
            response = await fetch("/api/quiz/violation", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(event),
            });
          } catch {
            // Keep this exact event ID and payload for a retry.
            return;
          }

          let result: ViolationResult;

          try {
            result = (await response.json()) as ViolationResult;
          } catch {
            return;
          }

          if (!response.ok) {
            // Retain failed events for retry, including temporary server errors.
            return;
          }

          // An accepted or intentionally ignored event has been handled.
          pendingRef.current.shift();

         if (result.success && !result.duplicate && !result.ignored) {
  onViolationRef.current?.(result);
}
        }
      } finally {
        sendingRef.current = false;
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        startAwayEpisode();
      } else {
        endAwayEpisode();
      }
    }

    function handleBlur() {
      startAwayEpisode();
    }

    function handleFocus() {
      endAwayEpisode();
    }

    function handleOnline() {
      // Ignore any away episode that begins during reconnect grace.
      graceUntilRef.current = Date.now() + RECONNECT_GRACE_MS;

      // Retry queued events when the network returns.
      void flushQueue();

      // If the browser is already back, close any open episode.
      endAwayEpisode();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleOnline);

    const retryInterval = window.setInterval(() => {
      void flushQueue();
    }, 3000);

    // Handle a page that mounts while already hidden or unfocused.
    if (
      document.visibilityState === "hidden" ||
      !document.hasFocus()
    ) {
      startAwayEpisode();
    }

    return () => {
      disposed = true;
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleOnline);
      window.clearInterval(retryInterval);
    };
  }, []);
}
