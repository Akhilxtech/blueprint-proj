
"use client";

import { useCallback, useEffect, useState } from "react";

type Statement = {
  id: string;
  title: string;
  domain: string;
  enabled: boolean;
  maxTeams: number | null;
  _count: { selections: number };
};

type Selection = {
  id: string;
  statementId: string;
  selectedAt: string;
  assignedByAdmin: boolean;
  resetCount: number;
  statement: {
    id: string;
    title: string;
    domain: string;
    enabled: boolean;
  };
};

type Submission = {
  url: string;
  submittedAt: string;
  updatedAt: string;
};

type Team = {
  id: string;
  name: string;
  isFinalist: boolean;
  selectionResetCount: number;
  round3Selection: Selection | null;
  deploymentSubmission: Submission | null;
};

type ApiData = {
  teams: Team[];
  statements: Statement[];
};

const buttonClass =
  "rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50";

function formatDate(value: string | null | undefined) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Invalid date";

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function isSafeHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export default function TeamsManager() {
  const [data, setData] = useState<ApiData>({
    teams: [],
    statements: [],
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [assignments, setAssignments] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/round3/teams", {
        cache: "no-store",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Could not load team data.");
      }

      const apiData = result as ApiData;

      setData(apiData);

      setAssignments((current) => {
        const next = { ...current };

        for (const team of apiData.teams) {
          if (!(team.id in next)) {
            next[team.id] = team.round3Selection?.statementId ?? "";
          }
        }

        return next;
      });

      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load team data.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

useEffect(() => {
  const initial = window.setTimeout(() => {
    void loadData();
  }, 0);

  const interval = window.setInterval(() => {
    void loadData();
  }, 5000);

  return () => {
    window.clearTimeout(initial);
    window.clearInterval(interval);
  };
}, [loadData]);
  async function assignStatement(team: Team) {
    const statementId = assignments[team.id];

    if (!statementId) {
      setError("Choose a problem statement before assigning.");
      return;
    }

    const existing = team.round3Selection;

    if (
      existing?.statementId === statementId &&
      existing.assignedByAdmin
    ) {
      setMessage("This statement is already assigned by an administrator.");
      return;
    }

    const statement = data.statements.find(
      (item) => item.id === statementId,
    );

    if (!statement) {
      setError("The selected problem statement was not found.");
      return;
    }

    const action = existing ? "reassign" : "assign";

    if (
      !window.confirm(
        `${action === "assign" ? "Assign" : "Reassign"} "${statement.title}" to "${team.name}"?`,
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/round3/teams", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: team.id, statementId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Assignment failed.");
      }

      setMessage(`Statement ${action}ed for ${team.name}.`);
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Assignment failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function resetOne(team: Team) {
    if (!team.round3Selection) {
      setError(`${team.name} has no active selection.`);
      return;
    }

    const confirmed = window.confirm(
      `Reset ${team.name}'s selection of "${team.round3Selection.statement.title}"? Their deliverable progress for that statement will also be cleared. Their team record and deployment submission will remain.`,
    );

    if (!confirmed) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/round3/teams", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "one", teamId: team.id }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Could not reset selection.");
      }

      setMessage(
        result.reset
          ? `Selection reset for ${team.name}.`
          : `${team.name} had no active selection.`,
      );

      setAssignments((current) => ({ ...current, [team.id]: "" }));
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not reset selection.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function resetAll() {
    const selectedCount = data.teams.filter(
      (team) => team.round3Selection,
    ).length;

    if (selectedCount === 0) {
      setError("There are no active selections to reset.");
      return;
    }

    if (
      !window.confirm(
        `Reset all ${selectedCount} active Round 3 selections? Team records, participants, and deployment submissions will remain. Deliverable progress for active selections will be cleared.`,
      )
    ) {
      return;
    }

    const typedConfirmation = window.prompt(
      'Type RESET ALL to confirm resetting every active Round 3 selection.',
    );

    if (typedConfirmation !== "RESET ALL") return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/round3/teams", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "all",
          confirm: "RESET_ALL_SELECTIONS",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Could not reset all selections.");
      }

      setMessage(`Reset ${result.resetCount} team selection(s).`);
      setAssignments({});
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not reset selections.",
      );
    } finally {
      setBusy(false);
    }
  }

  const finalists = data.teams.filter((team) => team.isFinalist);
  const selectedTeams = data.teams.filter(
    (team) => team.round3Selection,
  );
  const unselectedFinalists = finalists.filter(
    (team) => !team.round3Selection,
  );
  const submittedTeams = data.teams.filter(
    (team) => team.deploymentSubmission,
  );

  const filteredTeams = data.teams.filter((team) => {
    const matchesSearch = team.name
      .toLowerCase()
      .includes(search.trim().toLowerCase());

    const matchesFilter =
      filter === "all" ||
      (filter === "finalists" && team.isFinalist) ||
      (filter === "selected" && Boolean(team.round3Selection)) ||
      (filter === "unselected-finalists" &&
        team.isFinalist &&
        !team.round3Selection) ||
      (filter === "submitted" && Boolean(team.deploymentSubmission));

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="mt-10 space-y-8">
      <section>
        <h2 className="text-2xl font-bold">Team Management</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Manage finalist assignments, review submissions, and reset Round 3
          selections without deleting team records.
        </p>
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
        >
          {error}
          <button
            type="button"
            className="ml-3 underline"
            onClick={() => setError("")}
          >
            Dismiss
          </button>
        </div>
      )}

      {message && (
        <p role="status" className="text-sm text-emerald-400">
          {message}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-zinc-400">Loading team management...</p>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "All teams", value: data.teams.length },
              { label: "Finalist teams", value: finalists.length },
              { label: "Active selections", value: selectedTeams.length },
              {
                label: "Unselected finalists",
                value: unselectedFinalists.length,
              },
            ].map((item) => (
              <article
                key={item.label}
                className="rounded-xl border border-white/10 bg-zinc-900 p-5"
              >
                <p className="text-sm text-zinc-400">{item.label}</p>
                <p className="mt-2 text-3xl font-bold">{item.value}</p>
              </article>
            ))}
          </section>

          <section className="rounded-2xl border border-white/10 bg-zinc-900 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Statement capacity</h3>
                <p className="mt-1 text-sm text-zinc-400">
                  Counts reflect all active selections, including selections
                  made by teams themselves.
                </p>
              </div>

              <button
                type="button"
                disabled={busy || selectedTeams.length === 0}
                className="rounded-lg border border-red-500/30 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                onClick={() => void resetAll()}
              >
                Reset all selections
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {data.statements.map((statement) => {
                const count = statement._count.selections;
                const full =
                  statement.maxTeams !== null &&
                  count >= statement.maxTeams;

                return (
                  <div
                    key={statement.id}
                    className="rounded-xl border border-white/10 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{statement.title}</p>
                        <p className="mt-1 text-sm text-zinc-400">
                          {statement.domain}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs ${
                          !statement.enabled
                            ? "bg-zinc-800 text-zinc-400"
                            : full
                              ? "bg-red-500/10 text-red-300"
                              : "bg-emerald-500/10 text-emerald-300"
                        }`}
                      >
                        {!statement.enabled
                          ? "Disabled"
                          : full
                            ? "Full"
                            : "Available"}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className={`h-full rounded-full ${
                            full ? "bg-red-400" : "bg-violet-500"
                          }`}
                          style={{
                            width:
                              statement.maxTeams === null
                                ? "0%"
                                : `${Math.min(100, (count / statement.maxTeams) * 100)}%`,
                          }}
                        />
                      </div>

                      <span className="whitespace-nowrap text-xs text-zinc-400">
                        {count} / {statement.maxTeams ?? "∞"} teams
                      </span>
                    </div>
                  </div>
                );
              })}

              {data.statements.length === 0 && (
                <p className="text-sm text-zinc-400">
                  No problem statements exist yet.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-zinc-900 p-6">
            <h3 className="text-lg font-semibold">Teams and assignments</h3>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input
                className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm"
                placeholder="Search team name..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />

              <select
                className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              >
                <option value="all">All teams</option>
                <option value="finalists">Finalists only</option>
                <option value="selected">Teams with selections</option>
                <option value="unselected-finalists">
                  Unselected finalists
                </option>
                <option value="submitted">Teams with submissions</option>
              </select>
            </div>

            <p className="mt-3 text-xs text-zinc-500">
              Showing {filteredTeams.length} of {data.teams.length} teams.
            </p>

            <div className="mt-5 space-y-4">
              {filteredTeams.map((team) => {
                const selection = team.round3Selection;
                const submission = team.deploymentSubmission;

                const selectedStatement = data.statements.find(
                  (statement) =>
                    statement.id === selection?.statementId,
                );

                const currentAssignment =
                  assignments[team.id] ??
                  selection?.statementId ??
                  "";

                return (
                  <article
                    key={team.id}
                    className="rounded-xl border border-white/10 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h4 className="font-semibold">{team.name}</h4>

                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          <span
                            className={`rounded-full px-2.5 py-1 ${
                              team.isFinalist
                                ? "bg-violet-500/10 text-violet-300"
                                : "bg-zinc-800 text-zinc-400"
                            }`}
                          >
                            {team.isFinalist ? "Finalist" : "Not a finalist"}
                          </span>

                          <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-zinc-300">
                            Resets: {team.selectionResetCount}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs ${
                          selection
                            ? "bg-emerald-500/10 text-emerald-300"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {selection ? "Selected" : "Unselected"}
                      </span>
                    </div>

                    <div className="mt-4 rounded-lg bg-zinc-950 p-3">
                      <p className="text-xs text-zinc-500">
                        Current problem statement
                      </p>

                      <p className="mt-1 font-medium">
                        {selection?.statement.title ?? "No selection"}
                      </p>

                      {selection && (
                        <div className="mt-2 space-y-1 text-xs text-zinc-400">
                          <p>
                            Selected at: {formatDate(selection.selectedAt)}
                          </p>
                          <p>
                            Assignment type:{" "}
                            {selection.assignedByAdmin
                              ? "Administrator assigned"
                              : "Selected by team"}
                          </p>
                          <p>
                            Selection record resets: {selection.resetCount}
                          </p>
                        </div>
                      )}

                      {selection &&
                        selectedStatement &&
                        !selectedStatement.enabled && (
                          <p className="mt-2 text-xs text-amber-300">
                            This statement is disabled for new selections.
                          </p>
                        )}
                    </div>

                    {team.isFinalist && (
                      <div className="mt-4 space-y-3">
                        <label className="block space-y-2 text-sm">
                          <span>Assign or reassign statement</span>

                          <select
                            className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm"
                            value={currentAssignment}
                            onChange={(event) =>
                              setAssignments((current) => ({
                                ...current,
                                [team.id]: event.target.value,
                              }))
                            }
                          >
                            <option value="">Choose a statement</option>

                            {data.statements
                              .filter(
                                (statement) =>
                                  statement.enabled ||
                                  statement.id === selection?.statementId,
                              )
                              .map((statement) => {
                                const full =
                                  statement.maxTeams !== null &&
                                  statement._count.selections >=
                                    statement.maxTeams &&
                                  statement.id !== selection?.statementId;

                                return (
                                  <option
                                    key={statement.id}
                                    value={statement.id}
                                    disabled={full}
                                  >
                                    {statement.title}
                                    {full ? " (Full)" : ""}
                                  </option>
                                );
                              })}
                          </select>
                        </label>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={
                              busy ||
                              !currentAssignment ||
                              currentAssignment === selection?.statementId
                            }
                            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold hover:bg-violet-500 disabled:opacity-50"
                            onClick={() => void assignStatement(team)}
                          >
                            {selection ? "Reassign statement" : "Assign statement"}
                          </button>

                          <button
                            type="button"
                            disabled={busy || !selection}
                            className="rounded-lg border border-red-500/30 px-3 py-2 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                            onClick={() => void resetOne(team)}
                          >
                            Reset selection
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="mt-4 border-t border-white/10 pt-4">
                      <p className="text-sm font-medium">
                        Deployment submission
                      </p>

                      {submission ? (
                        <div className="mt-2 space-y-1 text-sm">
                          {isSafeHttpUrl(submission.url) ? (
                            <a
                              href={submission.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="break-all text-violet-300 underline hover:text-violet-200"
                            >
                              {submission.url}
                            </a>
                          ) : (
                            <p className="break-all text-amber-300">
                              Invalid or unsupported URL: {submission.url}
                            </p>
                          )}

                          <p className="text-xs text-zinc-400">
                            Submitted: {formatDate(submission.submittedAt)}
                          </p>
                          <p className="text-xs text-zinc-500">
                            Last updated: {formatDate(submission.updatedAt)}
                          </p>
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-zinc-500">
                          No deployment submitted.
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}

              {filteredTeams.length === 0 && (
                <p className="text-sm text-zinc-400">
                  No teams match the current filter.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-zinc-900 p-6">
            <h3 className="text-lg font-semibold">Submission summary</h3>
            <p className="mt-1 text-sm text-zinc-400">
              {submittedTeams.length} of {data.teams.length} teams have submitted
              a deployment URL.
            </p>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-violet-500"
                style={{
                  width:
                    data.teams.length === 0
                      ? "0%"
                      : `${(submittedTeams.length / data.teams.length) * 100}%`,
                }}
              />
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={busy}
              className={buttonClass}
              onClick={() => void loadData()}
            >
              Refresh team data
            </button>

            <span className="text-xs text-zinc-500">
              Data refreshes when you load this page or use Refresh.
            </span>
          </div>
        </>
      )}
    </div>
  );
}
