
"use client";

import { useCallback, useEffect, useState } from "react";

type ReadyTeam = {
  id: string;
  name: string;
  participantCount: number;
  rulesAccepted: boolean;
  lastSeenAt: string | null;
  quizStatus: "ACTIVE" | "ELIMINATED";
  ready: boolean;
};

type ReadinessResponse = {
  serverNow: string;
  readinessWindowSeconds: number;
  totalTeams: number;
  eligibleTeams: number;
  teams: ReadyTeam[];
};

type QuizRunStatus = "NOT_STARTED" | "RUNNING" | "PAUSED" | "ENDED";

type QuizRun = {
  id: string;
  status: Exclude<QuizRunStatus, "NOT_STARTED">;
  startedAt: string | null;
  pausedAt: string | null;
  pausedMs: number;
  skipMs: number;
  endedAt: string | null;
};

type QuizStatusResponse = {
  run: QuizRun | null;
  error?: string;
};

type ApiResponse = {
  success?: boolean;
  error?: string;
  status?: string;
  startedAt?: string;
  prestartSeconds?: number;
  questionCount?: number;
  rosterCount?: number;
  resumedAt?: string;
  pausedAt?: string;
};

export default function QuizControl() {
  const [readiness, setReadiness] =
    useState<ReadinessResponse | null>(null);
  const [quizRun, setQuizRun] = useState<QuizRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [now, setNow] = useState<number | null>(null);

  const quizStatus: QuizRunStatus = quizRun?.status ?? "NOT_STARTED";

  const refreshReadiness = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/quiz/prestart", {
        cache: "no-store",
      });

      const data = (await response.json()) as ReadinessResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load team readiness.");
      }

      setReadiness(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load team readiness.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshQuizStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/quiz/status", {
        cache: "no-store",
      });

      const data = (await response.json()) as QuizStatusResponse;

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load quiz status.");
      }

      setQuizRun(data.run);
      setStatusLoading(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load quiz status.",
      );
      setStatusLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshReadiness(), refreshQuizStatus()]);
  }, [refreshReadiness, refreshQuizStatus]);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => {
      void refreshAll();
    }, 0);

    const refreshInterval = window.setInterval(() => {
      void refreshAll();
    }, 5000);

    const clockInterval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(refreshInterval);
      window.clearInterval(clockInterval);
    };
  }, [refreshAll]);

  async function startQuiz() {
    if (!readiness || readiness.eligibleTeams === 0 || actionLoading) {
      return;
    }

    const confirmed = window.confirm(
      "Start the quiz? The eligible team roster and question list will be frozen.",
    );

    if (!confirmed) return;

    setActionLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/quiz/start", {
        method: "POST",
      });

      const data = (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to start the quiz.");
      }

      setMessage(
        `Quiz initialized successfully. Questions: ${data.questionCount ?? 0}. Teams: ${data.rosterCount ?? 0}.`,
      );

      await refreshAll();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start the quiz.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function changeQuizState(action: "pause" | "resume") {
    if (actionLoading) return;

    const actionLabel = action === "pause" ? "Pause" : "Resume";

    setActionLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/admin/quiz/${action}`, {
        method: "POST",
      });

      const data = (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(data.error ?? `Failed to ${action} the quiz.`);
      }

      setMessage(
        action === "pause"
          ? "Quiz paused successfully."
          : "Quiz resumed successfully.",
      );

      await refreshAll();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : `Failed to ${action} the quiz.`,
      );

      await refreshQuizStatus();
    } finally {
      setActionLoading(false);
    }
  }


  async function performQuizAction(
    action: "skip" | "end" | "reset-practice",
  ) {
    if (actionLoading) return;

    const confirmations: Record<typeof action, string> = {
      skip: "Skip the current question and move to the next one?",
      end: "End the quiz now? Participants will no longer be able to answer.",
      "reset-practice":
        "Reset practice? All quiz responses will be deleted, the roster cleared, and team quiz states reset.",
    };

    if (!window.confirm(confirmations[action])) return;

    setActionLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/admin/quiz/${action}`, {
        method: "POST",
      });

      const data = (await response.json()) as ApiResponse & {
        message?: string;
        deletedResponses?: number;
      };

      if (!response.ok) {
        throw new Error(data.error ?? `Failed to ${action}.`);
      }

      if (action === "skip") {
        setMessage(data.message ?? "Question skipped successfully.");
      } else if (action === "end") {
        setMessage("Quiz ended successfully.");
      } else {
        setMessage(
          `Practice reset successfully. Deleted responses: ${data.deletedResponses ?? 0}.`,
        );
      }

      await refreshAll();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : `Failed to ${action}.`,
      );
      await refreshAll();
    } finally {
      setActionLoading(false);
    }
  }


  function formatLastSeen(value: string | null) {
    if (!value) return "Never";

    const timestamp = new Date(value).getTime();

    if (!Number.isFinite(timestamp)) return "Unknown";
    if (now === null) return "Calculating...";

    const elapsedSeconds = Math.max(
      0,
      Math.floor((now - timestamp) / 1000),
    );

    if (elapsedSeconds < 60) return `${elapsedSeconds}s ago`;

    return `${Math.floor(elapsedSeconds / 60)}m ago`;
  }

  function formatTimestamp(value: string | null) {
    if (!value) return "Not set";

    const timestamp = new Date(value);

    if (Number.isNaN(timestamp.getTime())) return "Unknown";

    return timestamp.toLocaleString();
  }

  const statusStyles: Record<QuizRunStatus, string> = {
    NOT_STARTED: "border-zinc-500/30 bg-zinc-500/10 text-zinc-300",
    RUNNING: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    PAUSED: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    ENDED: "border-red-500/30 bg-red-500/10 text-red-300",
  };

  const statusLabels: Record<QuizRunStatus, string> = {
    NOT_STARTED: "Not Started",
    RUNNING: "Running",
    PAUSED: "Paused",
    ENDED: "Ended",
  };

  return (
    <section className="mx-auto max-w-6xl">
      <p className="text-sm font-medium uppercase tracking-widest text-violet-400">
        Administration
      </p>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Quiz Control</h1>
          <p className="mt-2 text-zinc-400">
            Manage the synchronized quiz and review team readiness.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void refreshAll()}
          disabled={loading || statusLoading}
          className="rounded-lg border border-white/15 px-4 py-2 text-sm transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading || statusLoading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
        >
          {error}
        </div>
      )}

      {message && (
        <div
          role="status"
          className="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300"
        >
          {message}
        </div>
      )}

      <div className="mt-8 rounded-xl border border-white/10 bg-zinc-900 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Quiz status</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Status updates automatically every five seconds.
            </p>
          </div>

          <span
            className={`rounded-full border px-4 py-2 text-sm font-semibold ${statusStyles[quizStatus]}`}
          >
            {statusLoading ? "Loading status..." : statusLabels[quizStatus]}
          </span>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-white/10 p-4">
            <p className="text-sm text-zinc-400">Quiz started at</p>
            <p className="mt-2 text-sm font-medium">
              {formatTimestamp(quizRun?.startedAt ?? null)}
            </p>
          </div>

          <div className="rounded-lg border border-white/10 p-4">
            <p className="text-sm text-zinc-400">Quiz ended at</p>
            <p className="mt-2 text-sm font-medium">
              {formatTimestamp(quizRun?.endedAt ?? null)}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">

        <div className="mt-5 flex flex-wrap gap-3">
          {quizStatus === "NOT_STARTED" && (
            <button
              type="button"
              onClick={() => void startQuiz()}
              disabled={
                loading ||
                statusLoading ||
                actionLoading ||
                !readiness ||
                readiness.eligibleTeams === 0
              }
              className="rounded-lg bg-violet-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {actionLoading ? "Starting..." : "Start Quiz"}
            </button>
          )}

          {quizStatus === "RUNNING" && (
            <button
              type="button"
              onClick={() => void changeQuizState("pause")}
              disabled={actionLoading || statusLoading}
              className="rounded-lg bg-amber-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {actionLoading ? "Processing..." : "Pause Quiz"}
            </button>
          )}

          {(quizStatus === "RUNNING" || quizStatus === "PAUSED") && (
            <>
              {quizStatus === "PAUSED" && (
                <button
                  type="button"
                  onClick={() => void changeQuizState("resume")}
                  disabled={actionLoading || statusLoading}
                  className="rounded-lg bg-emerald-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {actionLoading ? "Processing..." : "Resume Quiz"}
                </button>
              )}

              <button
                type="button"
                onClick={() => void performQuizAction("skip")}
                disabled={actionLoading || statusLoading}
                className="rounded-lg border border-white/20 px-5 py-3 text-sm font-semibold transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Skip Question
              </button>

              <button
                type="button"
                onClick={() => void performQuizAction("end")}
                disabled={actionLoading || statusLoading}
                className="rounded-lg bg-red-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                End Quiz
              </button>
            </>
          )}

          {quizStatus === "ENDED" && (
            <button
              type="button"
              onClick={() => void performQuizAction("reset-practice")}
              disabled={actionLoading || statusLoading}
              className="rounded-lg bg-violet-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {actionLoading ? "Resetting..." : "Reset Practice"}
            </button>
          )}
        </div>

        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <article className="rounded-xl border border-white/10 bg-zinc-900 p-5">
          <p className="text-sm text-zinc-400">Registered teams</p>
          <p className="mt-2 text-3xl font-semibold">
            {readiness?.totalTeams ?? "—"}
          </p>
        </article>

        <article className="rounded-xl border border-white/10 bg-zinc-900 p-5">
          <p className="text-sm text-zinc-400">Ready teams</p>
          <p className="mt-2 text-3xl font-semibold">
            {readiness?.eligibleTeams ?? "—"}
          </p>
        </article>

        <article className="rounded-xl border border-white/10 bg-zinc-900 p-5">
          <p className="text-sm text-zinc-400">Readiness window</p>
          <p className="mt-2 text-3xl font-semibold">
            {readiness?.readinessWindowSeconds ?? 30}s
          </p>
        </article>
      </div>

      <div className="mt-8 rounded-xl border border-white/10 bg-zinc-900 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Prestart readiness</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Teams must accept the rules and check in within the last 30
              seconds.
            </p>
          </div>
        </div>

        {loading && !readiness ? (
          <p className="mt-6 text-sm text-zinc-400">
            Loading team readiness...
          </p>
        ) : readiness && readiness.teams.length === 0 ? (
          <p className="mt-6 text-sm text-zinc-400">
            No teams have been registered yet.
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="border-b border-white/10 text-zinc-400">
                <tr>
                  <th className="px-3 py-3 font-medium">Team</th>
                  <th className="px-3 py-3 font-medium">Participants</th>
                  <th className="px-3 py-3 font-medium">Rules accepted</th>
                  <th className="px-3 py-3 font-medium">Last seen</th>
                  <th className="px-3 py-3 font-medium">Readiness</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5">
                {readiness?.teams.map((team) => (
                  <tr key={team.id}>
                    <td className="px-3 py-4 font-medium">{team.name}</td>
                    <td className="px-3 py-4">{team.participantCount}</td>
                    <td className="px-3 py-4">
                      {team.rulesAccepted ? "Yes" : "No"}
                    </td>
                    <td className="px-3 py-4 text-zinc-400">
                      {formatLastSeen(team.lastSeenAt)}
                    </td>
                    <td className="px-3 py-4">
                      <span
                        className={
                          team.ready
                            ? "rounded-full bg-emerald-500/15 px-3 py-1 text-emerald-300"
                            : "rounded-full bg-zinc-700 px-3 py-1 text-zinc-300"
                        }
                      >
                        {team.ready ? "Ready" : "Not ready"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
