"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ConfirmDialog from "@/components/confirm-dialog";

type Settings = {
  weightRound1: number;
  weightRound2: number;
  finalistCount: number;
  questionMaxMarks: number[];
};

type Round2Row = {
  teamId: string;
  teamName: string;
  marks: number[];
  sectionA: number;
  sectionB: number;
  sectionC: number;
  sectionAMax: number;
  sectionBMax: number;
  sectionCMax: number;
  round2Total: number;
  round2MaxMarks: number;
  round2Percent: number;
  round1Score: number;
  round1MaxMarks: number;
  round1Percent: number;
  totalCorrectMs: number;
  combined: number;
  rank: number;
  isFinalist: boolean;
  suddenDeathTie: boolean;
  cutLineTie: boolean;
  whyRankedHere: string;
};

type Snapshot = {
  settings: Settings;
  rows: Round2Row[];
  totalTeams: number;
  finalistCount: number;
  cutLineTie: boolean;
  resetAwaitingReevaluation: boolean;
  publishFinalResults: boolean;
};

type DialogState = {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
};

function formatCorrectTime(ms: number) {
  return `${(ms / 1000).toFixed(3)} s`;
}

export default function Round2Dashboard() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [weightRound1, setWeightRound1] = useState(40);
  const [weightRound2, setWeightRound2] = useState(60);
  const [finalistCount, setFinalistCount] = useState(10);
  const [cutoffTieTeams, setCutoffTieTeams] = useState<
    {
      teamId: string;
      teamName: string;
      rank: number;
      combined: number;
      round2Percent: number;
      round1Percent: number;
      sectionC: number;
      totalCorrectMs: number;
      whyRankedHere: string;
    }[]
  >([]);
  const [questionMaxMarks, setQuestionMaxMarks] = useState<number[]>(
    Array(10).fill(10),
  );
  const [draftMarks, setDraftMarks] = useState<Record<string, string>>({});

  const [confirmState, setConfirmState] = useState<DialogState>({
    open: false,
    title: "",
    description: null,
    confirmLabel: "Confirm",
    onConfirm: () => {},
  });

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/round2", {
        cache: "no-store",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not load Round 2.");
      }

      const data = payload as Snapshot;
      setSnapshot(data);
      setWeightRound1(Math.round(data.settings.weightRound1 * 100));
      setWeightRound2(Math.round(data.settings.weightRound2 * 100));
      setFinalistCount(data.settings.finalistCount);
      setQuestionMaxMarks(data.settings.questionMaxMarks);
      setDraftMarks({});
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not load Round 2.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(initial);
  }, [refresh]);

  const rows = snapshot?.rows ?? [];
  const pendingMarksCount = Object.keys(draftMarks).filter((key) => {
    const [teamId, questionNoText] = key.split("-");
    const questionNo = Number(questionNoText);

    const row = rows.find((item) => item.teamId === teamId);
    if (!row) return false;

    return draftMarks[key] !== String(row.marks[questionNo - 1]);
  }).length;

  const round2MaxMarks = questionMaxMarks.reduce((a, b) => a + b, 0);
  const sectionAMax = questionMaxMarks.slice(0, 4).reduce((a, b) => a + b, 0);
  const sectionBMax = questionMaxMarks.slice(4, 7).reduce((a, b) => a + b, 0);
  const sectionCMax = questionMaxMarks.slice(7, 10).reduce((a, b) => a + b, 0);

  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => row.teamName.toLowerCase().includes(query));
  }, [rows, search]);

  const finalists = visibleRows.filter((row) => row.isFinalist);
  const otherTeams = visibleRows.filter((row) => !row.isFinalist);

  const saveAllMarks = async () => {
    if (!snapshot) return;

    const changes: {
      teamId: string;
      questionNo: number;
      marks: number;
    }[] = [];

    for (const row of rows) {
      for (let index = 0; index < row.marks.length; index++) {
        const questionNo = index + 1;
        const key = `${row.teamId}-${questionNo}`;
        const rawValue = draftMarks[key];

        if (rawValue === undefined) continue;

        if (rawValue.trim() === "") {
          setError(
            `Marks cannot be empty for ${row.teamName}, Q${questionNo}.`,
          );
          return;
        }

        const marks = Number(rawValue);
        const maximum = questionMaxMarks[index];

        if (!Number.isInteger(marks) || marks < 0 || marks > maximum) {
          setError(
            `${row.teamName}, Q${questionNo}: enter a whole number from 0 to ${maximum}.`,
          );
          return;
        }

        if (marks !== row.marks[index]) {
          changes.push({
            teamId: row.teamId,
            questionNo,
            marks,
          });
        }
      }
    }

    if (changes.length === 0) {
      setNotice("No mark changes to save.");
      setError("");
      return;
    }

    setSaving("batch");
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/admin/round2/marks/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marks: changes }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not save all marks.");
      }

      setNotice(
        `Successfully saved ${payload.savedCount} mark entries. Rankings updated.`,
      );

      await refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not save all marks. Your drafts have been retained.",
      );
    } finally {
      setSaving(null);
    }
  };

  const saveSettings = async () => {
    if (
      weightRound1 < 0 ||
      weightRound2 < 0 ||
      weightRound1 + weightRound2 !== 100
    ) {
      setError("Round 1 and Round 2 weights must add up to 100%.");
      return;
    }

    if (!Number.isInteger(finalistCount) || finalistCount < 1) {
      setError("Finalist count must be a positive whole number.");
      return;
    }

    if (
      questionMaxMarks.length !== 10 ||
      questionMaxMarks.some(
        (mark) => !Number.isInteger(mark) || mark < 1 || mark > 10000,
      )
    ) {
      setError("Each question maximum must be a whole number between 1 and 10000.");
      return;
    }

    setSaving("settings");
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/admin/round2/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weightRound1: weightRound1 / 100,
          weightRound2: weightRound2 / 100,
          finalistCount,
          questionMaxMarks,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not save settings.");
      }

      setNotice("Scoring settings saved.");
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not save settings.",
      );
    } finally {
      setSaving(null);
    }
  };

  const executeSelectFinalists = async () => {
    setSaving("finalists");
    setError("");
    setNotice("");
    setCutoffTieTeams([]);

    try {
      const response = await fetch("/api/admin/round2/finalists", {
        method: "POST",
      });
      const payload = await response.json();

      if (!response.ok) {
        if (payload.code === "FINALIST_CUTOFF_TIE") {
          setCutoffTieTeams(payload.tiedTeams ?? []);
        }

        throw new Error(payload.error ?? "Could not select finalists.");
      }

      await refresh();
      setNotice(
        payload.warning
          ? `Finalist selection saved. Review required: ${payload.warning}`
          : `Selected ${payload.finalistCount} finalists.`,
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not select finalists.",
      );
    } finally {
      setSaving(null);
    }
  };

  const handleSelectFinalists = () => {
    setConfirmState({
      open: true,
      title: "Select Finalists",
      description: `Select the top ${snapshot?.finalistCount ?? finalistCount} teams as finalists? This replaces the current selection with the latest ranking.`,
      confirmLabel: "Select Finalists",
      destructive: false,
      onConfirm: () => {
        setConfirmState((prev) => ({ ...prev, open: false }));
        void executeSelectFinalists();
      },
    });
  };

  const executeResetRound2Scores = async () => {
    setSaving("reset");
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/admin/round2/reset", {
        method: "POST",
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not reset Round 2 scores.");
      }

      await refresh();

      setNotice(
        `Round 2 reset complete. ${payload.deletedMarks} saved marks cleared. Existing finalist selections remain unchanged until you select finalists again.`,
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not reset Round 2 scores.",
      );
    } finally {
      setSaving(null);
    }
  };

  const handleResetRound2Scores = () => {
    setConfirmState({
      open: true,
      title: "Reset Round 2 Scores",
      description: "Reset all Round 2 marks? This cannot be undone. Round 1 scores, team registrations, scoring settings, and finalist selections will remain unchanged.",
      confirmLabel: "Reset Scores",
      destructive: true,
      onConfirm: () => {
        setConfirmState((prev) => ({ ...prev, open: false }));
        void executeResetRound2Scores();
      },
    });
  };

  const executeToggleFinalResults = async (nextPublished: boolean) => {
    try {
      setError("");
      setNotice("");

      const response = await fetch("/api/admin/round2/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          published: nextPublished,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Could not update publication status.");
      }

      setNotice(data.message);
      await refresh();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    }
  };

  const handleToggleFinalResults = () => {
    if (!snapshot) return;

    const nextPublished = !snapshot.publishFinalResults;

    if (nextPublished && snapshot.resetAwaitingReevaluation) {
      setError("Complete Round 2 re-evaluation before publishing results.");
      return;
    }

    setConfirmState({
      open: true,
      title: nextPublished ? "Publish Final Results" : "Unpublish Final Results",
      description: nextPublished
        ? "Publish final results? Participants will see Round 2 marks and their selection status."
        : "Unpublish final results? Participants will return to the Round 1 leaderboard.",
      confirmLabel: nextPublished ? "Publish Results" : "Unpublish Results",
      destructive: !nextPublished,
      onConfirm: () => {
        setConfirmState((prev) => ({ ...prev, open: false }));
        void executeToggleFinalResults(nextPublished);
      },
    });
  };

  const toggleFinalist = async (row: Round2Row) => {
    setSaving(row.teamId);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `/api/admin/round2/teams/${encodeURIComponent(row.teamId)}/finalist`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isFinalist: !row.isFinalist }),
        },
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not update finalist.");
      }

      setNotice(
        `${row.teamName} ${row.isFinalist ? "removed from" : "added to"} finalists.`,
      );
      await refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not update finalist.",
      );
    } finally {
      setSaving(null);
    }
  };

  const exportCsv = () => {
    if (!rows.length) return;

    const headers = [
      "Rank",
      "Team",
      ...Array.from({ length: 10 }, (_, i) => `Q${i + 1} Earned`),
      ...Array.from({ length: 10 }, (_, i) => `Q${i + 1} Maximum`),
      "Section A Earned",
      "Section A Maximum",
      "Section B Earned",
      "Section B Maximum",
      "Section C Earned",
      "Section C Maximum",
      "Round 1 Earned",
      "Round 1 Maximum",
      "Round 1 Percentage",
      "Round 2 Earned",
      "Round 2 Maximum",
      "Round 2 Percentage",
      "Round 1 Weight",
      "Round 2 Weight",
      "Combined Score",
      "Finalist",
      "Tie Warning",
      "Ranking Explanation",
    ];

    const escapeCsv = (value: string | number | boolean) =>
      `"${String(value).replaceAll('"', '""')}"`;

    const lines = [
      headers.map(escapeCsv).join(","),
      ...rows.map((row) =>
        [
          row.rank,
          row.teamName,
          ...row.marks,
          ...questionMaxMarks,
          row.sectionA,
          row.sectionAMax,
          row.sectionB,
          row.sectionBMax,
          row.sectionC,
          row.sectionCMax,
          row.round1Score,
          row.round1MaxMarks,
          row.round1Percent,
          row.round2Total,
          row.round2MaxMarks,
          row.round2Percent,
          weightRound1,
          weightRound2,
          row.combined,
          row.isFinalist ? "Yes" : "No",
          row.cutLineTie ? "Cut-line tie" : row.suddenDeathTie ? "Exact tie" : "",
          row.whyRankedHere,
        ]
          .map(escapeCsv)
          .join(","),
      ),
    ];

    const blob = new Blob(["\uFEFF", lines.join("\r\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "round-2-results.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const finalistTotal = rows.filter((row) => row.isFinalist).length;

  const renderTable = (tableRows: Round2Row[], title: string) => (
    <section className="glass-card p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold tracking-tight text-foreground">{title}</h2>
        <span className="rounded-full bg-pink-50 border border-pink-200/70 px-2.5 py-0.5 text-xs font-semibold text-primary">
          {tableRows.length} teams
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-light bg-white shadow-xs">
        <table className="w-full min-w-[1700px] border-collapse text-left text-sm">
          <thead className="border-b border-neutral-light bg-[#FBF7FA] text-xs font-semibold uppercase tracking-wider text-muted">
            <tr>
              <th className="px-3.5 py-3">Rank</th>
              <th className="px-3.5 py-3">Team</th>
              {questionMaxMarks.map((maximum, index) => (
                <th key={index} className="px-2 py-3 text-center">
                  Q{index + 1}
                  <span className="block normal-case text-muted font-normal text-[10px]">
                    /{maximum}
                  </span>
                </th>
              ))}
              <th className="px-3 py-3">Sec A</th>
              <th className="px-3 py-3">Sec B</th>
              <th className="px-3 py-3">Sec C</th>
              <th className="px-3 py-3">R2 Raw</th>
              <th className="px-3 py-3">R2 %</th>
              <th className="px-3 py-3">R1 Raw</th>
              <th className="px-3 py-3">R1 %</th>
              <th className="px-3 py-3">R1 Correct Time</th>
              <th className="px-3 py-3">Combined</th>
              <th className="px-3 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-light">
            {tableRows.map((row) => (
              <tr key={row.teamId} className="hover:bg-neutral-50/60 transition-colors">
                <td className="px-3.5 py-3 font-bold text-foreground">
                  {row.rank}
                  {row.cutLineTie && (
                    <span className="ml-1 text-amber-500" title="Cut-line tie">
                      ⚠
                    </span>
                  )}
                </td>
                <td
                  className="max-w-52 truncate px-3.5 py-3 font-semibold text-foreground"
                  title={row.teamName}
                >
                  {row.teamName}
                </td>
                {row.marks.map((mark, index) => {
                  const key = `${row.teamId}-${index + 1}`;
                  return (
                    <td key={index} className="px-1.5 py-2 text-center">
                      <input
                        aria-label={`${row.teamName} question ${index + 1} marks`}
                        className="w-14 rounded-lg border border-neutral-light bg-[#FAF7F9] px-1.5 py-1 text-center text-sm font-semibold text-foreground outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
                        type="number"
                        min={0}
                        max={questionMaxMarks[index]}
                        step={1}
                        value={draftMarks[key] ?? String(mark)}
                        disabled={saving !== null}
                        onChange={(event) =>
                          setDraftMarks((current) => ({
                            ...current,
                            [key]: event.target.value,
                          }))
                        }
                      />
                    </td>
                  );
                })}
                <td className="px-3 py-3 tabular-nums text-muted font-medium">
                  {row.sectionA}/{row.sectionAMax}
                </td>
                <td className="px-3 py-3 tabular-nums text-muted font-medium">
                  {row.sectionB}/{row.sectionBMax}
                </td>
                <td className="px-3 py-3 tabular-nums text-muted font-medium">
                  {row.sectionC}/{row.sectionCMax}
                </td>
                <td className="px-3 py-3 font-bold tabular-nums text-foreground">
                  {row.round2Total}/{row.round2MaxMarks}
                </td>
                <td className="px-3 py-3 tabular-nums text-foreground font-medium">
                  {row.round2Percent.toFixed(2)}%
                </td>
                <td className="px-3 py-3 tabular-nums text-muted">
                  {row.round1Score}/{row.round1MaxMarks}
                </td>
                <td className="px-3 py-3 tabular-nums text-foreground">
                  {row.round1Percent.toFixed(2)}%
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <div className="tabular-nums text-xs font-medium text-foreground">
                    {formatCorrectTime(row.totalCorrectMs)}
                  </div>
                  {row.whyRankedHere.includes(
                    "lower Round 1 correct-answer time decided the order",
                  ) && (
                    <span className="mt-1 inline-block rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                      Decided by time
                    </span>
                  )}
                  {row.suddenDeathTie && (
                    <span className="mt-1 inline-block rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-800">
                      {row.cutLineTie ? "Cutoff tie" : "Exact tie"}
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 font-extrabold tabular-nums text-primary">
                  {row.combined.toFixed(2)}%
                </td>
                <td className="px-3 py-3">
                  {snapshot?.resetAwaitingReevaluation ? (
                    <span className="inline-block rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                      Pending re-evaluation
                    </span>
                  ) : (
                    <button
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold shadow-2xs transition active:scale-[0.98] ${
                        row.isFinalist
                          ? "border border-pink-200 bg-pink-50 text-primary hover:bg-pink-100"
                          : "border border-neutral-light bg-white text-foreground hover:bg-neutral-50 hover:border-neutral"
                      }`}
                      disabled={saving !== null}
                      onClick={() => void toggleFinalist(row)}
                    >
                      {row.isFinalist ? "Remove finalist" : "Select finalist"}
                    </button>
                  )}
                  {row.suddenDeathTie && (
                    <span className="mt-1 block text-xs font-medium text-amber-600">
                      {row.cutLineTie ? "Cutoff tie" : "Exact tie"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {tableRows.length === 0 && (
              <tr>
                <td colSpan={25} className="px-4 py-10 text-center text-sm text-muted">
                  No teams in this list.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );

  return (
    <section className="mx-auto max-w-[1800px] space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Administration
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Round 2 Evaluation
          </h1>
          <p className="mt-1 text-sm text-muted">
            Dynamic marks entry, transparent score synthesis, and finalist shortlisting.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            className="rounded-xl border border-neutral-light bg-white/80 px-4 py-2 text-sm font-semibold text-foreground shadow-xs transition hover:bg-white hover:border-neutral active:scale-[0.98] disabled:opacity-50"
            onClick={() => void refresh()}
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
          <button
            className="rounded-xl border border-neutral-light bg-white/80 px-4 py-2 text-sm font-semibold text-foreground shadow-xs transition hover:bg-white hover:border-neutral active:scale-[0.98] disabled:opacity-50"
            onClick={exportCsv}
            disabled={!rows.length}
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={handleToggleFinalResults}
            disabled={
              !snapshot ||
              (snapshot.resetAwaitingReevaluation && !snapshot.publishFinalResults)
            }
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition shadow-sm active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${
              snapshot?.publishFinalResults
                ? "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                : "bg-primary text-white hover:bg-primary-hover"
            }`}
          >
            {snapshot?.publishFinalResults
              ? "Unpublish Final Results"
              : "Publish Final Results"}
          </button>
        </div>
      </header>

      {/* Alerts */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          {notice}
        </div>
      )}

      {snapshot?.cutLineTie && (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
        >
          A tie crosses the finalist cutoff. Review the tie-break decision before confirming the shortlist.
        </div>
      )}

      {cutoffTieTeams.length > 0 && (
        <section
          role="alert"
          className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5"
        >
          <h2 className="font-bold text-amber-900">
            Finalist cutoff tie requires manual review
          </h2>
          <p className="mt-1 text-sm text-amber-800">
            Automatic selection was blocked. Review these teams before manually finalizing the shortlist. Existing finalist selections have not been changed by the blocked request.
          </p>

          <div className="mt-4 overflow-x-auto rounded-xl border border-amber-200 bg-white">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="border-b border-amber-200 bg-amber-100/50 text-xs font-semibold uppercase tracking-wider text-amber-900">
                <tr>
                  <th className="p-3">Team</th>
                  <th className="p-3">Rank</th>
                  <th className="p-3">Combined</th>
                  <th className="p-3">Round 2 %</th>
                  <th className="p-3">Round 1 %</th>
                  <th className="p-3">Section C</th>
                  <th className="p-3">Correct Time</th>
                  <th className="p-3">Comparison</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100">
                {cutoffTieTeams.map((team) => (
                  <tr key={team.teamId} className="hover:bg-amber-50/30">
                    <td className="p-3 font-semibold text-foreground">{team.teamName}</td>
                    <td className="p-3 font-medium">{team.rank}</td>
                    <td className="p-3 font-bold text-primary">{team.combined.toFixed(2)}</td>
                    <td className="p-3">{team.round2Percent.toFixed(2)}%</td>
                    <td className="p-3">{team.round1Percent.toFixed(2)}%</td>
                    <td className="p-3">{team.sectionC}</td>
                    <td className="p-3">{(team.totalCorrectMs / 1000).toFixed(2)} s</td>
                    <td className="p-3 text-xs text-muted">{team.whyRankedHere}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Metric Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Registered Teams", value: snapshot?.totalTeams ?? "—" },
          { label: "Current Finalists", value: finalistTotal },
          { label: "Target Finalists", value: snapshot?.finalistCount ?? finalistCount },
          { label: "Round 2 Max Marks", value: round2MaxMarks },
        ].map((item) => (
          <div key={item.label} className="glass-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              {item.label}
            </p>
            <p className="mt-1 text-3xl font-extrabold tracking-tight text-foreground">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* Scoring Configuration Panel */}
      <section className="glass-card p-6">
        <h2 className="text-lg font-bold tracking-tight text-foreground">
          Scoring Configuration
        </h2>
        <p className="mt-0.5 text-sm text-muted">
          Round 1 % = earned / active max × 100. Round 2 % = earned / configured max × 100. Combined = R1% × Weight + R2% × Weight.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <label className="space-y-1.5 text-sm">
            <span className="font-semibold text-foreground">Round 1 Weight (%)</span>
            <input
              className="w-full rounded-xl border border-neutral-light bg-white px-3.5 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              type="number"
              min={0}
              max={100}
              value={weightRound1}
              onChange={(event) => setWeightRound1(Number(event.target.value))}
            />
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="font-semibold text-foreground">Round 2 Weight (%)</span>
            <input
              className="w-full rounded-xl border border-neutral-light bg-white px-3.5 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              type="number"
              min={0}
              max={100}
              value={weightRound2}
              onChange={(event) => setWeightRound2(Number(event.target.value))}
            />
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="font-semibold text-foreground">Number of Finalists</span>
            <input
              className="w-full rounded-xl border border-neutral-light bg-white px-3.5 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              type="number"
              min={1}
              max={500}
              value={finalistCount}
              onChange={(event) => setFinalistCount(Number(event.target.value))}
            />
          </label>
        </div>

        <h3 className="mt-6 font-bold text-foreground">Maximum Marks per Question</h3>
        <p className="mt-0.5 text-sm text-muted">
          Change each maximum to match the marking scheme. Total and section maximums update immediately.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-5 lg:grid-cols-10">
          {questionMaxMarks.map((maximum, index) => (
            <label key={index} className="space-y-1 text-center text-xs">
              <span className="font-semibold text-muted">Q{index + 1}</span>
              <input
                className="w-full rounded-xl border border-neutral-light bg-white px-2 py-1.5 text-center text-sm font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                type="number"
                min={1}
                max={10000}
                step={1}
                value={maximum}
                onChange={(event) =>
                  setQuestionMaxMarks((current) =>
                    current.map((value, i) =>
                      i === index ? Number(event.target.value) : value,
                    ),
                  )
                }
              />
            </label>
          ))}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          {[
            { label: "Section A Maximum", value: sectionAMax },
            { label: "Section B Maximum", value: sectionBMax },
            { label: "Section C Maximum", value: sectionCMax },
            { label: "Total Maximum", value: round2MaxMarks },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-neutral-light bg-white/70 p-3 shadow-2xs"
            >
              <p className="text-xs font-medium text-muted">{item.label}</p>
              <p className="mt-0.5 text-lg font-bold text-foreground">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-4">
          <button
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover active:scale-[0.98] disabled:opacity-50"
            onClick={() => void saveSettings()}
            disabled={saving !== null}
          >
            {saving === "settings" ? "Saving..." : "Save scoring settings"}
          </button>
          <span
            className={`text-xs font-semibold ${
              weightRound1 + weightRound2 === 100
                ? "text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200"
                : "text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200"
            }`}
          >
            Weights total: {weightRound1 + weightRound2}%
          </span>
        </div>
      </section>

      {/* Mark Entry & Search Card */}
      <section className="glass-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              Mark Entry & Search
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              Changes stay as drafts until saved. Rankings update after all changes are saved successfully.
            </p>
            <p
              aria-live="polite"
              className={`mt-2 text-xs font-semibold ${
                pendingMarksCount > 0
                  ? "text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 inline-block"
                  : "text-muted"
              }`}
            >
              {pendingMarksCount > 0
                ? `⚡ ${pendingMarksCount} unsaved mark change${pendingMarksCount > 1 ? "s" : ""}`
                : "All marks saved"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              className="w-full sm:w-64 rounded-xl border border-neutral-light bg-white px-3.5 py-2 text-sm text-foreground outline-none placeholder:text-muted transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search teams..."
              aria-label="Search teams"
            />
            <button
              type="button"
              className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={saving !== null || pendingMarksCount === 0}
              onClick={() => void saveAllMarks()}
            >
              {saving === "batch" ? "Saving all marks..." : "Save All Marks"}
            </button>
          </div>
        </div>

        {loading && !snapshot && (
          <div className="py-12 text-center text-sm text-muted">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mb-2" />
            <p>Loading Round 2...</p>
          </div>
        )}
      </section>

      {snapshot && (
        <>
          {snapshot.resetAwaitingReevaluation && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <h2 className="font-bold text-amber-900">
                Round 2 reset: re-evaluation pending
              </h2>
              <p className="mt-1 text-sm text-amber-800">
                All teams are shown together. Existing finalist labels are unchanged until you finish re-evaluation and select finalists again.
              </p>
            </div>
          )}

          {snapshot.resetAwaitingReevaluation ? (
            renderTable(visibleRows, "All teams")
          ) : (
            <>
              {renderTable(finalists, "Selected Finalists")}
              {renderTable(otherTeams, "Other Teams")}
            </>
          )}
        </>
      )}

      {/* Shortlist Management Controls */}
      <section className="glass-card flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <h2 className="text-base font-bold text-foreground">
            Select Top-Ranked Finalists
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            Replaces the current finalist list using the latest saved ranking. Review ties before confirming.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 shadow-2xs transition hover:bg-red-50 active:scale-[0.98] disabled:opacity-50"
            onClick={handleResetRound2Scores}
            disabled={saving !== null || !snapshot}
          >
            {saving === "reset" ? "Resetting..." : "Reset Round 2 Scores"}
          </button>

          <button
            className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover active:scale-[0.98] disabled:opacity-50"
            onClick={handleSelectFinalists}
            disabled={saving !== null || !snapshot || rows.length === 0}
          >
            {saving === "finalists"
              ? "Selecting..."
              : `Select top ${snapshot?.finalistCount ?? finalistCount}`}
          </button>
        </div>
      </section>

      {/* Tie Break Info */}
      <section className="glass-card p-6">
        <h2 className="text-base font-bold text-foreground">
          Ranking & Tie-Break Details
        </h2>
        <p className="mt-0.5 text-sm text-muted">
          Ranking priority: Combined score &gt; Round 2 % &gt; Round 1 % &gt; Section C raw score &gt; Lower Round 1 correct-answer time. Exact ties require manual review.
        </p>
        <div className="mt-4 space-y-2">
          {rows
            .filter((row) => row.suddenDeathTie)
            .map((row) => (
              <div
                key={row.teamId}
                className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm"
              >
                <span className="font-semibold text-foreground">{row.teamName}</span>
                <span className="text-muted"> · Rank {row.rank} · </span>
                <span className="font-medium text-amber-900">{row.whyRankedHere}</span>
              </div>
            ))}
          {!rows.some((row) => row.suddenDeathTie) && (
            <p className="text-sm text-muted italic">No exact ties detected.</p>
          )}
        </div>
      </section>

      {/* Reusable Confirm Dialog */}
      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        confirmLabel={confirmState.confirmLabel}
        destructive={confirmState.destructive}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((prev) => ({ ...prev, open: false }))}
      />
    </section>
  );
}
