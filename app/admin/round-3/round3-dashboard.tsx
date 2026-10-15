"use client";

import { useCallback, useEffect, useState } from "react";
import StatementsManager from "./statements-manager";
import TeamsManager from "./teams-manager";
import ConfirmDialog from "@/components/confirm-dialog";

type WindowInfo = {
  isOpen: boolean;
  durationMinutes: number;
  deadline: string | null;
};

type WindowName = "selection" | "submission";

type WindowsResponse = {
  selection: WindowInfo;
  submission: WindowInfo;
};

type DialogState = {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
};

function formatDeadline(deadline: string | null) {
  if (!deadline) return "Not scheduled";

  return new Date(deadline).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function remainingTime(
  deadline: string | null,
  isOpen: boolean,
) {
  if (!isOpen) return "Window closed";
  if (!deadline) return "Not scheduled";

  const seconds = Math.max(
    0,
    Math.floor((Date.parse(deadline) - Date.now()) / 1000),
  );

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export default function Round3Dashboard() {
  const [windows, setWindows] = useState<WindowsResponse | null>(null);

  const [durations, setDurations] = useState<Record<WindowName, string>>({
    selection: "60",
    submission: "60",
  });

  const [editingDuration, setEditingDuration] =
    useState<WindowName | null>(null);

  const [adjustments, setAdjustments] = useState<Record<WindowName, string>>({
    selection: "5",
    submission: "5",
  });

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<WindowName | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [, setClock] = useState(0);

  const [confirmState, setConfirmState] = useState<DialogState>({
    open: false,
    title: "",
    description: null,
    confirmLabel: "Confirm",
    onConfirm: () => {},
  });

  const loadWindows = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/round3/windows", {
        cache: "no-store",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Could not load window settings.");
      }

      const values = result as WindowsResponse;

      setWindows(values);

      // Preserve the input currently being edited.
      // Polling must not overwrite what the admin is typing.
      setDurations((current) => ({
        selection:
          editingDuration === "selection"
            ? current.selection
            : String(values.selection.durationMinutes),
        submission:
          editingDuration === "submission"
            ? current.submission
            : String(values.submission.durationMinutes),
      }));

      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load settings.",
      );
    } finally {
      setLoading(false);
    }
  }, [editingDuration]);

  useEffect(() => {
    const initial = window.setTimeout(() => void loadWindows(), 0);
    const poll = window.setInterval(() => void loadWindows(), 5000);
    const clock = window.setInterval(
      () => setClock((value) => value + 1),
      1000,
    );

    return () => {
      window.clearTimeout(initial);
      window.clearInterval(poll);
      window.clearInterval(clock);
    };
  }, [loadWindows]);

  async function performAction(
    name: WindowName,
    action: "open" | "close" | "setDuration" | "adjustTime",
    extra: Record<string, unknown> = {},
  ) {
    setBusy(name);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/round3/windows", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, action, ...extra }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Could not update window.");
      }

      if (action === "setDuration") {
        setEditingDuration((current) => (current === name ? null : current));
      }

      setMessage(
        `${name === "selection" ? "Selection" : "Submission"} window updated.`,
      );

      await loadWindows();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update window.",
      );
    } finally {
      setBusy(null);
    }
  }

  function handleCloseWindow(name: WindowName, title: string) {
    setConfirmState({
      open: true,
      title: `Close ${title}`,
      description: `Close the ${title.toLowerCase()} now? Teams will no longer be able to make changes.`,
      confirmLabel: "Close Window",
      destructive: true,
      onConfirm: () => {
        setConfirmState((prev) => ({ ...prev, open: false }));
        void performAction(name, "close");
      },
    });
  }

  function renderWindow(name: WindowName, title: string) {
    const info = windows?.[name];

    return (
      <section className="glass-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-light pb-4">
          <h2 className="text-xl font-bold tracking-tight text-foreground">{title}</h2>

          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
              info?.isOpen
                ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border border-neutral-light bg-neutral-100 text-muted"
            }`}
          >
            {info?.isOpen ? "● Open" : "○ Closed"}
          </span>
        </div>

        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Configured Duration (Minutes)
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <input
              type="number"
              min={1}
              max={1440}
              value={durations[name]}
              onFocus={() => setEditingDuration(name)}
              onBlur={() =>
                setEditingDuration((current) =>
                  current === name ? null : current,
                )
              }
              onChange={(event) =>
                setDurations((current) => ({
                  ...current,
                  [name]: event.target.value,
                }))
              }
              className="w-32 rounded-xl border border-neutral-light bg-white px-3.5 py-2 text-sm font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              aria-label={`${title} duration in minutes`}
            />

            <button
              type="button"
              disabled={busy !== null}
              onClick={() => {
                const value = Number(durations[name]);

                if (
                  !Number.isInteger(value) ||
                  value < 1 ||
                  value > 1440
                ) {
                  setError("Duration must be between 1 and 1440 minutes.");
                  return;
                }

                void performAction(name, "setDuration", {
                  durationMinutes: value,
                });
              }}
              className="rounded-xl border border-neutral-light bg-white px-4 py-2 text-sm font-semibold text-foreground shadow-2xs transition hover:bg-neutral-50 active:scale-[0.98] disabled:opacity-50"
            >
              Save duration
            </button>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-neutral-light bg-[#FAF7F9] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Deadline
          </p>
          <p className="mt-1 font-semibold text-foreground">
            {formatDeadline(info?.deadline ?? null)}
          </p>

          <p className="mt-3.5 text-xs font-semibold uppercase tracking-wider text-muted">
            Remaining Time
          </p>
          <p className="mt-1 font-mono text-2xl sm:text-3xl font-extrabold tracking-tight text-primary">
            {remainingTime(info?.deadline ?? null, info?.isOpen ?? false)}
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          {info?.isOpen ? (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => handleCloseWindow(name, title)}
              className="rounded-xl border border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-red-700 shadow-2xs transition hover:bg-red-50 active:scale-[0.98] disabled:opacity-50"
            >
              Close window
            </button>
          ) : (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => {
                const value = Number(durations[name]);

                if (
                  !Number.isInteger(value) ||
                  value < 1 ||
                  value > 1440
                ) {
                  setError("Duration must be between 1 and 1440 minutes.");
                  return;
                }

                void performAction(name, "open", {
                  durationMinutes: value,
                });
              }}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover active:scale-[0.98] disabled:opacity-50"
            >
              Open window
            </button>
          )}
        </div>

        <div className="mt-5 border-t border-neutral-light pt-5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted">
            Adjust Remaining Time in Minutes
          </label>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <input
              type="number"
              min={-1440}
              max={1440}
              value={adjustments[name]}
              onChange={(event) =>
                setAdjustments((current) => ({
                  ...current,
                  [name]: event.target.value,
                }))
              }
              className="w-32 rounded-xl border border-neutral-light bg-white px-3.5 py-2 text-sm font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              aria-label={`${title} time adjustment`}
            />

            <button
              type="button"
              disabled={busy !== null || !info?.isOpen}
              onClick={() => {
                const minutes = Number(adjustments[name]);

                if (
                  !Number.isInteger(minutes) ||
                  minutes === 0 ||
                  Math.abs(minutes) > 1440
                ) {
                  setError(
                    "Enter a non-zero adjustment between -1440 and 1440.",
                  );
                  return;
                }

                void performAction(name, "adjustTime", { minutes });
              }}
              className="rounded-xl border border-neutral-light bg-white px-4 py-2 text-sm font-semibold text-foreground shadow-2xs transition hover:bg-neutral-50 active:scale-[0.98] disabled:opacity-50"
            >
              Apply adjustment
            </button>
          </div>

          <p className="mt-2 text-xs text-muted">
            Positive values extend the window. Negative values reduce the remaining time.
          </p>
        </div>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Administration
        </p>

        <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Round 3 Control Room
        </h1>

        <p className="mt-1 text-sm text-muted max-w-3xl">
          Manage problem statement selection and deployment submission windows independently. Window changes are enforced server-side in real time.
        </p>
      </header>

      {/* Error & Status Alerts */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-center justify-between"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            className="text-xs font-semibold text-red-700 underline hover:no-underline ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {message && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          {message}
        </div>
      )}

      {/* Control Windows */}
      {loading && !windows ? (
        <div className="py-12 text-center text-sm text-muted">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mb-2" />
          <p>Loading Round 3 controls...</p>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          {renderWindow("selection", "Problem Selection")}
          {renderWindow("submission", "Deployment Submission")}
        </div>
      )}

      {/* Statements Manager */}
      <StatementsManager />

      {/* Teams Manager */}
      <TeamsManager />

      {/* Confirmation Modal */}
      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        confirmLabel={confirmState.confirmLabel}
        destructive={confirmState.destructive}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
