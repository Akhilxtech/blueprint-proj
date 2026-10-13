
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Phase =
  | "NOT_STARTED"
  | "COUNTDOWN"
  | "QUESTION"
  | "GAP"
  | "PAUSED"
  | "ENDED";

type Slot = {
  position: number;
  questionId: string;
  text: string;
  type: string;
  marks: number;
  durationMs: number;
  gapMs: number;
  options: {
    id: string;
    label: string;
    content: string;
    isCorrect: boolean;
  }[];
};

type Team = {
  id: string;
  name: string;
  participantCount?: number;
  members?: { id: string; name: string; email: string }[];
  ready: boolean;
  onRoster: boolean;
  quizStatus: "ACTIVE" | "ELIMINATED";
  warningCount: number;
};

type Snapshot = {
  serverNow: number | string;
  run: {
    status: "NOT_STARTED" | "RUNNING" | "PAUSED" | "ENDED";
    startedAt: string | null;
    endedAt: string | null;
  } | null;
  phase: Phase;
  clock: {
    phase: Phase;
    index: number;
    questionStartAtMs: number | null;
    questionEndAtMs: number | null;
    remainingMs: number;
    msUntilStart: number;
  };
  totalQuestions: number;
  currentQuestion: {
    id: string;
    position: number;
    text: string;
    type: string;
    marks: number;
    durationMs: number;
    gapMs: number;
  } | null;
  answerStats: {
    answered: number;
    eligibleTeams: number;
    distribution: { optionId: string; label: string; count: number }[];
  };
  teamsReady: number;
  teamsOnRoster: number;
  eliminatedTeams: number;
  maxWarnings: number;
  teams: Team[];
  slots: Slot[];
};

type PrestartTeam = {
  id: string;
  name: string;
  participantCount: number;
  rulesAccepted: boolean;
  lastSeenAt: string | null;
  quizStatus: "ACTIVE" | "ELIMINATED";
  ready: boolean;
};

type Prestart = {
  serverNow: string;
  readinessWindowSeconds: number;
  totalTeams: number;
  eligibleTeams: number;
  teams: PrestartTeam[];
};

const panel =
  "rounded-2xl border border-white/10 bg-zinc-900 p-5";
const button =
  "rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40";
const secondaryButton =
  `${button} border border-white/15 hover:bg-white/10`;
const primaryButton =
  `${button} bg-pink-600 text-white hover:bg-pink-500`;
const dangerButton =
  `${button} bg-red-600 text-white hover:bg-red-500`;

