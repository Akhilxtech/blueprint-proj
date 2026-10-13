
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

const panel =
  "rounded-2xl border border-white/10 bg-zinc-900 p-5";
const button =
  "rounded-lg border border-white/15 px-3 py-2 text-sm font-medium transition hover:bg-white/10";

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
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-pink-400">
            Administration
          </p>
          <h1 className="mt-2 text-3xl font-bold">Quiz Results</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Rankings, answer breakdowns and question analysis.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className={button}
            onClick={() => void refresh()}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>

          <a
            href="/api/admin/results/export"
            className="inline-flex items-center rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-pink-500"
          >
            Download CSV
          </a>
        </div>
      </header>

      {data && (
        <div className={panel}>
          <p className="text-sm text-zinc-400">Quiz questions</p>
          <p className="mt-2 text-3xl font-bold">{data.slots.length}</p>
          <p className="mt-1 text-xs text-zinc-500">
            Ranking follows score, total correct-answer time, and fastest-correct count.
          </p>
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

      <div className={panel}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Team ranking</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Select a team to inspect its answers.
            </p>
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search teams..."
            aria-label="Search results by team"
            className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm outline-none focus:border-pink-500"
          />
        </div>

        {loading && !data ? (
          <p className="py-10 text-center text-sm text-zinc-400">
            Loading results...
          </p>
        ) : visibleRanking.length === 0 ? (
          <p className="py-10 text-center text-sm text-zinc-400">
            No ranking entries found.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[950px] text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-zinc-400">
                <tr>
                  <th className="px-3 py-3">Rank</th>
                  <th className="px-3 py-3">Team</th>
                  <th className="px-3 py-3">Score</th>
                  <th className="px-3 py-3">Round 1 %</th>
                  <th className="px-3 py-3">Correct time</th>
                  <th className="px-3 py-3">Fastest correct</th>
                  <th className="px-3 py-3">Warnings</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Details</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5">
                {visibleRanking.map((entry) => {
                  const team = teamById.get(entry.teamId);
                  const rank =
                    (data?.leaderboard.findIndex(
                      (item) => item.teamId === entry.teamId,
                    ) ?? -1) + 1;

                  return (
                    <tr key={entry.teamId}>
                      <td className="px-3 py-4 font-semibold">
                        {rank === 1 ? "🥇 1" : rank === 2 ? "🥈 2" : rank === 3 ? "🥉 3" : rank}
                      </td>
                      <td className="px-3 py-4">
                        <p className="font-semibold">{entry.teamName}</p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {team?.participants.length ?? 0} members
                        </p>
                      </td>
                      <td className="px-3 py-4 font-semibold tabular-nums">
                        {entry.score}
                      </td>
                      <td className="px-3 py-4 tabular-nums">
                        {entry.round1Percent.toFixed(2)}%
                      </td>
                      <td className="px-3 py-4 tabular-nums">
                        {formatTime(entry.totalCorrectMs)}
                      </td>
                      <td className="px-3 py-4 tabular-nums">
                        {entry.fastestCorrectCount}
                      </td>
                      <td className="px-3 py-4">
                        {team?.warningCount ?? 0}
                      </td>
                      <td className="px-3 py-4">
                        {team?.quizStatus === "ELIMINATED"
                          ? "⛔ Eliminated"
                          : "✓ Active"}
                      </td>
                      <td className="px-3 py-4">
                        <button
                          type="button"
                          className={button}
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

      <div className={panel}>
        <h2 className="text-lg font-semibold">Question analysis</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Correct-answer percentage is calculated from recorded responses.
        </p>

        {!questionAnalysis.length ? (
          <p className="py-8 text-sm text-zinc-400">
            No quiz questions are available yet.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-zinc-400">
                <tr>
                  <th className="px-3 py-3">Question</th>
                  <th className="px-3 py-3">Answered</th>
                  <th className="px-3 py-3">Correct</th>
                  <th className="px-3 py-3">% Correct</th>
                  <th className="px-3 py-3">Option distribution</th>
                  <th className="px-3 py-3">Fastest correct team</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5">
                {questionAnalysis.map((question, index) => (
                  <tr key={question.questionId} className="align-top">
                    <td className="max-w-xs px-3 py-4">
                      <p className="font-medium">
                        Q{index + 1} · {question.type}
                      </p>
                      <p className="mt-1 line-clamp-3 text-xs text-zinc-400">
                        {question.text}
                      </p>
                    </td>
                    <td className="px-3 py-4 tabular-nums">
                      {question.answered}
                    </td>
                    <td className="px-3 py-4 tabular-nums">
                      {question.correct}
                    </td>
                    <td className="px-3 py-4 tabular-nums">
                      {question.percentCorrect.toFixed(1)}%
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex flex-wrap gap-2">
                        {question.distribution.map((option) => (
                          <span
                            key={option.label}
                            className="rounded-md border border-white/10 px-2 py-1 text-xs"
                          >
                            {option.label}: {option.count}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-4">
                      <p>{question.fastestTeam}</p>
                      {question.fastestMs !== null && (
                        <p className="mt-1 text-xs text-zinc-400">
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

      {selectedTeam && selectedTeamId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="team-detail-title"
            className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 id="team-detail-title" className="text-xl font-bold">
                  {selectedTeam.name}
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Answer details for each quiz question.
                </p>
              </div>

              <button
                type="button"
                className={button}
                onClick={() => setSelectedTeamId(null)}
              >
                Close
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {selectedAnswers.map(({ slot, response }, index) => (
                <article
                  key={slot.questionId}
                  className="rounded-xl border border-white/10 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-semibold">
                      Question {index + 1}
                    </h3>
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${
                        response?.isCorrect
                          ? "bg-emerald-500/15 text-emerald-300"
                          : response
                            ? "bg-red-500/15 text-red-300"
                            : "bg-zinc-700 text-zinc-300"
                      }`}
                    >
                      {response
                        ? response.isCorrect
                          ? "✓ Correct"
                          : "✗ Wrong"
                        : "○ Not answered"}
                    </span>
                  </div>

                  <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-300">
                    {slot.text}
                  </p>

                  {response ? (
                    <div className="mt-3 rounded-lg bg-black/20 p-3 text-sm">
                      <p>
                        <span className="text-zinc-400">Chosen option:</span>{" "}
                        {response.optionLabel}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap">
                        {response.optionContent}
                      </p>
                      <p className="mt-2 text-xs text-zinc-400">
                        Response time: {formatTime(response.responseMs)}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-zinc-400">
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
