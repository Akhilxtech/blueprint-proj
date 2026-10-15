"use client";

import { useCallback, useEffect, useState } from "react";
import ConfirmDialog from "@/components/confirm-dialog";

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

type DialogState = {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
};

const buttonClass =
  "rounded-xl border border-neutral-light bg-white px-4 py-2 text-sm font-semibold text-foreground shadow-2xs transition hover:bg-neutral-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

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

  // Modal dialog states
  const [confirmState, setConfirmState] = useState<DialogState>({
    open: false,
    title: "",
    description: null,
    confirmLabel: "Confirm",
    onConfirm: () => {},
  });

  const [resetAllModalOpen, setResetAllModalOpen] = useState(false);
  const [typedConfirmation, setTypedConfirmation] = useState("");
  const [resettingAll, setResettingAll] = useState(false);

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

  function handleAssignStatement(team: Team) {
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

    setConfirmState({
      open: true,
      title: `${action === "assign" ? "Assign" : "Reassign"} Statement`,
      description: `${action === "assign" ? "Assign" : "Reassign"} "${statement.title}" to team "${team.name}"?`,
      confirmLabel: `${action === "assign" ? "Assign" : "Reassign"}`,
      destructive: false,
      onConfirm: () => {
        setConfirmState((prev) => ({ ...prev, open: false }));
        void executeAssignStatement(team, statementId, action);
      },
    });
  }

  async function executeAssignStatement(
    team: Team,
    statementId: string,
    action: string,
  ) {
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

  function handleResetOne(team: Team) {
    if (!team.round3Selection) {
      setError(`${team.name} has no active selection.`);
      return;
    }

    setConfirmState({
      open: true,
      title: `Reset ${team.name}'s Selection`,
      description: `Reset ${team.name}'s selection of "${team.round3Selection.statement.title}"? Their deliverable progress for that statement will also be cleared. Their team record and deployment submission will remain.`,
      confirmLabel: "Reset Selection",
      destructive: true,
      onConfirm: () => {
        setConfirmState((prev) => ({ ...prev, open: false }));
        void executeResetOne(team);
      },
    });
  }

  async function executeResetOne(team: Team) {
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

  function openResetAllModal() {
    const selectedCount = data.teams.filter(
      (team) => team.round3Selection,
    ).length;

    if (selectedCount === 0) {
      setError("There are no active selections to reset.");
      return;
    }

    setTypedConfirmation("");
    setResetAllModalOpen(true);
  }

  async function executeResetAll() {
    if (typedConfirmation !== "RESET ALL") return;

    setResettingAll(true);
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
      setResetAllModalOpen(false);
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not reset selections.",
      );
    } finally {
      setResettingAll(false);
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
    <div className="mt-8 space-y-8">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Team Management
        </h2>
        <p className="mt-1 text-sm text-muted">
          Manage finalist problem statement assignments, review deployment submissions, and reset selections without deleting team registrations.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-center justify-between"
        >
          <span>{error}</span>
          <button
            type="button"
            className="text-xs font-semibold text-red-700 underline hover:no-underline ml-3"
            onClick={() => setError("")}
          >
            Dismiss
          </button>
        </div>
      )}

      {message && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          {message}
        </div>
      )}

      {loading ? (
        <div className="py-10 text-center text-sm text-muted">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mb-2" />
          <p>Loading team management...</p>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "All Teams", value: data.teams.length },
              { label: "Finalist Teams", value: finalists.length },
              { label: "Active Selections", value: selectedTeams.length },
              {
                label: "Unselected Finalists",
                value: unselectedFinalists.length,
              },
            ].map((item) => (
              <article key={item.label} className="glass-card p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  {item.label}
                </p>
                <p className="mt-1 text-3xl font-extrabold tracking-tight text-foreground">
                  {item.value}
                </p>
              </article>
            ))}
          </section>

          {/* Statement Capacity */}
          <section className="glass-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-light pb-4">
              <div>
                <h3 className="text-lg font-bold tracking-tight text-foreground">
                  Statement Capacity
                </h3>
                <p className="text-sm text-muted">
                  Capacity counts reflect all active selections, including team self-selections.
                </p>
              </div>

              <button
                type="button"
                disabled={busy || selectedTeams.length === 0}
                className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 shadow-2xs transition hover:bg-red-50 active:scale-[0.98] disabled:opacity-50"
                onClick={openResetAllModal}
              >
                Reset all selections
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {data.statements.map((statement) => {
                const count = statement._count.selections;
                const full =
                  statement.maxTeams !== null && count >= statement.maxTeams;

                return (
                  <div
                    key={statement.id}
                    className="rounded-xl border border-neutral-light bg-white p-4 shadow-2xs"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-foreground">
                          {statement.title}
                        </p>
                        <p className="mt-0.5 text-xs text-muted">
                          {statement.domain}
                        </p>
                      </div>

                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          !statement.enabled
                            ? "border border-neutral-light bg-neutral-100 text-muted"
                            : full
                              ? "border border-rose-200 bg-rose-50 text-rose-700"
                              : "border border-emerald-200 bg-emerald-50 text-emerald-700"
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
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100 border border-neutral-light/50">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            full ? "bg-rose-500" : "bg-primary"
                          }`}
                          style={{
                            width:
                              statement.maxTeams === null
                                ? "0%"
                                : `${Math.min(100, (count / statement.maxTeams) * 100)}%`,
                          }}
                        />
                      </div>

                      <span className="whitespace-nowrap text-xs font-semibold text-foreground tabular-nums">
                        {count} / {statement.maxTeams ?? "∞"} teams
                      </span>
                    </div>
                  </div>
                );
              })}

              {data.statements.length === 0 && (
                <p className="text-sm text-muted italic">
                  No problem statements exist yet.
                </p>
              )}
            </div>
          </section>

          {/* Teams and Assignments */}
          <section className="glass-card p-6">
            <h3 className="text-lg font-bold tracking-tight text-foreground">
              Teams & Assignments
            </h3>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input
                className="w-full rounded-xl border border-neutral-light bg-white px-3.5 py-2 text-sm text-foreground placeholder:text-muted outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Search team name..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />

              <select
                className="w-full rounded-xl border border-neutral-light bg-white px-3.5 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
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

            <p className="mt-3 text-xs text-muted">
              Showing {filteredTeams.length} of {data.teams.length} teams.
            </p>

            <div className="mt-5 space-y-4">
              {filteredTeams.map((team) => {
                const selection = team.round3Selection;
                const submission = team.deploymentSubmission;

                const selectedStatement = data.statements.find(
                  (statement) => statement.id === selection?.statementId,
                );

                const currentAssignment =
                  assignments[team.id] ?? selection?.statementId ?? "";

                return (
                  <article
                    key={team.id}
                    className="rounded-xl border border-neutral-light bg-white p-5 shadow-2xs hover:shadow-soft transition"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-foreground text-base">
                          {team.name}
                        </h4>

                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          <span
                            className={`rounded-full px-2.5 py-0.5 font-semibold ${
                              team.isFinalist
                                ? "border border-pink-200 bg-pink-50 text-primary"
                                : "border border-neutral-light bg-neutral-100 text-muted"
                            }`}
                          >
                            {team.isFinalist ? "Finalist" : "Not a finalist"}
                          </span>

                          <span className="rounded-full border border-neutral-light bg-neutral-50 px-2.5 py-0.5 text-muted font-medium">
                            Resets: {team.selectionResetCount}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          selection
                            ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border border-neutral-light bg-neutral-100 text-muted"
                        }`}
                      >
                        {selection ? "● Selected" : "○ Unselected"}
                      </span>
                    </div>

                    <div className="mt-4 rounded-xl border border-neutral-light bg-[#FAF7F9] p-3.5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                        Current Problem Statement
                      </p>

                      <p className="mt-1 font-bold text-foreground">
                        {selection?.statement.title ?? "No selection"}
                      </p>

                      {selection && (
                        <div className="mt-2 space-y-1 text-xs text-muted">
                          <p>
                            Selected at: <span className="font-medium text-foreground">{formatDate(selection.selectedAt)}</span>
                          </p>
                          <p>
                            Assignment type:{" "}
                            <span className="font-medium text-foreground">
                              {selection.assignedByAdmin
                                ? "Administrator assigned"
                                : "Selected by team"}
                            </span>
                          </p>
                          <p>
                            Selection record resets: <span className="font-medium text-foreground">{selection.resetCount}</span>
                          </p>
                        </div>
                      )}

                      {selection &&
                        selectedStatement &&
                        !selectedStatement.enabled && (
                          <p className="mt-2 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-200 inline-block">
                            ⚠ This statement is disabled for new selections.
                          </p>
                        )}
                    </div>

                    {team.isFinalist && (
                      <div className="mt-4 space-y-3">
                        <label className="block space-y-1.5 text-sm">
                          <span className="font-semibold text-foreground">
                            Assign or reassign statement
                          </span>

                          <select
                            className="w-full rounded-xl border border-neutral-light bg-white px-3.5 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
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

                        <div className="flex flex-wrap gap-2.5">
                          <button
                            type="button"
                            disabled={
                              busy ||
                              !currentAssignment ||
                              currentAssignment === selection?.statementId
                            }
                            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover active:scale-[0.98] disabled:opacity-50"
                            onClick={() => handleAssignStatement(team)}
                          >
                            {selection ? "Reassign statement" : "Assign statement"}
                          </button>

                          <button
                            type="button"
                            disabled={busy || !selection}
                            className="rounded-xl border border-red-200 bg-white px-3.5 py-2 text-sm font-semibold text-red-700 shadow-2xs transition hover:bg-red-50 active:scale-[0.98] disabled:opacity-50"
                            onClick={() => handleResetOne(team)}
                          >
                            Reset selection
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="mt-4 border-t border-neutral-light pt-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                        Deployment Submission
                      </p>

                      {submission ? (
                        <div className="mt-2 space-y-1.5 text-sm">
                          {isSafeHttpUrl(submission.url) ? (
                            <a
                              href={submission.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="break-all font-semibold text-primary underline hover:text-primary-hover"
                            >
                              {submission.url}
                            </a>
                          ) : (
                            <p className="break-all text-amber-700 font-mono text-xs">
                              Invalid URL: {submission.url}
                            </p>
                          )}

                          <p className="text-xs text-muted">
                            Submitted: {formatDate(submission.submittedAt)}
                          </p>
                          <p className="text-xs text-muted">
                            Last updated: {formatDate(submission.updatedAt)}
                          </p>
                        </div>
                      ) : (
                        <p className="mt-1.5 text-xs text-muted italic">
                          No deployment submitted.
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}

              {filteredTeams.length === 0 && (
                <p className="text-sm text-muted text-center py-6">
                  No teams match the current filter.
                </p>
              )}
            </div>
          </section>

          {/* Submission Summary */}
          <section className="glass-card p-6">
            <h3 className="text-lg font-bold tracking-tight text-foreground">
              Submission Summary
            </h3>
            <p className="mt-1 text-sm text-muted">
              {submittedTeams.length} of {data.teams.length} teams have submitted a deployment URL.
            </p>

            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-neutral-100 border border-neutral-light/50">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
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

            <span className="text-xs text-muted">
              Data refreshes when you load this page or use Refresh.
            </span>
          </div>
        </>
      )}

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

      {/* Typed Reset All Modal */}
      {resetAllModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-all-title"
            className="w-full max-w-md rounded-2xl border border-white/80 bg-white/95 p-6 shadow-2xl backdrop-blur-md"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-red-600">
              High Risk Administrative Action
            </p>
            <h3 id="reset-all-title" className="mt-1 text-xl font-bold text-foreground">
              Reset All Active Selections
            </h3>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              Reset all active Round 3 selections? Team records, participants, and deployment submissions will remain intact. Deliverable progress for active selections will be cleared.
            </p>

            <div className="mt-4 space-y-2">
              <label htmlFor="reset-all-input" className="block text-xs font-semibold text-foreground">
                Type <span className="text-red-600 font-mono">RESET ALL</span> to confirm:
              </label>
              <input
                id="reset-all-input"
                className="w-full rounded-xl border border-red-200 bg-white px-3.5 py-2 text-sm font-mono text-foreground outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-200"
                value={typedConfirmation}
                onChange={(e) => setTypedConfirmation(e.target.value)}
                placeholder="RESET ALL"
              />
            </div>

            <div className="mt-6 flex flex-col-reverse justify-end gap-2.5 sm:flex-row">
              <button
                type="button"
                className={buttonClass}
                onClick={() => setResetAllModalOpen(false)}
                disabled={resettingAll}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                disabled={typedConfirmation !== "RESET ALL" || resettingAll}
                onClick={() => void executeResetAll()}
              >
                {resettingAll ? "Resetting..." : "Reset All Selections"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
