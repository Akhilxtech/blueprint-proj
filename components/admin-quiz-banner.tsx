
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
      className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
    >
      <span aria-hidden="true">●</span>
      <span className="font-semibold">Quiz in progress</span>
      <span className="text-emerald-100/80">
        Current phase: {status.phase}
      </span>
    </div>
  );
}
