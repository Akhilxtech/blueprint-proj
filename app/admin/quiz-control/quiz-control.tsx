
"use client";

import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";

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
  const [pendingQuizAction, setPendingQuizAction] = useState<"start" | "skip" | "end" | "reset-practice" | null>(null);

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

  async function executeStartQuiz() {
    if (!readiness || readiness.eligibleTeams === 0 || actionLoading) {
      return;
    }

    setPendingQuizAction(null);
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


  function requestQuizAction(action: "skip" | "end" | "reset-practice") {
    if (actionLoading) return;
    setPendingQuizAction(action);
  }

  async function executeQuizAction(
    action: "skip" | "end" | "reset-practice",
  ) {
    setPendingQuizAction(null);
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
    NOT_STARTED: "border-[#E7DCE4] dark:border-[#292929] bg-white/80 dark:bg-[#171717] text-[#4E404C] dark:text-[#A3A3A3]",
    RUNNING: "border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400",
    PAUSED: "border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400",
    ENDED: "border-rose-300 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-400",
  };

  const statusLabels: Record<QuizRunStatus, string> = {
    NOT_STARTED: "Not Started",
    RUNNING: "Running",
    PAUSED: "Paused",
    ENDED: "Ended",
  };

  return (
    <section className="mx-auto max-w-6xl animate-fade-in-up">
      <div className="mb-2">
        <p className="text-xs font-bold uppercase tracking-wider text-[#BE3477] dark:text-[#8B5CF6]">
          Administration
        </p>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-[#302630] dark:text-[#FAFAFA] sm:text-3xl">
              Quiz Control
            </h1>
            <p className="mt-1 text-sm text-[#4E404C] dark:text-[#A3A3A3]">
              Manage the synchronized quiz and review team readiness.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void refreshAll()}
            disabled={loading || statusLoading}
            className="rounded-xl border border-[#E7DCE4] dark:border-[#292929] bg-white/80 dark:bg-[#171717] px-4 py-2 text-xs font-semibold text-[#4E404C] dark:text-[#FAFAFA] hover:bg-white dark:hover:bg-[#202020] hover:text-[#302630] dark:hover:text-[#FAFAFA] transition-colors disabled:cursor-not-allowed disabled:opacity-50 shadow-2xs"
          >
            {loading || statusLoading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-2xl border border-rose-300 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/30 p-4 text-xs font-semibold text-rose-800 dark:text-rose-300"
        >
          {error}
        </div>
      )}

      {message && (
        <div
          role="status"
          className="mt-6 rounded-2xl border border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30 p-4 text-xs font-semibold text-emerald-800 dark:text-emerald-300"
        >
          {message}
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-white/70 dark:border-[#292929] bg-white/70 dark:bg-[#111111] p-5 shadow-sm backdrop-blur-md sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[#302630] dark:text-[#FAFAFA]">Quiz status</h2>
            <p className="mt-0.5 text-xs text-[#4E404C] dark:text-[#A3A3A3]">
              Status updates automatically every five seconds.
            </p>
          </div>

          <span
            className={`rounded-full border px-4 py-1.5 text-xs font-bold ${statusStyles[quizStatus]}`}
          >
            {statusLoading ? "Loading status..." : statusLabels[quizStatus]}
          </span>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-[#E7DCE4] dark:border-[#292929] bg-white/80 dark:bg-[#171717] p-4 shadow-2xs">
            <p className="text-xs font-bold uppercase tracking-wider text-[#4E404C] dark:text-[#A3A3A3]">Quiz started at</p>
            <p className="mt-1 text-xs font-bold text-[#302630] dark:text-[#FAFAFA]">
              {formatTimestamp(quizRun?.startedAt ?? null)}
            </p>
          </div>

          <div className="rounded-xl border border-[#E7DCE4] dark:border-[#292929] bg-white/80 dark:bg-[#171717] p-4 shadow-2xs">
            <p className="text-xs font-bold uppercase tracking-wider text-[#4E404C] dark:text-[#A3A3A3]">Quiz ended at</p>
            <p className="mt-1 text-xs font-bold text-[#302630] dark:text-[#FAFAFA]">
              {formatTimestamp(quizRun?.endedAt ?? null)}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[#E7DCE4] dark:border-[#292929] pt-5">
          {quizStatus === "NOT_STARTED" && (
            <button
              type="button"
              onClick={() => setPendingQuizAction("start")}
              disabled={
                loading ||
                statusLoading ||
                actionLoading ||
                !readiness ||
                readiness.eligibleTeams === 0
              }
              className="rounded-xl bg-[#BE3477] dark:bg-[#8B5CF6] px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#a82a67] dark:hover:bg-[#A78BFA] active:scale-[0.98] transition-all disabled:cursor-not-allowed disabled:opacity-40"
            >
              {actionLoading ? "Starting..." : "Start Quiz"}
            </button>
          )}

          {quizStatus === "RUNNING" && (
            <button
              type="button"
              onClick={() => void changeQuizState("pause")}
              disabled={actionLoading || statusLoading}
              className="rounded-xl border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-950/40 px-5 py-2.5 text-xs font-bold text-amber-900 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
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
                  className="rounded-xl border border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 px-5 py-2.5 text-xs font-bold text-emerald-800 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {actionLoading ? "Processing..." : "Resume Quiz"}
                </button>
              )}

              <button
                type="button"
                onClick={() => requestQuizAction("skip")}
                disabled={actionLoading || statusLoading}
                className="rounded-xl border border-[#E7DCE4] dark:border-[#292929] bg-white/80 dark:bg-[#171717] px-5 py-2.5 text-xs font-bold text-[#4E404C] dark:text-[#FAFAFA] hover:bg-white dark:hover:bg-[#202020] hover:text-[#302630] dark:hover:text-[#FAFAFA] transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              >
                Skip Question
              </button>

              <button
                type="button"
                onClick={() => requestQuizAction("end")}
                disabled={actionLoading || statusLoading}
                className="rounded-xl border border-rose-300 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/40 px-5 py-2.5 text-xs font-bold text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              >
                End Quiz
              </button>
            </>
          )}

          {quizStatus === "ENDED" && (
            <button
              type="button"
              onClick={() => requestQuizAction("reset-practice")}
              disabled={actionLoading || statusLoading}
              className="rounded-xl border border-rose-300 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/40 px-5 py-2.5 text-xs font-bold text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            >
              {actionLoading ? "Resetting..." : "Reset Practice"}
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-white/70 dark:border-[#292929] bg-white/70 dark:bg-[#111111] p-5 shadow-sm backdrop-blur-md">
          <p className="text-xs font-bold uppercase tracking-wider text-[#4E404C] dark:text-[#A3A3A3]">Registered teams</p>
          <p className="mt-2 text-2xl font-black text-[#BE3477] dark:text-[#8B5CF6]">
            {readiness?.totalTeams ?? "—"}
          </p>
        </article>

        <article className="rounded-2xl border border-white/70 dark:border-[#292929] bg-white/70 dark:bg-[#111111] p-5 shadow-sm backdrop-blur-md">
          <p className="text-xs font-bold uppercase tracking-wider text-[#4E404C] dark:text-[#A3A3A3]">Ready teams</p>
          <p className="mt-2 text-2xl font-black text-emerald-800 dark:text-emerald-400">
            {readiness?.eligibleTeams ?? "—"}
          </p>
        </article>

        <article className="rounded-2xl border border-white/70 dark:border-[#292929] bg-white/70 dark:bg-[#111111] p-5 shadow-sm backdrop-blur-md">
          <p className="text-xs font-bold uppercase tracking-wider text-[#4E404C] dark:text-[#A3A3A3]">Readiness window</p>
          <p className="mt-2 text-2xl font-black text-[#302630] dark:text-[#FAFAFA]">
            {readiness?.readinessWindowSeconds ?? 30}s
          </p>
        </article>
      </div>

      <div className="mt-6 rounded-2xl border border-white/70 dark:border-[#292929] bg-white/70 dark:bg-[#111111] p-5 shadow-sm backdrop-blur-md sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[#302630] dark:text-[#FAFAFA]">Prestart readiness</h2>
            <p className="mt-0.5 text-xs text-[#4E404C] dark:text-[#A3A3A3]">
              Teams must accept the rules and check in within the last 30 seconds.
            </p>
          </div>
        </div>

        {loading && !readiness ? (
          <p className="mt-6 text-xs text-[#4E404C] dark:text-[#A3A3A3]">
            Loading team readiness...
          </p>
        ) : readiness && readiness.teams.length === 0 ? (
          <p className="mt-6 text-xs text-[#4E404C] dark:text-[#A3A3A3]">
            No teams have been registered yet.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-xl border border-[#E7DCE4] dark:border-[#292929] bg-white/80 dark:bg-[#111111]">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="border-b border-[#E7DCE4] dark:border-[#292929] bg-[#F1E9EF]/80 dark:bg-[#171717] text-[#4E404C] dark:text-[#A3A3A3]">
                <tr>
                  <th className="px-3.5 py-3 font-bold uppercase tracking-wider">Team</th>
                  <th className="px-3.5 py-3 font-bold uppercase tracking-wider">Participants</th>
                  <th className="px-3.5 py-3 font-bold uppercase tracking-wider">Rules accepted</th>
                  <th className="px-3.5 py-3 font-bold uppercase tracking-wider">Last seen</th>
                  <th className="px-3.5 py-3 font-bold uppercase tracking-wider">Readiness</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#E7DCE4] dark:divide-[#292929] bg-white/60 dark:bg-[#111111]">
                {readiness?.teams.map((team) => (
                  <tr key={team.id} className="hover:bg-[#FCE7F1]/20 dark:hover:bg-[#202020]">
                    <td className="px-3.5 py-3 font-bold text-[#302630] dark:text-[#FAFAFA]">{team.name}</td>
                    <td className="px-3.5 py-3 font-semibold text-[#4E404C] dark:text-[#A3A3A3]">{team.participantCount}</td>
                    <td className="px-3.5 py-3">
                      {team.rulesAccepted ? (
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">✓ Accepted</span>
                      ) : (
                        <span className="text-[#4E404C] dark:text-[#A3A3A3]">Pending</span>
                      )}
                    </td>
                    <td className="px-3.5 py-3 text-[#4E404C] dark:text-[#A3A3A3]">
                      {formatLastSeen(team.lastSeenAt)}
                    </td>
                    <td className="px-3.5 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-2xs font-bold ${
                          team.ready
                            ? "border border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400"
                            : "border border-[#E7DCE4] dark:border-[#292929] bg-[#F1E9EF] dark:bg-[#171717] text-[#4E404C] dark:text-[#A3A3A3]"
                        }`}
                      >
                        {team.ready ? "✓ Ready" : "○ Not ready"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={pendingQuizAction === "start"}
        title="Start Synchronized Quiz"
        description="Start the quiz? The eligible team roster and question list will be frozen."
        confirmLabel="Start Quiz Now"
        cancelLabel="Cancel"
        onConfirm={() => void executeStartQuiz()}
        onCancel={() => setPendingQuizAction(null)}
      />

      <ConfirmDialog
        isOpen={pendingQuizAction === "skip"}
        title="Skip Current Question"
        description="Skip the current question and move to the next one for all teams?"
        confirmLabel="Skip Question"
        cancelLabel="Cancel"
        onConfirm={() => void executeQuizAction("skip")}
        onCancel={() => setPendingQuizAction(null)}
      />

      <ConfirmDialog
        isOpen={pendingQuizAction === "end"}
        title="End Quiz"
        description="End the quiz now? Participants will no longer be able to answer."
        confirmLabel="End Quiz Now"
        cancelLabel="Cancel"
        isDestructive
        onConfirm={() => void executeQuizAction("end")}
        onCancel={() => setPendingQuizAction(null)}
      />

      <ConfirmDialog
        isOpen={pendingQuizAction === "reset-practice"}
        title="Reset Practice Run"
        description="Reset practice? All quiz responses will be deleted, the roster cleared, and team quiz states reset."
        confirmLabel="Reset Practice"
        cancelLabel="Cancel"
        isDestructive
        onConfirm={() => void executeQuizAction("reset-practice")}
        onCancel={() => setPendingQuizAction(null)}
      />
    </section>
  );
}
