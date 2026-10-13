
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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

const panel = "rounded-2xl border border-white/10 bg-zinc-900 p-5";
const button =
  "rounded-lg border border-white/15 px-3 py-2 text-sm font-medium transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50";
const field =
  "rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-pink-500";
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

      if (
        !Number.isInteger(marks) ||
        marks < 0 ||
        marks > maximum
      ) {
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

  const selectFinalists = async () => {
   

    const confirmed = window.confirm(
      `Select the top ${snapshot?.finalistCount ?? finalistCount} teams as finalists? This replaces the current selection.`,
    );
    if (!confirmed) return;

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


const resetRound2Scores = async () => {
  const confirmed = window.confirm(
    "Reset all Round 2 marks? This cannot be undone. Round 1 scores, team registrations, scoring settings, and finalist selections will remain unchanged.",
  );

  if (!confirmed) return;

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


async function toggleFinalResults() {
  if (!snapshot) return;

  const nextPublished = !snapshot.publishFinalResults;

  if (
    nextPublished &&
    snapshot.resetAwaitingReevaluation
  ) {
    setError(
      "Complete Round 2 re-evaluation before publishing results.",
    );
    return;
  }

  const confirmed = window.confirm(
    nextPublished
      ? "Publish final results? Participants will see Round 2 marks and selection status."
      : "Unpublish final results? Participants will return to the Round 1 leaderboard.",
  );

  if (!confirmed) return;

  try {
    setError("");
    setNotice("");

    const response = await fetch(
      "/api/admin/round2/publish",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          published: nextPublished,
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ?? "Could not update publication status.",
      );
    }

    setNotice(data.message);
    await refresh();
  } catch (error) {
    setError(
      error instanceof Error
        ? error.message
        : "Something went wrong.",
    );
  }
}



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

    

    



    <section className={panel}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        <span className="text-sm text-zinc-400">{tableRows.length} teams</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1700px] border-collapse text-left text-sm">
          <thead className="bg-black/30 text-xs uppercase tracking-wide text-zinc-400">
            <tr>
              <th className="px-3 py-3">Rank</th>
              <th className="px-3 py-3">Team</th>
              {questionMaxMarks.map((maximum, index) => (
                <th key={index} className="px-2 py-3 text-center">
                  Q{index + 1}
                  <span className="block normal-case">/{maximum}</span>
                </th>
              ))}
              <th className="px-3 py-3">A</th>
              <th className="px-3 py-3">B</th>
              <th className="px-3 py-3">C</th>
              <th className="px-3 py-3">R2 raw</th>
              <th className="px-3 py-3">R2 %</th>
         <th className="px-3 py-3">R1 raw</th>
<th className="px-3 py-3">R1 %</th>
<th className="px-3 py-3">R1 correct time</th>
              <th className="px-3 py-3">Combined</th>
              <th className="px-3 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {tableRows.map((row) => (
              <tr key={row.teamId} className="hover:bg-white/[0.025]">
                <td className="px-3 py-3 font-semibold">
                  {row.rank}
                  {row.cutLineTie && <span className="ml-1 text-amber-300">⚠</span>}
                </td>
                <td className="max-w-52 truncate px-3 py-3 font-medium" title={row.teamName}>
                  {row.teamName}
                </td>
                {row.marks.map((mark, index) => {
                  const key = `${row.teamId}-${index + 1}`;
                  return (
                    <td key={index} className="px-1 py-2">
                      <input
                        aria-label={`${row.teamName} question ${index + 1} marks`}
                        className="w-16 rounded-md border border-white/10 bg-black/30 px-2 py-2 text-center outline-none focus:border-pink-500"
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
                <td className="px-3 py-3">{row.sectionA}/{row.sectionAMax}</td>
                <td className="px-3 py-3">{row.sectionB}/{row.sectionBMax}</td>
                <td className="px-3 py-3">{row.sectionC}/{row.sectionCMax}</td>
                <td className="px-3 py-3 font-semibold">
                  {row.round2Total}/{row.round2MaxMarks}
                </td>
                <td className="px-3 py-3">{row.round2Percent.toFixed(2)}%</td>
                <td className="px-3 py-3">
                  {row.round1Score}/{row.round1MaxMarks}
                </td>
              
<td className="px-3 py-3">{row.round1Percent.toFixed(2)}%</td>

<td className="px-3 py-3 whitespace-nowrap">
  <div>{formatCorrectTime(row.totalCorrectMs)}</div>

  {row.whyRankedHere.includes(
    "lower Round 1 correct-answer time decided the order",
  ) && (
    <span className="mt-1 inline-block rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-200">
      Rank decided by time
    </span>
  )}

  {row.suddenDeathTie && (
    <span className="mt-1 inline-block rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-200">
      {row.cutLineTie
        ? "Manual review: cutoff tie"
        : "Exact tie: review"}
    </span>
  )}
</td>

<td className="px-3 py-3 font-semibold text-pink-300">
  {row.combined.toFixed(2)}%
</td>

              
<td className="px-3 py-3">
  {snapshot?.resetAwaitingReevaluation ? (
    <span className="inline-block rounded-md border border-amber-500/30 px-2 py-1 text-xs font-medium text-amber-200">
      Pending re-evaluation
    </span>
  ) : (
    <button
      className={
        row.isFinalist
          ? "rounded-md bg-pink-600 px-2 py-1 text-xs font-semibold"
          : button
      }
      disabled={saving !== null}
      onClick={() => void toggleFinalist(row)}
    >
      {row.isFinalist ? "Remove finalist" : "Select finalist"}
    </button>
  )}

  {row.suddenDeathTie && (
    <span className="mt-1 block text-xs text-amber-300">
      {row.cutLineTie ? "Cutoff tie" : "Exact tie"}
    </span>
  )}
</td>

              </tr>
            ))}
            {tableRows.length === 0 && (
              <tr>
                <td colSpan={25} className="px-3 py-8 text-center text-zinc-500">
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
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-pink-400">
            Administration
          </p>
          <h1 className="mt-2 text-3xl font-bold">Round 2 Evaluation</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Dynamic marks, transparent calculations, and separate finalist results.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={button} onClick={() => void refresh()} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>
          <button className={button} onClick={exportCsv} disabled={!rows.length}>
            Export CSV
          </button>


<button
  type="button"
  onClick={toggleFinalResults}
  disabled={
    !snapshot ||
    (snapshot.resetAwaitingReevaluation &&
      !snapshot.publishFinalResults)
  }
  className="rounded-md bg-pink-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
>
  {snapshot?.publishFinalResults
    ? "Unpublish Final Results"
    : "Publish Final Results"}
</button>

        </div>
      </header>

      {error && (
        <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

{cutoffTieTeams.length > 0 && (
  <section
    role="alert"
    className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4"
  >
    <h2 className="font-semibold text-amber-200">
      Finalist cutoff tie requires manual review
    </h2>

    <p className="mt-1 text-sm text-zinc-300">
      Automatic selection was blocked. Review these teams before
      manually finalizing the shortlist. Existing finalist selections
      have not been changed by the blocked request.
    </p>

    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[850px] text-left text-sm">
        <thead className="text-zinc-400">
          <tr>
            <th className="p-2">Team</th>
            <th className="p-2">Rank</th>
            <th className="p-2">Combined</th>
            <th className="p-2">Round 2 %</th>
            <th className="p-2">Round 1 %</th>
            <th className="p-2">Section C</th>
            <th className="p-2">Correct-answer time</th>
            <th className="p-2">Comparison</th>
          </tr>
        </thead>

        <tbody>
          {cutoffTieTeams.map((team) => (
            <tr key={team.teamId} className="border-t border-white/10">
              <td className="p-2 font-medium">{team.teamName}</td>
              <td className="p-2">{team.rank}</td>
              <td className="p-2">{team.combined.toFixed(2)}</td>
              <td className="p-2">{team.round2Percent.toFixed(2)}%</td>
              <td className="p-2">{team.round1Percent.toFixed(2)}%</td>
              <td className="p-2">{team.sectionC}</td>
              <td className="p-2">
                {(team.totalCorrectMs / 1000).toFixed(2)} s
              </td>
              <td className="p-2">{team.whyRankedHere}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
)}

      {notice && (
        <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
          {notice}
        </div>
      )}
      {snapshot?.cutLineTie && (
        <div role="alert" className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
          A tie crosses the finalist cutoff. Review the tie-break decision before confirming the shortlist.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Registered teams", value: snapshot?.totalTeams ?? "—" },
          { label: "Current finalists", value: finalistTotal },
          { label: "Target finalists", value: snapshot?.finalistCount ?? finalistCount },
          { label: "Round 2 maximum marks", value: round2MaxMarks },
        ].map((item) => (
          <div key={item.label} className={panel}>
            <p className="text-sm text-zinc-400">{item.label}</p>
            <p className="mt-2 text-3xl font-bold">{item.value}</p>
          </div>
        ))}
      </div>

      <section className={panel}>
        <h2 className="text-lg font-semibold">Scoring configuration</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Round 1 percentage = earned marks / active quiz maximum × 100.
          Round 2 percentage = Round 2 earned marks / configured Round 2 maximum × 100.
          Combined score = Round 1 percentage × Round 1 weight + Round 2 percentage × Round 2 weight.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-2 text-sm">
            <span className="block text-zinc-300">Round 1 weight (%)</span>
            <input className={`${field} w-full`} type="number" min={0} max={100} value={weightRound1} onChange={(event) => setWeightRound1(Number(event.target.value))} />
          </label>
          <label className="space-y-2 text-sm">
            <span className="block text-zinc-300">Round 2 weight (%)</span>
            <input className={`${field} w-full`} type="number" min={0} max={100} value={weightRound2} onChange={(event) => setWeightRound2(Number(event.target.value))} />
          </label>
          <label className="space-y-2 text-sm">
            <span className="block text-zinc-300">Number of finalists</span>
            <input className={`${field} w-full`} type="number" min={1} max={500} value={finalistCount} onChange={(event) => setFinalistCount(Number(event.target.value))} />
          </label>
        </div>

        <h3 className="mt-6 font-semibold">Maximum marks per question</h3>
        <p className="mt-1 text-sm text-zinc-400">
          Change each maximum to match the marking scheme. The total and section maximums update immediately.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5 lg:grid-cols-10">
          {questionMaxMarks.map((maximum, index) => (
            <label key={index} className="space-y-2 text-sm">
              <span className="block text-zinc-300">Q{index + 1}</span>
              <input
                className={`${field} w-full`}
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

        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          {[
            { label: "Section A maximum", value: sectionAMax },
            { label: "Section B maximum", value: sectionBMax },
            { label: "Section C maximum", value: sectionCMax },
            { label: "Total maximum", value: round2MaxMarks },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-xs text-zinc-400">{item.label}</p>
              <p className="mt-1 text-xl font-semibold">{item.value}</p>
            </div>
          ))}
        </div>

        <button
          className="mt-5 rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-pink-500 disabled:opacity-50"
          onClick={() => void saveSettings()}
          disabled={saving !== null}
        >
          {saving === "settings" ? "Saving..." : "Save scoring settings"}
        </button>
        <p className={`mt-3 text-xs ${weightRound1 + weightRound2 === 100 ? "text-zinc-500" : "text-amber-300"}`}>
          Weights total: {weightRound1 + weightRound2}%
        </p>
      </section>

      <section className={panel}>
        <h2 className="text-lg font-semibold">Ranking and team search</h2>
        <p className="mt-1 text-sm text-zinc-400">
         Marks remain as drafts until you click Save All Marks.
Maximum marks are validated before saving.
        </p>
        <input
          className={`${field} mt-4 w-full sm:max-w-md`}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search teams..."
          aria-label="Search teams"
        />
        {loading && !snapshot && (
          <p className="py-10 text-center text-sm text-zinc-400">Loading Round 2...</p>
        )}
      </section>

   

{snapshot && (
  <>
    {snapshot.resetAwaitingReevaluation && (
      <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
        <h2 className="font-semibold text-amber-200">
          Round 2 reset: re-evaluation pending
        </h2>
        <p className="mt-1 text-sm text-zinc-300">
          All teams are shown together. Existing finalist labels are
          unchanged until you finish re-evaluation and select finalists
          again.
        </p>
      </div>
    )}

    <section className={`${panel} mb-4`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Mark entry</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Changes stay as drafts until you save them.
            Rankings update after all changes are saved successfully.
          </p>

          <p
            aria-live="polite"
            className={`mt-2 text-sm ${
              pendingMarksCount > 0
                ? "text-amber-300"
                : "text-zinc-400"
            }`}
          >
            {pendingMarksCount > 0
              ? `${pendingMarksCount} unsaved mark changes`
              : "All marks saved"}
          </p>
        </div>

        <button
          type="button"
          className="rounded-lg bg-pink-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-pink-500 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={saving !== null || pendingMarksCount === 0}
          onClick={() => void saveAllMarks()}
        >
          {saving === "batch"
            ? "Saving all marks..."
            : "Save All Marks"}
        </button>
      </div>
    </section>

    {snapshot.resetAwaitingReevaluation ? (
      renderTable(visibleRows, "All teams")
    ) : (
      <>
        {renderTable(finalists, "Selected finalists")}
        {renderTable(otherTeams, "Other teams")}
      </>
    )}
  </>
)}



      <section className={`${panel} flex flex-wrap items-center justify-between gap-4`}>
        <div>
          <h2 className="font-semibold">Select top-ranked finalists</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Replaces the current finalist list using the latest saved ranking. Review ties before confirming.
          </p>
        </div>
       
<div className="flex flex-wrap gap-3">
  <button
    className="rounded-lg border border-red-500/40 px-4 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
    onClick={() => void resetRound2Scores()}
    disabled={saving !== null || !snapshot}
  >
    {saving === "reset" ? "Resetting..." : "Reset Round 2 Scores"}
  </button>

  <button
    className="rounded-lg bg-pink-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-pink-500 disabled:opacity-50"
    onClick={() => void selectFinalists()}
    disabled={saving !== null || !snapshot || rows.length === 0}
  >
    {saving === "finalists"
      ? "Selecting..."
      : `Select top ${snapshot?.finalistCount ?? finalistCount}`}
  </button>
</div>

      </section>

      <section className={panel}>
        <h2 className="font-semibold">Ranking and tie-break details</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Ranking priority: combined score, Round 2 percentage, Round 1 percentage, Section C raw score, then lower Round 1 correct-answer time. Exact ties require review.
        </p>
        <div className="mt-4 space-y-2">
          {rows.filter((row) => row.suddenDeathTie).map((row) => (
            <div key={row.teamId} className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm">
              <span className="font-medium">{row.teamName}</span>
              <span className="text-zinc-400"> · Rank {row.rank} · </span>
              <span className="text-amber-200">{row.whyRankedHere}</span>
            </div>
          ))}
          {!rows.some((row) => row.suddenDeathTie) && (
            <p className="text-sm text-zinc-500">No exact ties detected.</p>
          )}
        </div>
      </section>
    </section>
  );
}