function formatTime(ms: number) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remainder,
  ).padStart(2, "0")}`;
}

function formatDate(value: string | null) {
  if (!value) return "Not available";

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not available"
    : date.toLocaleTimeString();
}

function phaseLabel(phase: Phase) {
  const labels: Record<Phase, string> = {
    NOT_STARTED: "Not started",
    COUNTDOWN: "Starting soon",
    QUESTION: "Question in progress",
    GAP: "Between questions",
    PAUSED: "Paused",
    ENDED: "Quiz ended",
  };

  return labels[phase];
}

export default function QuizControlRoom() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [prestart, setPrestart] = useState<Prestart | null>(null);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetText, setResetText] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [clientNow, setClientNow] = useState(0);
  const [serverOffset, setServerOffset] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/quiz/snapshot", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Could not load the quiz snapshot.");
      }

      const data: Snapshot = await response.json();
      const receivedAt = Date.now();

      setSnapshot(data);
      setServerOffset(
        new Date(data.serverNow).getTime() - receivedAt,
      );
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not load the quiz snapshot.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
useEffect(() => {
  const initialRefresh = window.setTimeout(() => {
    void refresh();
  }, 0);

  const poll = window.setInterval(() => {
    void refresh();
  }, 2000);

  const tick = window.setInterval(() => {
    setClientNow(Date.now());
  }, 250);

  return () => {
    window.clearTimeout(initialRefresh);
    window.clearInterval(poll);
    window.clearInterval(tick);
  };
}, [refresh]);

const phase = snapshot?.clock.phase ?? "NOT_STARTED";
const status = snapshot?.run?.status ?? "NOT_STARTED";
const clock = snapshot?.clock;

// Database status determines which lifecycle actions are valid.
// Clock phase determines the displayed question and timer.
const effectiveStatus = status;

  
const remainingMs = useMemo(() => {
  if (!snapshot || !clock) return 0;

  const estimatedServerNow = clientNow + serverOffset;
  const snapshotServerNow = new Date(snapshot.serverNow).getTime();

  if (!Number.isFinite(snapshotServerNow)) return 0;

  const elapsedSinceSnapshot = Math.max(
    0,
    estimatedServerNow - snapshotServerNow,
  );

  switch (clock.phase) {
    case "COUNTDOWN":
      return Math.max(
        0,
        clock.msUntilStart - elapsedSinceSnapshot,
      );

    case "QUESTION":
      if (clock.questionEndAtMs === null) return 0;

      return Math.max(
        0,
        clock.questionEndAtMs - estimatedServerNow,
      );

    case "GAP":
      return Math.max(
        0,
        clock.remainingMs - elapsedSinceSnapshot,
      );

    case "PAUSED":
      return clock.remainingMs;

    default:
      return 0;
  }
}, [snapshot, clock, clientNow, serverOffset]);


  const currentSlot = useMemo(() => {
  if (!snapshot || !clock) return null;

  if (clock.index >= 0) {
    return snapshot.slots[clock.index] ?? null;
  }

  if (phase === "ENDED" && snapshot.slots.length > 0) {
    return snapshot.slots[snapshot.slots.length - 1] ?? null;
  }

  return null;
}, [snapshot, clock, phase]);

  const timetable = useMemo(() => {
    if (!snapshot) return [];

    let offset = 0;

    return snapshot.slots.map((slot, index) => {
      const item = {
        ...slot,
        startOffset: offset,
        endOffset: offset + slot.durationMs,
        isCurrent: clock?.index === index,
      };

      offset += slot.durationMs + slot.gapMs;
      return item;
    });
  }, [snapshot, clock?.index]);

  async function loadPrestart() {
    setError("");

    try {
      const response = await fetch("/api/admin/quiz/prestart", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Could not load team readiness.");
      }

      setPrestart(data);
      setShowStartDialog(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not load team readiness.",
      );
    }
  }

  async function performAction(
    action: "start" | "pause" | "resume" | "skip" | "end" | "reset-practice",
  ) {
    setActionLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/admin/quiz/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? `Could not ${action} the quiz.`);
      }

      setMessage(
        action === "start"
          ? "Quiz started. The synchronized countdown is active."
          : action === "pause"
            ? "Quiz paused."
            : action === "resume"
              ? "Quiz resumed."
              : action === "skip"
                ? "Question skipped."
                : action === "end"
                  ? "Quiz ended."
                  : "Practice run reset.",
      );

      setShowStartDialog(false);
      setShowResetDialog(false);
      setResetText("");

      await refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : `Could not ${action} the quiz.`,
      );
    } finally {
      setActionLoading(false);
    }
  }

  function confirmSkip() {
    if (window.confirm("Skip the current question for every team?")) {
      void performAction("skip");
    }
  }

  function confirmEnd() {
    if (
      window.confirm(
        "End the quiz for all teams now? This cannot be undone.",
      )
    ) {
      void performAction("end");
    }
  }

  const hasCurrentQuestion =
    phase === "QUESTION" || phase === "GAP";

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-pink-400">
            Administration
          </p>
          <h1 className="mt-2 text-3xl font-bold">Quiz Control Room</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Manage the synchronized quiz and monitor live progress.
          </p>
        </div>

       <button
  type="button"
  className={secondaryButton}
  onClick={() => {
    setRefreshing(true);
    void refresh().finally(() => setRefreshing(false));
  }}
  disabled={refreshing}
>
  {refreshing ? "Refreshing..." : "Refresh now"}
</button>
      </header>

      {effectiveStatus === "RUNNING" && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200"
        >
          <span aria-hidden="true">●</span>
          The quiz is running. Live data refreshes every 2 seconds.
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
        >
          {error}
        </div>
      )}

      {message && (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300"
        >
          {message}
        </div>
      )}

      <div className={panel}>
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-sm text-zinc-400">Current phase</p>
            <h2 className="mt-2 text-2xl font-semibold">
              {phaseLabel(phase)}
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              {currentSlot
                ? `Question ${clock!.index + 1} of ${snapshot?.totalQuestions}`
                : `${snapshot?.totalQuestions ?? 0} questions configured`}
            </p>
          </div>

          <div className="min-w-44 rounded-xl border border-white/10 bg-black/20 p-4 text-center">
            <p className="text-xs uppercase tracking-wider text-zinc-400">
              {phase === "COUNTDOWN" ? "Starts in" : "Time remaining"}
            </p>
            <p className="mt-2 font-mono text-4xl font-bold tabular-nums">
              {formatTime(remainingMs)}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 p-4">
            <p className="text-sm text-zinc-400">Answers locked</p>
            <p className="mt-2 text-2xl font-semibold">
              {snapshot?.answerStats.answered ?? 0}
              <span className="text-base text-zinc-500">
                {" "}
                / {snapshot?.answerStats.eligibleTeams ?? 0}
              </span>
            </p>
          </div>

          <div className="rounded-xl border border-white/10 p-4">
            <p className="text-sm text-zinc-400">Teams on roster</p>
            <p className="mt-2 text-2xl font-semibold">
              {snapshot?.teamsOnRoster ?? 0}
            </p>
          </div>

          <div className="rounded-xl border border-white/10 p-4">
            <p className="text-sm text-zinc-400">Teams eliminated</p>
            <p className="mt-2 text-2xl font-semibold">
              {snapshot?.eliminatedTeams ?? 0}
            </p>
          </div>
        </div>


<div className="mt-6 flex flex-wrap gap-3">
  {effectiveStatus === "NOT_STARTED" && (
    <button
      type="button"
      className={primaryButton}
      onClick={() => void loadPrestart()}
      disabled={actionLoading}
    >
      Start quiz
    </button>
  )}

  {effectiveStatus === "RUNNING"&& (
    <button
      type="button"
      className={`${button} bg-amber-500 text-black hover:bg-amber-400`}
      onClick={() => void performAction("pause")}
      disabled={actionLoading}
    >
      Pause
    </button>
  )}

  {effectiveStatus === "PAUSED" && (
    <button
      type="button"
      className={`${button} bg-emerald-600 text-white hover:bg-emerald-500`}
      onClick={() => void performAction("resume")}
      disabled={actionLoading}
    >
      Resume
    </button>
  )}
{(effectiveStatus === "RUNNING" || effectiveStatus === "PAUSED") && (
      <button
        type="button"
        className={secondaryButton}
        onClick={confirmSkip}
        disabled={actionLoading}
      >
        Skip question
      </button>
    )}

  {(effectiveStatus === "RUNNING" ||
    effectiveStatus === "PAUSED") && (
    <button
      type="button"
      className={dangerButton}
      onClick={confirmEnd}
      disabled={actionLoading}
    >
      End quiz
    </button>
  )}

  {effectiveStatus === "ENDED" && (
    <button
      type="button"
      className={dangerButton}
      onClick={() => {
        setError("");
        setResetText("");
        setShowResetDialog(true);
      }}
      disabled={actionLoading}
    >
      Reset practice run
    </button>
  )}
</div>

      </div>

      <div className={panel}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Option distribution</h2>
            <p className="mt-1 text-sm text-zinc-400">
              {hasCurrentQuestion
                ? "Answer counts for the current question."
                : "Distribution appears while a question is active."}
            </p>
          </div>
          {currentSlot && (
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300">
              {currentSlot.type}
            </span>
          )}
        </div>

        {currentSlot && snapshot ? (
          <div className="mt-5 space-y-4">
            {snapshot.answerStats.distribution.map((option) => {
              const total = snapshot.answerStats.answered;
              const percent =
                total > 0 ? (option.count / total) * 100 : 0;

              return (
                <div key={option.optionId}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                    <span className="text-zinc-200">
                      Option {option.label}
                    </span>
                    <span className="tabular-nums text-zinc-400">
                      {option.count} {option.count === 1 ? "answer" : "answers"}
                    </span>
                  </div>
                  <div
                    className="h-3 overflow-hidden rounded-full bg-white/10"
                    role="img"
                    aria-label={`Option ${option.label}: ${option.count} answers`}
                  >
                    <div
                      className="h-full rounded-full bg-pink-500 transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-5 rounded-lg bg-black/20 p-4 text-sm text-zinc-400">
            No active question to display.
          </p>
        )}
      </div>

      <div className={panel}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Question timetable</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Timings use the saved quiz snapshot, not current question settings.
            </p>
          </div>
          <p className="text-sm text-zinc-400">
            {snapshot?.totalQuestions ?? 0} questions
          </p>
        </div>

        {timetable.length === 0 ? (
          <p className="mt-5 text-sm text-zinc-400">
            Start a quiz to create its timetable.
          </p>
        ) : (
          <ol className="mt-5 space-y-3">
            {timetable.map((slot, index) => (
              <li
                key={slot.questionId}
                className={`relative rounded-xl border p-4 ${
                  slot.isCurrent
                    ? "border-pink-500/50 bg-pink-500/10"
                    : "border-white/10 bg-black/10"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium">
                        Question {index + 1}
                        {slot.isCurrent && (
                          <span className="ml-2 text-xs font-semibold text-pink-300">
                            ← NOW
                          </span>
                        )}
                      </p>
                      <p className="mt-1 text-sm text-zinc-400">
                        {slot.type} · {slot.durationMs / 1000}s ·{" "}
                        {slot.marks} marks
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-medium">
                      Starts at {formatTime(slot.startOffset)}
                    </p>
                    <p className="mt-1 text-zinc-400">
                      Gap after: {slot.gapMs / 1000}s
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}

        {timetable.length > 0 && (
          <p className="mt-4 text-sm text-zinc-400">
            Total timeline:{" "}
            {formatTime(
              timetable.reduce(
                (total, slot) => total + slot.durationMs + slot.gapMs,
                0,
              ),
            )}
          </p>
        )}
      </div>

      {showStartDialog && prestart && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowStartDialog(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="start-dialog-title"
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl"
          >
            <h2 id="start-dialog-title" className="text-xl font-bold">
              Review team readiness
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Only teams that accepted the rules and checked in within the
              last 30 seconds will be included in the roster.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-emerald-500/30 p-4">
                <p className="text-sm text-zinc-400">Ready teams</p>
                <p className="mt-1 text-2xl font-semibold text-emerald-300">
                  {prestart.eligibleTeams}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 p-4">
                <p className="text-sm text-zinc-400">Not ready</p>
                <p className="mt-1 text-2xl font-semibold">
                  {prestart.totalTeams - prestart.eligibleTeams}
                </p>
              </div>
            </div>

            <div className="mt-5 max-h-72 overflow-y-auto rounded-xl border border-white/10">
              {prestart.teams.map((team) => (
                <div
                  key={team.id}
                  className="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-3 last:border-0"
                >
                  <div>
                    <p className="font-medium">{team.name}</p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {team.participantCount} members ·{" "}
                      {team.rulesAccepted
                        ? "Rules accepted"
                        : "Rules not accepted"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs ${
                      team.ready
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-zinc-700 text-zinc-300"
                    }`}
                  >
                    {team.ready ? "✓ Ready" : "○ Not ready"}
                  </span>
                </div>
              ))}
            </div>

            <p className="mt-5 text-sm text-zinc-300">
              Starting will freeze the roster and question order. The quiz
              clock will begin in 10 seconds.
            </p>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                className={secondaryButton}
                onClick={() => setShowStartDialog(false)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className={primaryButton}
                onClick={() => void performAction("start")}
                disabled={actionLoading || prestart.eligibleTeams === 0}
              >
                {actionLoading ? "Starting..." : "Start in 10 seconds"}
              </button>
            </div>
          </section>
        </div>
      )}

      {showResetDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-dialog-title"
            className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl"
          >
            <h2 id="reset-dialog-title" className="text-xl font-bold">
              Reset practice run?
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              This deletes recorded answers and roster entries and resets
              team warnings and elimination status. This cannot be undone.
            </p>

            <label
              htmlFor="reset-confirmation"
              className="mt-5 block text-sm font-medium"
            >
              Type RESET to confirm

{error && (
  <div
    role="alert"
    className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
  >
    {error}
  </div>
)}

            </label>
            <input
              id="reset-confirmation"
              value={resetText}
              onChange={(event) => setResetText(event.target.value)}
              autoComplete="off"
              className="mt-2 w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2 outline-none focus:border-pink-500"
              placeholder="RESET"
            />

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className={secondaryButton}
                onClick={() => {
                  setShowResetDialog(false);
                  setResetText("");
                }}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className={dangerButton}
                disabled={actionLoading || resetText !== "RESET"}
                onClick={() => void performAction("reset-practice")}
              >
                {actionLoading ? "Resetting..." : "Reset practice"}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
