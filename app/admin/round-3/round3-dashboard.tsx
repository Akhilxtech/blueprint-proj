
"use client";

import { useCallback, useEffect, useState } from "react";
import StatementsManager from "./statements-manager";
import TeamsManager from "./teams-manager";

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
        // Release the editing lock after a successful save.
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

  function renderWindow(name: WindowName, title: string) {
    const info = windows?.[name];

    return (
      <section className="rounded-2xl border border-white/10 bg-zinc-900 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">{title}</h2>

          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              info?.isOpen
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-zinc-800 text-zinc-400"
            }`}
          >
            {info?.isOpen ? "Open" : "Closed"}
          </span>
        </div>

        <p className="mt-4 text-sm text-zinc-400">Configured duration</p>

        <div className="mt-2 flex flex-wrap gap-3">
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
            className="w-32 rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm"
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
            className="rounded-lg border border-white/10 px-4 py-2 text-sm hover:bg-white/5 disabled:opacity-50"
          >
            Save duration
          </button>
        </div>

        <div className="mt-5 rounded-xl border border-white/10 bg-zinc-950 p-4">
          <p className="text-sm text-zinc-400">Deadline</p>
          <p className="mt-1 font-medium">
            {formatDeadline(info?.deadline ?? null)}
          </p>

          <p className="mt-3 text-sm text-zinc-400">Remaining time</p>
          <p className="mt-1 font-mono text-2xl font-semibold">
           {remainingTime(info?.deadline ?? null, info?.isOpen ?? false)}
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          {info?.isOpen ? (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => {
                if (
                  window.confirm(`Close the ${title.toLowerCase()} now?`)
                ) {
                  void performAction(name, "close");
                }
              }}
              className="rounded-lg border border-red-500/30 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-50"
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
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold hover:bg-violet-500 disabled:opacity-50"
            >
              Open window
            </button>
          )}
        </div>

        <div className="mt-5 border-t border-white/10 pt-5">
          <label className="text-sm text-zinc-400">
            Adjust remaining time in minutes
          </label>

          <div className="mt-2 flex flex-wrap gap-3">
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
              className="w-32 rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm"
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
              className="rounded-lg border border-white/10 px-4 py-2 text-sm hover:bg-white/5 disabled:opacity-50"
            >
              Apply adjustment
            </button>
          </div>

          <p className="mt-2 text-xs text-zinc-500">
            Positive values extend the window. Negative values reduce the time.
          </p>
        </div>
      </section>
    );
  }

  return (
    <div>
      <p className="text-sm font-medium uppercase tracking-widest text-violet-400">
        Administration
      </p>

      <h1 className="mt-3 text-3xl font-bold">Round 3 Control Room</h1>

      <p className="mt-3 max-w-3xl leading-7 text-zinc-400">
        Manage problem selection and deployment submission independently.
        Window changes are enforced by the server.
      </p>

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
        >
          {error}
          <button
            type="button"
            onClick={() => setError("")}
            className="ml-3 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {message && (
        <p role="status" className="mt-4 text-sm text-emerald-400">
          {message}
        </p>
      )}

      {loading && !windows ? (
        <p className="mt-8 text-zinc-400">Loading Round 3 controls...</p>
      ) : (
        <div className="mt-8 grid gap-6 xl:grid-cols-2">
          {renderWindow("selection", "Problem selection")}
          {renderWindow("submission", "Deployment submission")}
        </div>
      )}

<StatementsManager />
<TeamsManager />    </div>
  );
}
