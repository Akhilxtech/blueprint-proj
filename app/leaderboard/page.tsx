
"use client";

import { useCallback, useEffect, useState } from "react";

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
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="space-y-3 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-pink-600">
            Blueprint to Live
          </p>

          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
            Leaderboard
          </h1>

          <p className="text-sm text-muted-foreground sm:text-base">
            Track team performance and competition results.
          </p>

          {data && (
            <span className="inline-flex rounded-full border px-3 py-1 text-sm">
              {isFinal ? "Final Results Published" : "Round 1 Results"}
            </span>
          )}
        </header>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {lastUpdated
              ? `Last updated: ${lastUpdated.toLocaleTimeString()}`
              : "Loading latest results..."}
            {" · "}
            Refreshes every 10 seconds
          </p>

        
<button
  type="button"
  onClick={() => void loadLeaderboard()}
  disabled={refreshing}
  aria-live="polite"
  className="inline-flex min-w-32 items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-wait disabled:opacity-60"
>
  {refreshing && (
    <span
      aria-hidden="true"
      className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  )}
  {refreshing ? "Refreshing..." : "Refresh"}
</button>

        </div>

        {loading && !data && (
          <div className="rounded-xl border p-10 text-center">
            Loading leaderboard...
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-600"
          >
            {error}
            {data && " Showing the last successfully loaded results."}
          </div>
        )}

        {data && (
          <>
            <section className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border p-5">
                <p className="text-sm text-muted-foreground">
                  Registered Teams
                </p>
                <p className="mt-2 text-3xl font-bold">
                  {data.teams.length}
                </p>
              </div>

              <div className="rounded-xl border p-5">
                <p className="text-sm text-muted-foreground">
                  Current Stage
                </p>
                <p className="mt-2 text-xl font-semibold">
                  {isFinal ? "Final Results" : "Round 1"}
                </p>
              </div>

              <div className="rounded-xl border p-5">
                <p className="text-sm text-muted-foreground">
                  Round 1 Maximum
                </p>
                <p className="mt-2 text-3xl font-bold">
                  {data.round1MaxMarks}
                </p>
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border">
              <div className="border-b px-5 py-4">
                <h2 className="text-lg font-semibold">
                  {isFinal ? "Final Standings" : "Round 1 Standings"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isFinal
                    ? "Round scores, combined results, and selection status."
                    : "All registered teams ranked by Round 1 performance."}
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="whitespace-nowrap px-4 py-3">Rank</th>
                      <th className="whitespace-nowrap px-4 py-3">
                        Team
                      </th>
                      <th className="whitespace-nowrap px-4 py-3">
                        Round 1 Score
                      </th>
                      <th className="whitespace-nowrap px-4 py-3">
                        Round 1 %
                      </th>
                      <th className="whitespace-nowrap px-4 py-3">
  Round 1 Correct Time
</th>

                      {isFinal && (
                        <>
                          <th className="whitespace-nowrap px-4 py-3">
                            Round 2 Score
                          </th>
                          <th className="whitespace-nowrap px-4 py-3">
                            Round 2 %
                          </th>
                          <th className="whitespace-nowrap px-4 py-3">
                            Combined
                          </th>
                          <th className="whitespace-nowrap px-4 py-3">
                            Status
                          </th>
                        </>
                      )}
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {data.teams.map((team) => (
                      <tr
                        key={team.teamId}
                        className="transition-colors hover:bg-muted/30"
                      >
                        <td className="whitespace-nowrap px-4 py-4 font-semibold">
                          {team.rank === 1
                            ? "🥇 1"
                            : team.rank === 2
                              ? "🥈 2"
                              : team.rank === 3
                                ? "🥉 3"
                                : team.rank}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 font-medium">
                          {team.teamName}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 tabular-nums">
                          {team.round1Score} / {team.round1MaxMarks}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 tabular-nums">
                          {formatNumber(team.round1Percent)}%
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
  {formatTime(team.totalCorrectMs)}
  {isFinal && (team as FinalTeam).timeDecided && (
    <span className="ml-2 inline-flex rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-600">
      Rank decided by time
    </span>
  )}
  {isFinal && (team as FinalTeam).unresolvedTie && (
    <span className="ml-2 inline-flex rounded-full border border-red-500/40 bg-red-500/10 px-2 py-1 text-xs text-red-600">
      Manual review required
    </span>
  )}
</td>

                        {isFinal && (
                          <>
                            <td className="whitespace-nowrap px-4 py-4 tabular-nums">
                              {(team as FinalTeam).round2Score} /{" "}
                              {(team as FinalTeam).round2MaxMarks}
                            </td>

                            <td className="whitespace-nowrap px-4 py-4 tabular-nums">
                              {formatNumber(
                                (team as FinalTeam).round2Percent,
                              )}
                              %
                            </td>

                            <td className="whitespace-nowrap px-4 py-4 font-semibold tabular-nums">
                              {formatNumber(
                                (team as FinalTeam).combined,
                              )}
                            </td>

                            <td className="whitespace-nowrap px-4 py-4">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  (team as FinalTeam).status === "Selected"
                                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                    : "bg-muted text-muted-foreground"
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
                          colSpan={isFinal ? 8 : 4}
                          className="px-4 py-10 text-center text-muted-foreground"
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

        <footer className="text-center text-xs text-muted-foreground">
          Blueprint to Live · Official Competition Results
        </footer>
      </div>
    </main>
  );
}
