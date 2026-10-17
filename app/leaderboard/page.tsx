
"use client";

import { useCallback, useEffect, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

type Round1Team = {
  rank: number;
  teamId: string;
  teamName: string;
  round1Score: number;
  round1MaxMarks: number;
  round1Percent: number;
  totalCorrectMs: number;
};

type FinalTeam = Round1Team & {
  round2Score: number;
  round2MaxMarks: number;
  round2Percent: number;
  combined: number;
  status: "Selected" | "Not Selected";
  tieBreakReason: string;
  timeDecided: boolean;
  unresolvedTie: boolean;
};

type LeaderboardResponse = {
  stage: "ROUND_1" | "FINAL";
  finalPublished: boolean;
  round1MaxMarks: number;
  teams: Round1Team[] | FinalTeam[];
};

function formatNumber(value: number) {
  return Number(value).toFixed(2).replace(/\.?0+$/, "");
}
function formatTime(ms: number) {
  return `${(ms / 1000).toFixed(3)} s`;
}

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadLeaderboard = useCallback(async () => {
    try {
        setRefreshing(true);
    const response = await fetch("/api/leaderboard", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ?? "Could not load the leaderboard.",
        );
      }

      setData(result as LeaderboardResponse);
      setError("");
      setLastUpdated(new Date());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load the leaderboard.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

useEffect(() => {
  const interval = window.setInterval(() => {
    void loadLeaderboard();
  }, 10000);

  return () => window.clearInterval(interval);
}, [loadLeaderboard]);

useEffect(() => {
  const controller = new AbortController();

  async function initialLoad() {
    try {
      const response = await fetch("/api/leaderboard", {
        cache: "no-store",
        signal: controller.signal,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ?? "Could not load the leaderboard.",
        );
      }

      setData(result as LeaderboardResponse);
      setError("");
      setLastUpdated(new Date());
    } catch (err) {
      if (controller.signal.aborted) return;

      setError(
        err instanceof Error
          ? err.message
          : "Could not load the leaderboard.",
      );
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }

  void initialLoad();

  return () => controller.abort();
}, []);


  const isFinal = data?.stage === "FINAL";

  return (
    <main className="min-h-screen bg-[#F7F2F5] dark:bg-[#050505] px-4 py-10 text-[#302630] dark:text-[#FAFAFA] sm:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="space-y-3 text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="rounded-full border border-[#D9468D]/25 bg-[#FCE7F1] dark:bg-[#8B5CF6]/15 dark:border-[#8B5CF6]/30 px-3.5 py-1 text-xs font-bold uppercase tracking-[0.2em] text-[#BE3477] dark:text-[#A78BFA]">
              ISE Department
            </span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-[#302630] dark:text-[#FAFAFA] sm:text-5xl">
            Live Leaderboard
          </h1>

          <p className="text-sm text-[#746873] dark:text-[#A3A3A3] sm:text-base">
            Track official team performance, completed round marks, and final standings.
          </p>

          {data && (
            <span className="inline-flex rounded-full border border-[#D9468D]/25 bg-[#FCE7F1] dark:bg-[#8B5CF6]/15 dark:border-[#8B5CF6]/30 px-4 py-1 text-xs font-bold text-[#BE3477] dark:text-[#A78BFA]">
              {isFinal ? "Final Results Published" : "Round 1 Official Results"}
            </span>
          )}
        </header>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E7DCE4] dark:border-[#292929] pb-4">
          <p className="text-xs font-medium text-[#746873] dark:text-[#A3A3A3]">
            {lastUpdated
              ? `Last updated: ${lastUpdated.toLocaleTimeString()}`
              : "Loading latest results..."}
            {" · "}
            <span className="font-semibold text-[#BE3477] dark:text-[#8B5CF6]">Refreshes every 10 seconds</span>
          </p>

          <div className="flex items-center gap-3">
            <a
              href="/"
              className="text-xs font-semibold text-[#746873] hover:text-[#BE3477] dark:text-[#A3A3A3] dark:hover:text-[#FAFAFA] transition-colors"
            >
              ← Back to home
            </a>
            <ThemeToggle />
            <button
              type="button"
              onClick={() => void loadLeaderboard()}
              disabled={refreshing}
              aria-live="polite"
              className="inline-flex min-w-32 items-center justify-center gap-2 rounded-xl border border-[#E7DCE4] dark:border-[#292929] bg-white dark:bg-[#171717] px-4 py-2 text-xs font-bold text-[#302630] dark:text-[#FAFAFA] shadow-xs transition hover:border-[#D9468D]/40 dark:hover:border-[#383838] hover:bg-[#FAF6F8] dark:hover:bg-[#202020] hover:text-[#BE3477] dark:hover:text-[#FAFAFA] active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
            >
              {refreshing && (
                <span
                  aria-hidden="true"
                  className="size-3.5 animate-spin rounded-full border-2 border-[#BE3477] dark:border-[#8B5CF6] border-t-transparent"
                />
              )}
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {loading && !data && (
          <div className="glass-panel rounded-3xl p-10 text-center border border-white/80 dark:border-[#292929] dark:bg-[#111111] shadow-xs text-sm text-[#746873] dark:text-[#A3A3A3]">
            Loading leaderboard standings...
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-red-500/25 bg-red-50/85 dark:bg-red-950/40 dark:border-red-500/40 p-4 text-sm font-medium text-red-800 dark:text-red-300 shadow-xs"
          >
            {error}
            {data && " Showing the last successfully loaded results."}
          </div>
        )}

        {data && (
          <>
            <section className="grid gap-4 sm:grid-cols-3 animate-fade-in-up">
              <div className="glass-panel rounded-3xl p-5 border border-white/80 dark:border-[#292929] dark:bg-[#111111] shadow-xs">
                <p className="text-xs font-bold uppercase tracking-wider text-[#746873] dark:text-[#A3A3A3]">
                  Registered Teams
                </p>
                <p className="mt-2 text-3xl font-extrabold text-[#302630] dark:text-[#FAFAFA]">
                  {data.teams.length}
                </p>
              </div>

              <div className="glass-panel rounded-3xl p-5 border border-white/80 dark:border-[#292929] dark:bg-[#111111] shadow-xs">
                <p className="text-xs font-bold uppercase tracking-wider text-[#746873] dark:text-[#A3A3A3]">
                  Current Stage
                </p>
                <p className="mt-2 text-xl font-bold text-[#BE3477] dark:text-[#8B5CF6]">
                  {isFinal ? "Final Results" : "Round 1"}
                </p>
              </div>

              <div className="glass-panel rounded-3xl p-5 border border-white/80 dark:border-[#292929] dark:bg-[#111111] shadow-xs">
                <p className="text-xs font-bold uppercase tracking-wider text-[#746873] dark:text-[#A3A3A3]">
                  Round 1 Maximum
                </p>
                <p className="mt-2 text-3xl font-extrabold text-[#302630] dark:text-[#FAFAFA]">
                  {data.round1MaxMarks}
                </p>
              </div>
            </section>

            <section className="glass-panel overflow-hidden rounded-3xl border border-white/80 dark:border-[#292929] dark:bg-[#111111] shadow-xs animate-fade-in-up animation-delay-75">
              <div className="border-b border-[#E7DCE4] dark:border-[#292929] bg-white/70 dark:bg-[#171717] px-6 py-4">
                <h2 className="text-lg font-bold text-[#302630] dark:text-[#FAFAFA]">
                  {isFinal ? "Final Standings" : "Round 1 Standings"}
                </h2>
                <p className="mt-0.5 text-xs text-[#746873] dark:text-[#A3A3A3]">
                  {isFinal
                    ? "Round scores, combined results, and selection status."
                    : "All registered teams ranked by Round 1 performance."}
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#F1E9EF]/60 dark:bg-[#171717] text-xs font-bold uppercase tracking-wider text-[#746873] dark:text-[#A3A3A3]">
                    <tr>
                      <th className="whitespace-nowrap px-4 py-3.5">Rank</th>
                      <th className="whitespace-nowrap px-4 py-3.5">Team</th>
                      <th className="whitespace-nowrap px-4 py-3.5">Round 1 Score</th>
                      <th className="whitespace-nowrap px-4 py-3.5">Round 1 %</th>
                      <th className="whitespace-nowrap px-4 py-3.5">Round 1 Correct Time</th>

                      {isFinal && (
                        <>
                          <th className="whitespace-nowrap px-4 py-3.5">Round 2 Score</th>
                          <th className="whitespace-nowrap px-4 py-3.5">Round 2 %</th>
                          <th className="whitespace-nowrap px-4 py-3.5">Combined</th>
                          <th className="whitespace-nowrap px-4 py-3.5">Status</th>
                        </>
                      )}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#E7DCE4]/70 dark:divide-[#292929] bg-white/40 dark:bg-transparent">
                    {data.teams.map((team) => (
                      <tr
                        key={team.teamId}
                        className="transition-colors hover:bg-white/70 dark:hover:bg-[#171717]"
                      >
                        <td className="whitespace-nowrap px-4 py-4 font-bold text-[#302630] dark:text-[#FAFAFA]">
                          {team.rank === 1
                            ? "🥇 1"
                            : team.rank === 2
                              ? "🥈 2"
                              : team.rank === 3
                                ? "🥉 3"
                                : team.rank}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 font-bold text-[#302630] dark:text-[#FAFAFA]">
                          {team.teamName}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 font-medium tabular-nums text-[#302630] dark:text-[#FAFAFA]">
                          {team.round1Score} / {team.round1MaxMarks}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 font-medium tabular-nums text-[#302630] dark:text-[#FAFAFA]">
                          {formatNumber(team.round1Percent)}%
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-xs font-medium text-[#746873] dark:text-[#A3A3A3]">
                          {formatTime(team.totalCorrectMs)}
                          {isFinal && (team as FinalTeam).timeDecided && (
                            <span className="ml-2 inline-flex rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                              Rank decided by time
                            </span>
                          )}
                          {isFinal && (team as FinalTeam).unresolvedTie && (
                            <span className="ml-2 inline-flex rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:text-red-400">
                              Manual review required
                            </span>
                          )}
                        </td>

                        {isFinal && (
                          <>
                            <td className="whitespace-nowrap px-4 py-4 tabular-nums text-[#302630] dark:text-[#FAFAFA]">
                              {(team as FinalTeam).round2Score} /{" "}
                              {(team as FinalTeam).round2MaxMarks}
                            </td>

                            <td className="whitespace-nowrap px-4 py-4 tabular-nums text-[#302630] dark:text-[#FAFAFA]">
                              {formatNumber(
                                (team as FinalTeam).round2Percent,
                              )}
                              %
                            </td>

                            <td className="whitespace-nowrap px-4 py-4 font-extrabold tabular-nums text-[#BE3477] dark:text-[#8B5CF6]">
                              {formatNumber(
                                (team as FinalTeam).combined,
                              )}
                            </td>

                            <td className="whitespace-nowrap px-4 py-4">
                              <span
                                className={`inline-flex rounded-full px-3 py-0.5 text-xs font-bold ${
                                  (team as FinalTeam).status === "Selected"
                                    ? "bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-[#34D399]"
                                    : "bg-[#F1E9EF] text-[#746873] dark:bg-[#171717] dark:text-[#A3A3A3]"
                                }`}
                              >
                                {(team as FinalTeam).status}
                              </span>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}

                    {data.teams.length === 0 && (
                      <tr>
                        <td
                          colSpan={isFinal ? 9 : 5}
                          className="px-4 py-10 text-center text-xs text-[#746873] dark:text-[#A3A3A3]"
                        >
                          No teams are available yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        <footer className="text-center text-xs font-medium text-[#746873] dark:text-[#A3A3A3] border-t border-[#E7DCE4] dark:border-[#292929] pt-6">
          Blueprint to Live · Official Competition Results
        </footer>
      </div>
    </main>
  );
}
