
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Team = {
  id: string;
  name: string;
  ready: boolean;
  onRoster: boolean;
  quizStatus: "ACTIVE" | "ELIMINATED";
  warningCount: number;
  members: { id: string; name: string; email: string }[];
  totalAnswered: number;
  correctSoFar: number;
  totalCorrectMs: number;
  answeredCurrentQuestion: boolean;
};

type Snapshot = {
  phase: string;
  run: { status: string } | null;
  totalQuestions: number;
  currentQuestion: { position: number } | null;
  teamsReady: number;
  teamsOnRoster: number;
  eliminatedTeams: number;
  maxWarnings: number;
  teams: Team[];
};

type StatusFilter =
  | "ALL"
  | "READY"
  | "NOT_READY"
  | "ROSTER"
  | "ACTIVE"
  | "ELIMINATED";

const panel =
  "rounded-2xl border border-white/10 bg-zinc-900 p-5";

const button =
  "rounded-lg border border-white/15 px-3 py-2 text-sm font-medium transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40";

function formatDuration(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;

  return `${minutes}m ${String(remainder).padStart(2, "0")}s`;
}

export default function MonitorDashboard() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [loading, setLoading] = useState(true);
  const [busyTeam, setBusyTeam] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/quiz/snapshot", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Could not load live team data.");
      }

      setSnapshot(await response.json());
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not load live team data.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

 useEffect(() => {
  const initialRefresh = window.setTimeout(() => {
    void refresh();
  }, 0);

  const interval = window.setInterval(() => {
    void refresh();
  }, 2000);

  return () => {
    window.clearTimeout(initialRefresh);
    window.clearInterval(interval);
  };
}, [refresh]);

  async function teamAction(
    teamId: string,
    action: "restore" | "warnings",
    delta?: 1 | -1,
  ) {
    setBusyTeam(teamId);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        action === "restore"
          ? `/api/admin/teams/${teamId}/restore`
          : `/api/admin/teams/${teamId}/warnings`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          ...(action === "warnings"
            ? { body: JSON.stringify({ delta }) }
            : {}),
          cache: "no-store",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Team action failed.");
      }

      setMessage(
        action === "restore"
          ? "Team restored and its warnings reset."
          : delta === 1
            ? "One warning added."
            : "One warning removed.",
      );

      await refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Team action failed.",
      );
    } finally {
      setBusyTeam(null);
    }
  }

  const teams = useMemo(() => {
    if (!snapshot) return [];

    const query = search.trim().toLowerCase();

    return snapshot.teams.filter((team) => {
      const matchesSearch =
        !query ||
        team.name.toLowerCase().includes(query) ||
        team.members.some(
          (member) =>
            member.name.toLowerCase().includes(query) ||
            member.email.toLowerCase().includes(query),
        );

      const matchesFilter =
        filter === "ALL" ||
        (filter === "READY" && team.ready) ||
        (filter === "NOT_READY" && !team.ready) ||
        (filter === "ROSTER" && team.onRoster) ||
        (filter === "ACTIVE" && team.quizStatus === "ACTIVE") ||
        (filter === "ELIMINATED" &&
          team.quizStatus === "ELIMINATED");

      return matchesSearch && matchesFilter;
    });
  }, [snapshot, search, filter]);

 const answeredCurrent =
  snapshot?.phase === "QUESTION"
    ? snapshot.teams.filter(
        (team) =>
          team.onRoster && team.answeredCurrentQuestion,
      ).length
    : 0;

  const counterCards = [
    {
      label: "Teams ready",
      value: snapshot?.teamsReady ?? 0,
      detail: "Seen in the last 30 seconds",
    },
    {
      label: "Teams on roster",
      value: snapshot?.teamsOnRoster ?? 0,
      detail: "Included when the quiz started",
    },
    {
      label: "Answered current question",
      value: answeredCurrent,
      detail:
  snapshot?.phase === "ENDED"
    ? "Quiz ended"
    : snapshot?.currentQuestion
      ? `Question ${snapshot.currentQuestion.position}`
      : "No active question",
    },
    {
      label: "Eliminated",
      value: snapshot?.eliminatedTeams ?? 0,
      detail: "Teams with locked quiz access",
    },
  ];

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-pink-400">
            Administration
          </p>
          <h1 className="mt-2 text-3xl font-bold">Live Monitor</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Team readiness, answer progress and warning management.
          </p>
        </div>

        <button
          type="button"
          className={button}
          onClick={() => void refresh()}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh now"}
        </button>
      </header>

      {snapshot?.run?.status === "RUNNING" &&
  snapshot.phase !== "ENDED" && (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200"
        >
          ● Quiz running · Phase: {snapshot.phase} · Updates every 2 seconds
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {counterCards.map((card) => (
          <article key={card.label} className={panel}>
            <p className="text-sm text-zinc-400">{card.label}</p>
            <p className="mt-3 text-3xl font-bold tabular-nums">
              {card.value}
            </p>
            <p className="mt-2 text-xs text-zinc-500">{card.detail}</p>
          </article>
        ))}
      </div>

      <div className={panel}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Teams</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Showing {teams.length} of {snapshot?.teams.length ?? 0} teams.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search team or member..."
              aria-label="Search teams"
              className="min-w-56 rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm outline-none focus:border-pink-500"
            />

            <select
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value as StatusFilter)
              }
              aria-label="Filter teams"
              className="rounded-lg border border-white/15 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-pink-500"
            >
              <option value="ALL">All teams</option>
              <option value="READY">Ready</option>
              <option value="NOT_READY">Not ready</option>
              <option value="ROSTER">On roster</option>
              <option value="ACTIVE">Active</option>
              <option value="ELIMINATED">Eliminated</option>
            </select>
          </div>
        </div>

        {loading && !snapshot ? (
          <p className="py-10 text-center text-sm text-zinc-400">
            Loading teams...
          </p>
        ) : teams.length === 0 ? (
          <p className="py-10 text-center text-sm text-zinc-400">
            No teams match this search or filter.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[1250px] text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-zinc-400">
                <tr>
                  <th className="px-3 py-3">Team / members</th>
                  <th className="px-3 py-3">Ready</th>
                  <th className="px-3 py-3">Roster</th>
                  <th className="px-3 py-3">Current answer</th>
                  <th className="px-3 py-3">Total answered</th>
                  <th className="px-3 py-3">Correct</th>
                  <th className="px-3 py-3">Correct time</th>
                  <th className="px-3 py-3">Warnings</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5">
                {teams.map((team) => (
                  <tr key={team.id} className="align-top">
                    <td className="px-3 py-4">
                      <p className="font-semibold">{team.name}</p>
                      <div className="mt-2 space-y-1 text-xs text-zinc-400">
                        {team.members.map((member) => (
                          <p key={member.id}>
                            {member.name}
                            <span className="block text-zinc-500">
                              {member.email}
                            </span>
                          </p>
                        ))}
                      </div>
                    </td>

                    <td className="px-3 py-4">
                      {team.ready ? "✓ Ready" : "○ Not ready"}
                    </td>
                    <td className="px-3 py-4">
                      {team.onRoster ? "✓ Yes" : "○ No"}
                    </td>
                    <td className="px-3 py-4">
                      {team.answeredCurrentQuestion ? "✓ Answered" : "○ Waiting"}
                    </td>
                    <td className="px-3 py-4 tabular-nums">
                      {team.totalAnswered}
                    </td>
                    <td className="px-3 py-4 tabular-nums">
                      {team.correctSoFar}
                    </td>
                    <td className="px-3 py-4 tabular-nums">
                      {formatDuration(team.totalCorrectMs)}
                    </td>
                    <td className="px-3 py-4">
                      <span
                        className={
                          team.warningCount >= (snapshot?.maxWarnings ?? 3)
                            ? "font-semibold text-red-300"
                            : "text-zinc-200"
                        }
                      >
                        {team.warningCount}/{snapshot?.maxWarnings ?? 3}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      {team.quizStatus === "ELIMINATED"
                        ? "⛔ Eliminated"
                        : "✓ Active"}
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex min-w-36 flex-col gap-2">
                        {team.quizStatus === "ELIMINATED" && (
                          <button
                            type="button"
                            className={button}
                            disabled={busyTeam === team.id}
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Restore ${team.name} and reset its warnings?`,
                                )
                              ) {
                                void teamAction(team.id, "restore");
                              }
                            }}
                          >
                            Restore team
                          </button>
                        )}

                        <button
                          type="button"
                          className={button}
                          disabled={
                            busyTeam === team.id ||
                            team.warningCount >= (snapshot?.maxWarnings ?? 3)
                          }
                          onClick={() =>
                            void teamAction(team.id, "warnings", 1)
                          }
                        >
                          + Add warning
                        </button>

                        <button
                          type="button"
                          className={button}
                          disabled={busyTeam === team.id || team.warningCount <= 0}
                          onClick={() =>
                            void teamAction(team.id, "warnings", -1)
                          }
                        >
                          − Remove warning
                        </button>
                      </div>
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
