
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";

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
  "rounded-2xl border border-white/70 bg-white/70 p-5 shadow-sm backdrop-blur-md";

const button =
  "rounded-xl border border-[#E7DCE4] bg-white/80 px-3 py-1.5 text-xs font-semibold text-[#4E404C] hover:bg-white hover:text-[#302630] transition-colors disabled:cursor-not-allowed disabled:opacity-40 shadow-2xs";

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
  const [teamToRestore, setTeamToRestore] = useState<Team | null>(null);
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

  function handleConfirmRestoreTeam() {
    if (!teamToRestore) return;
    const targetId = teamToRestore.id;
    setTeamToRestore(null);
    void teamAction(targetId, "restore");
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
    <section className="mx-auto max-w-7xl space-y-6 animate-fade-in-up">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#BE3477]">
            Administration
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-[#302630] sm:text-3xl">
            Live Monitor
          </h1>
          <p className="mt-1 text-sm text-[#4E404C]">
            Team readiness, answer progress and warning management in real time.
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
            className="flex items-center gap-3 rounded-2xl border border-emerald-300 bg-emerald-50/90 p-4 text-xs font-bold text-emerald-800 backdrop-blur-xs"
          >
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-600 animate-pulse" aria-hidden="true" />
            Quiz running · Phase: {snapshot.phase} · Updates every 2 seconds
          </div>
        )}

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-300 bg-rose-50/90 p-4 text-xs font-semibold text-rose-800"
        >
          {error}
        </div>
      )}

      {message && (
        <div
          role="status"
          className="rounded-2xl border border-emerald-300 bg-emerald-50/90 p-4 text-xs font-semibold text-emerald-800"
        >
          {message}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {counterCards.map((card) => (
          <article key={card.label} className={panel}>
            <p className="text-xs font-bold uppercase tracking-wider text-[#4E404C]">{card.label}</p>
            <p className="mt-2 text-3xl font-black tabular-nums text-[#BE3477]">
              {card.value}
            </p>
            <p className="mt-1 text-2xs text-[#4E404C]">{card.detail}</p>
          </article>
        ))}
      </div>

      <div className={panel}>
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E7DCE4] pb-5">
          <div>
            <h2 className="text-base font-bold text-[#302630]">Teams</h2>
            <p className="mt-0.5 text-xs text-[#4E404C]">
              Showing {teams.length} of {snapshot?.teams.length ?? 0} teams.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search team or member..."
              aria-label="Search teams"
              className="min-w-56 rounded-xl border border-[#E7DCE4] bg-white px-3.5 py-2 text-xs text-[#302630] outline-none placeholder:text-[#4E404C]/60 focus:border-[#D9468D]"
            />

            <select
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value as StatusFilter)
              }
              aria-label="Filter teams"
              className="rounded-xl border border-[#E7DCE4] bg-white px-3.5 py-2 text-xs font-semibold text-[#302630] outline-none focus:border-[#D9468D]"
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
          <p className="py-10 text-center text-xs text-[#4E404C]">
            Loading teams...
          </p>
        ) : teams.length === 0 ? (
          <p className="py-10 text-center text-xs text-[#4E404C]">
            No teams match this search or filter.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-xl border border-[#E7DCE4] bg-white/80">
            <table className="w-full min-w-[1250px] text-left text-xs">
              <thead className="border-b border-[#E7DCE4] bg-[#F1E9EF]/80 text-[#4E404C]">
                <tr>
                  <th className="px-3.5 py-3 font-bold uppercase tracking-wider">Team / members</th>
                  <th className="px-3.5 py-3 font-bold uppercase tracking-wider">Ready</th>
                  <th className="px-3.5 py-3 font-bold uppercase tracking-wider">Roster</th>
                  <th className="px-3.5 py-3 font-bold uppercase tracking-wider">Current answer</th>
                  <th className="px-3.5 py-3 font-bold uppercase tracking-wider">Total answered</th>
                  <th className="px-3.5 py-3 font-bold uppercase tracking-wider">Correct</th>
                  <th className="px-3.5 py-3 font-bold uppercase tracking-wider">Correct time</th>
                  <th className="px-3.5 py-3 font-bold uppercase tracking-wider">Warnings</th>
                  <th className="px-3.5 py-3 font-bold uppercase tracking-wider">Status</th>
                  <th className="px-3.5 py-3 font-bold uppercase tracking-wider">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#E7DCE4] bg-white/60">
                {teams.map((team) => (
                  <tr key={team.id} className="align-top hover:bg-[#FCE7F1]/20">
                    <td className="px-3.5 py-3.5">
                      <p className="font-bold text-[#302630]">{team.name}</p>
                      <div className="mt-1.5 space-y-1 text-2xs text-[#4E404C]">
                        {team.members.map((member) => (
                          <p key={member.id}>
                            <span className="font-semibold text-[#302630]">{member.name}</span>
                            <span className="block text-[#4E404C]/80">
                              {member.email}
                            </span>
                          </p>
                        ))}
                      </div>
                    </td>

                    <td className="px-3.5 py-3.5">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-2xs font-bold ${
                          team.ready
                            ? "border border-emerald-300 bg-emerald-50 text-emerald-800"
                            : "border border-[#E7DCE4] bg-[#F1E9EF] text-[#4E404C]"
                        }`}
                      >
                        {team.ready ? "✓ Ready" : "○ Not ready"}
                      </span>
                    </td>
                    <td className="px-3.5 py-3.5 font-semibold text-[#4E404C]">
                      {team.onRoster ? "✓ Yes" : "○ No"}
                    </td>
                    <td className="px-3.5 py-3.5">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-2xs font-bold ${
                          team.answeredCurrentQuestion
                            ? "border border-emerald-300 bg-emerald-50 text-emerald-800"
                            : "border border-[#E7DCE4] bg-white text-[#4E404C]"
                        }`}
                      >
                        {team.answeredCurrentQuestion ? "✓ Answered" : "○ Waiting"}
                      </span>
                    </td>
                    <td className="px-3.5 py-3.5 font-bold tabular-nums text-[#302630]">
                      {team.totalAnswered}
                    </td>
                    <td className="px-3.5 py-3.5 font-bold tabular-nums text-emerald-700">
                      {team.correctSoFar}
                    </td>
                    <td className="px-3.5 py-3.5 font-mono tabular-nums text-[#4E404C]">
                      {formatDuration(team.totalCorrectMs)}
                    </td>
                    <td className="px-3.5 py-3.5">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-2xs font-bold ${
                          team.warningCount >= (snapshot?.maxWarnings ?? 3)
                            ? "border border-rose-300 bg-rose-50 text-rose-800"
                            : "border border-[#E7DCE4] bg-white text-[#4E404C]"
                        }`}
                      >
                        {team.warningCount}/{snapshot?.maxWarnings ?? 3}
                      </span>
                    </td>
                    <td className="px-3.5 py-3.5">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-2xs font-bold ${
                          team.quizStatus === "ELIMINATED"
                            ? "border border-rose-300 bg-rose-50 text-rose-800"
                            : "border border-emerald-300 bg-emerald-50 text-emerald-800"
                        }`}
                      >
                        {team.quizStatus === "ELIMINATED" ? "⛔ Eliminated" : "✓ Active"}
                      </span>
                    </td>
                    <td className="px-3.5 py-3.5">
                      <div className="flex min-w-36 flex-col gap-1.5">
                        {team.quizStatus === "ELIMINATED" && (
                          <button
                            type="button"
                            className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs"
                            disabled={busyTeam === team.id}
                            onClick={() => setTeamToRestore(team)}
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

      <ConfirmDialog
        isOpen={!!teamToRestore}
        title="Restore Team"
        description={`Restore team "${teamToRestore?.name}" and reset its warnings? The team will be marked active.`}
        confirmLabel="Restore Team"
        cancelLabel="Cancel"
        onConfirm={handleConfirmRestoreTeam}
        onCancel={() => setTeamToRestore(null)}
      />
    </section>
  );
}
