"use client";

import { useEffect, useState } from "react";

type QuizStatus = {
  run: {
    status: "NOT_STARTED" | "RUNNING" | "PAUSED" | "ENDED";
  } | null;
  phase: string;
};

export default function AdminQuizBanner() {
  const [status, setStatus] = useState<QuizStatus | null>(null);

  useEffect(() => {
    let mounted = true;

    async function refresh() {
      try {
        const response = await fetch("/api/admin/quiz/snapshot", {
          cache: "no-store",
        });

        if (!response.ok) return;

        const data: QuizStatus = await response.json();

        if (mounted) setStatus(data);
      } catch {
        // Keep the last known status if a temporary poll fails.
      }
    }

    void refresh();
    const interval = window.setInterval(() => void refresh(), 2500);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  if (
    !status ||
    status.run?.status !== "RUNNING" ||
    status.phase === "ENDED"
  ) {
    return null;
  }

  return (
    <div
      role="status"
      className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900 shadow-sm backdrop-blur-md animate-fade-in"
    >
      <span className="relative flex size-2.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
      </span>
      <span className="font-semibold tracking-tight">Quiz in progress</span>
      <span className="text-emerald-800/80">
        Current phase: <span className="font-medium text-emerald-900">{status.phase}</span>
      </span>
    </div>
  );
}
