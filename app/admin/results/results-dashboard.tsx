"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type LeaderboardEntry = {
  teamId: string;
  teamName: string;
  score: number;
  round1Percent: number;
  totalCorrectMs: number;
  fastestCorrectCount: number;
};

type Team = {
  id: string;
  name: string;
  quizStatus: "ACTIVE" | "ELIMINATED";
  warningCount: number;
  participants: { id: string; name: string; email: string }[];
};

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

type ResponseRow = {
  id: string;
  teamId: string;
  questionId: string;
  optionId: string;
  answeredAt: string;
  responseMs: number;
  optionLabel: string;
  optionContent: string;
  isCorrect: boolean;
};

type ResultsData = {
  leaderboard: LeaderboardEntry[];
  teams: Team[];
  slots: Slot[];
  responses: ResponseRow[];
};

function formatTime(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;

  return `${minutes}m ${String(remainder).padStart(2, "0")}s`;
}

export default function ResultsDashboard() {
  const [data, setData] = useState<ResultsData | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/results", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Could not load quiz results.");
      }

      setData(await response.json());
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not load quiz results.",
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
    }, 2500);

    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(interval);
    };
  }, [refresh]);

  const teamById = useMemo(
    () => new Map((data?.teams ?? []).map((team) => [team.id, team])),
    [data],
  );

  const visibleRanking = useMemo(() => {
    const query = search.trim().toLowerCase();

    return (data?.leaderboard ?? []).filter((entry) =>
      entry.teamName.toLowerCase().includes(query),
    );
  }, [data, search]);

  const selectedTeam = selectedTeamId
    ? teamById.get(selectedTeamId) ?? null
    : null;

  const selectedAnswers = useMemo(() => {
    if (!data || !selectedTeamId) return [];

    return data.slots.map((slot) => {
      const response = data.responses.find(
        (item) =>
          item.teamId === selectedTeamId &&
          item.questionId === slot.questionId,
      );

      return { slot, response };
    });
  }, [data, selectedTeamId]);

  const questionAnalysis = useMemo(() => {
    if (!data) return [];

    return data.slots.map((slot) => {
      const questionResponses = data.responses.filter(
        (response) => response.questionId === slot.questionId,
      );

      const correctResponses = questionResponses.filter(
        (response) => response.isCorrect,
      );

      const distribution = slot.options.map((option) => ({
        label: option.label,
        count: questionResponses.filter(
          (response) => response.optionId === option.id,
        ).length,
      }));

      const fastest = [...correctResponses].sort(
        (a, b) => a.responseMs - b.responseMs,
      )[0];

      const fastestTeam = fastest
        ? teamById.get(fastest.teamId)?.name ?? "Unknown team"
        : "No correct answers";

      return {
        ...slot,
        answered: questionResponses.length,
        correct: correctResponses.length,
        percentCorrect:
          questionResponses.length > 0
            ? (correctResponses.length / questionResponses.length) * 100
            : 0,
        distribution,
        fastestTeam,
        fastestMs: fastest?.responseMs ?? null,
      };
    });
  }, [data, teamById]);

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Administration
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Quiz Results
          </h1>
          <p className="mt-1 text-sm text-muted">
            Rankings, answer breakdowns, and question-level performance analysis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="rounded-xl border border-neutral-light dark:border-[#292929] bg-white/80 dark:bg-[#171717] px-4 py-2 text-sm font-semibold text-foreground dark:text-[#FAFAFA] shadow-xs transition hover:bg-white dark:hover:bg-[#202020] hover:border-neutral active:scale-[0.98] disabled:opacity-50"
            onClick={() => void refresh()}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>

          <a
            href="/api/admin/results/export"
            className="inline-flex items-center rounded-xl bg-primary dark:bg-[#8B5CF6] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover dark:hover:bg-[#7C3AED] active:scale-[0.98]"
          >
            Download CSV
          </a>
        </div>
      </header>

      {/* Summary Stat Card */}
      {data && (
        <div className="glass-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                Total Quiz Questions
              </p>
              <p className="mt-1 text-3xl font-extrabold tracking-tight text-foreground">
                {data.slots.length}
              </p>
            </div>
            <div className="rounded-xl border border-pink-200/60 dark:border-[#8B5CF6]/30 bg-pink-50/50 dark:bg-[#8B5CF6]/10 px-4 py-2.5 text-xs text-muted max-w-md">
              <span className="font-semibold text-foreground">Ranking Criteria:</span>{" "}
              Total score, lowest correct-answer cumulative time, and fastest-correct response count.
            </div>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 dark:border-rose-500/30 bg-red-50 dark:bg-rose-950/20 p-4 text-sm text-red-800 dark:text-rose-300"
        >
          {error}
        </div>
      )}

      {/* Team Ranking Card */}
      <div className="glass-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              Team Ranking
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              Select a team to inspect individual question responses and response times.
            </p>
          </div>

          <div className="w-full sm:w-72">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search teams..."
              aria-label="Search results by team"
              className="w-full rounded-xl border border-neutral-light dark:border-[#292929] bg-white/90 dark:bg-[#171717] px-3.5 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary dark:focus:border-[#8B5CF6] focus:ring-2 focus:ring-primary/20 outline-none transition"
            />
          </div>
        </div>

        {loading && !data ? (
          <div className="py-12 text-center text-sm text-muted">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mb-2" />
            <p>Loading results...</p>
          </div>
        ) : visibleRanking.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted">
            No ranking entries found.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-xl border border-neutral-light dark:border-[#292929] bg-white dark:bg-[#111111] shadow-xs">
            <table className="w-full min-w-[950px] text-left text-sm">
              <thead className="border-b border-neutral-light dark:border-[#292929] bg-[#FBF7FA] dark:bg-[#171717] text-xs font-semibold uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Team</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Round 1 %</th>
                  <th className="px-4 py-3">Correct Time</th>
                  <th className="px-4 py-3">Fastest Correct</th>
                  <th className="px-4 py-3">Warnings</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Details</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-light">
                {visibleRanking.map((entry) => {
                  const team = teamById.get(entry.teamId);
                  const rank =
                    (data?.leaderboard.findIndex(
                      (item) => item.teamId === entry.teamId,
                    ) ?? -1) + 1;

                  return (
                    <tr
                      key={entry.teamId}
                      className="transition-colors hover:bg-neutral-50/60"
                    >
                      <td className="px-4 py-3.5">
                        {rank === 1 ? (
                          <span className="inline-flex items-center gap-1 rounded-lg border border-amber-200/80 bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700">
                            🥇 1
                          </span>
                        ) : rank === 2 ? (
                          <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                            🥈 2
                          </span>
                        ) : rank === 3 ? (
                          <span className="inline-flex items-center gap-1 rounded-lg border border-amber-300/60 bg-amber-100/60 px-2 py-0.5 text-xs font-bold text-amber-800">
                            🥉 3
                          </span>
                        ) : (
                          <span className="font-semibold text-foreground pl-1">
                            {rank}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-foreground">
                          {entry.teamName}
                        </p>
                        <p className="text-xs text-muted">
                          {team?.participants.length ?? 0} members
                        </p>
                      </td>
                      <td className="px-4 py-3.5 font-bold tabular-nums text-foreground">
                        {entry.score}
                      </td>
                      <td className="px-4 py-3.5 tabular-nums text-foreground">
                        {entry.round1Percent.toFixed(2)}%
                      </td>
                      <td className="px-4 py-3.5 tabular-nums text-muted">
                        {formatTime(entry.totalCorrectMs)}
                      </td>
                      <td className="px-4 py-3.5 tabular-nums text-foreground">
                        {entry.fastestCorrectCount}
                      </td>
                      <td className="px-4 py-3.5">
                        {(team?.warningCount ?? 0) > 0 ? (
                          <span className="inline-flex items-center rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-700">
                            {team?.warningCount}
                          </span>
                        ) : (
                          <span className="text-xs text-muted">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {team?.quizStatus === "ELIMINATED" ? (
                          <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700">
                            ⛔ Eliminated
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                            ✓ Active
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          className="rounded-lg border border-pink-200 dark:border-[#8B5CF6]/30 bg-pink-50/80 dark:bg-[#8B5CF6]/15 px-3 py-1.5 text-xs font-semibold text-primary dark:text-[#A78BFA] shadow-2xs transition hover:bg-pink-100 dark:hover:bg-[#8B5CF6]/25 hover:border-pink-300 dark:hover:border-[#8B5CF6]/40 active:scale-[0.98]"
                          onClick={() => setSelectedTeamId(entry.teamId)}
                        >
                          View answers
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Question Analysis Card */}
      <div className="glass-card p-6">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Question Analysis
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            Answer correctness rates and option distribution across all recorded submissions.
          </p>
        </div>

        {!questionAnalysis.length ? (
          <p className="py-8 text-center text-sm text-muted">
            No quiz questions are available yet.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-xl border border-neutral-light dark:border-[#292929] bg-white dark:bg-[#111111] shadow-xs">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="border-b border-neutral-light dark:border-[#292929] bg-[#FBF7FA] dark:bg-[#171717] text-xs font-semibold uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3">Question</th>
                  <th className="px-4 py-3">Answered</th>
                  <th className="px-4 py-3">Correct</th>
                  <th className="px-4 py-3">% Correct</th>
                  <th className="px-4 py-3">Option Distribution</th>
                  <th className="px-4 py-3">Fastest Correct Team</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-light dark:divide-[#292929]">
                {questionAnalysis.map((question, index) => (
                  <tr key={question.questionId} className="align-top hover:bg-neutral-50/60 dark:hover:bg-[#202020] transition-colors">
                    <td className="max-w-xs px-4 py-3.5">
                      <p className="font-semibold text-foreground">
                        Q{index + 1} · <span className="text-primary font-medium text-xs">{question.type}</span>
                      </p>
                      <p className="mt-1 line-clamp-3 text-xs text-muted">
                        {question.text}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 tabular-nums text-foreground font-medium">
                      {question.answered}
                    </td>
                    <td className="px-4 py-3.5 tabular-nums text-emerald-700 dark:text-emerald-400 font-medium">
                      {question.correct}
                    </td>
                    <td className="px-4 py-3.5 tabular-nums">
                      <span className="font-semibold text-foreground">
                        {question.percentCorrect.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1.5">
                        {question.distribution.map((option) => (
                          <span
                            key={option.label}
                            className="inline-flex items-center rounded-md border border-neutral-light dark:border-[#292929] bg-[#FAF7F9] dark:bg-[#171717] px-2 py-0.5 text-xs font-medium text-foreground"
                          >
                            <span className="font-semibold text-primary mr-1">
                              {option.label}:
                            </span>
                            {option.count}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-foreground">{question.fastestTeam}</p>
                      {question.fastestMs !== null && (
                        <p className="mt-0.5 text-xs text-muted">
                          {formatTime(question.fastestMs)}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Team Answers Modal */}
      {selectedTeam && selectedTeamId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="team-detail-title"
            className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/80 dark:border-[#292929] bg-white/95 dark:bg-[#111111] p-6 shadow-2xl backdrop-blur-md"
          >
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-light dark:border-[#292929] pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Team Response Audit
                </p>
                <h2 id="team-detail-title" className="mt-1 text-xl font-bold text-foreground">
                  {selectedTeam.name}
                </h2>
                <p className="mt-0.5 text-sm text-muted">
                  Recorded responses, answer speed, and accuracy for each quiz slot.
                </p>
              </div>

              <button
                type="button"
                className="rounded-xl border border-neutral-light dark:border-[#292929] bg-white dark:bg-[#171717] px-3.5 py-1.5 text-sm font-semibold text-foreground shadow-2xs transition hover:bg-neutral-100 dark:hover:bg-[#202020] active:scale-[0.98]"
                onClick={() => setSelectedTeamId(null)}
              >
                Close
              </button>
            </div>

            <div className="mt-5 space-y-3.5">
              {selectedAnswers.map(({ slot, response }, index) => (
                <article
                  key={slot.questionId}
                  className="rounded-xl border border-neutral-light dark:border-[#292929] bg-[#FAF7F9] dark:bg-[#171717] p-4.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-bold text-foreground">
                      Question {index + 1}
                    </h3>
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                        response?.isCorrect
                          ? "border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300"
                          : response
                            ? "border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300"
                            : "border border-neutral-200 dark:border-[#292929] bg-neutral-100 dark:bg-[#202020] text-muted"
                      }`}
                    >
                      {response
                        ? response.isCorrect
                          ? "✓ Correct"
                          : "✗ Wrong"
                        : "○ Not answered"}
                    </span>
                  </div>

                  <p className="mt-2.5 whitespace-pre-wrap text-sm text-foreground leading-relaxed">
                    {slot.text}
                  </p>

                  {response ? (
                    <div className="mt-3.5 rounded-xl border border-neutral-light dark:border-[#292929] bg-white dark:bg-[#111111] p-3.5 text-sm">
                      <p className="text-muted">
                        <span className="font-semibold text-foreground">Chosen Option:</span>{" "}
                        <span className="font-bold text-primary">{response.optionLabel}</span>
                      </p>
                      <p className="mt-1 whitespace-pre-wrap font-medium text-foreground">
                        {response.optionContent}
                      </p>
                      <p className="mt-2.5 text-xs text-muted border-t border-neutral-light/70 dark:border-[#292929] pt-2">
                        Response time: <span className="font-semibold text-foreground">{formatTime(response.responseMs)}</span>
                      </p>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-muted italic">
                      No answer was recorded for this question.
                    </p>
                  )}
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
