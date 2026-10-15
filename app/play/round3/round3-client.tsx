
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type StatementStatus = "Available" | "Full" | "Unavailable" | "Selected";

type Hint = {
  id: string;
  order: number;
  title: string;
  content: string;
};

type Statement = {
  id: string;
  title: string;
  domain: string;
  difficulty: string;
  shortDescription: string;
  maxTeams: number | null;
  selectedCount: number;
  status: StatementStatus;
  description?: string;
  constraints?: string;
  deliverables?: string;
  hints?: Hint[];
};

type Round3State = {
  serverNow: string;
  isFinalist: boolean;
  selectionWindow: {
    isOpen: boolean;
    durationMinutes: number;
    deadline: string | null;
  };
  submissionWindow: {
    isOpen: boolean;
    durationMinutes: number;
    deadline: string | null;
  };
  selectedStatementId: string | null;
  selectedAt: string | null;
  assignedByAdmin: boolean;
  statements: Statement[];
};


type Deliverable = {
  index: number;
  text: string;
  completed: boolean;
};

type Round3ClientProps = {
  participantName: string;
  teamName: string;
};

function formatDate(value: string | null) {
  if (!value) return "Not available";

  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function remainingTime(deadline: string | null, serverNow: string) {
  if (!deadline) return null;

  const seconds = Math.max(
    0,
    Math.floor(
      (new Date(deadline).getTime() - new Date(serverNow).getTime()) / 1000,
    ),
  );

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 10000,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export default function Round3Client({
  participantName,
  teamName,
}: Round3ClientProps) {
  const [data, setData] = useState<Round3State | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [domain, setDomain] = useState("All");
  const [details, setDetails] = useState<Statement | null>(null);
  const [confirmSelection, setConfirmSelection] =
    useState<Statement | null>(null);



    const [deploymentUrl, setDeploymentUrl] = useState("");
const [savedDeploymentUrl, setSavedDeploymentUrl] = useState("");
const [submissionDeadline, setSubmissionDeadline] = useState<string | null>(null);
const [submissionOpen, setSubmissionOpen] = useState(false);
const [savingDeployment, setSavingDeployment] = useState(false);
const [deploymentMessage, setDeploymentMessage] = useState("");


const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
const [loadingDeliverables, setLoadingDeliverables] = useState(false);
const [updatingDeliverable, setUpdatingDeliverable] = useState<number | null>(null);

  const [selecting, setSelecting] = useState(false);
  const [now, setNow] = useState(new Date().toISOString());

  const loadState = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);

    try {
      const response = await fetch("/api/round3/state", {
        cache: "no-store",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Could not load problem statements.");
      }

      setData(result as Round3State);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load Round 3.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSubmission = useCallback(async () => {
  try {
    const response = await fetch("/api/round3/submission", {
      cache: "no-store",
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error ?? "Could not load deployment submission.");
    }

    const savedUrl = result.submission?.url ?? "";

    setSavedDeploymentUrl(savedUrl);
    setDeploymentUrl((current) => current || savedUrl);
    setSubmissionOpen(
      result.window.isOpen &&
        !!result.window.deadline &&
        Date.parse(result.window.deadline) > Date.now(),
    );
    setSubmissionDeadline(result.window.deadline ?? null);
  } catch (err) {
    setDeploymentMessage(
      err instanceof Error ? err.message : "Could not load deployment submission.",
    );
  }
}, []);


const loadDeliverables = useCallback(async () => {
  try {
    setLoadingDeliverables(true);

    const response = await fetch("/api/round3/deliverables", {
      cache: "no-store",
    });
    const result = await response.json();

    if (!response.ok) {
      if (response.status === 409) {
        setDeliverables([]);
        return;
      }

      throw new Error(result.error ?? "Could not load deliverables.");
    }

    setDeliverables(result.deliverables ?? []);
  } catch (err) {
    setError(
      err instanceof Error ? err.message : "Could not load deliverables.",
    );
  } finally {
    setLoadingDeliverables(false);
  }
}, []);


async function toggleDeliverable(index: number, completed: boolean) {
  if (updatingDeliverable !== null) return;

  const previous = deliverables;

  setDeliverables((items) =>
    items.map((item) =>
      item.index === index ? { ...item, completed } : item,
    ),
  );
  setUpdatingDeliverable(index);

  try {
    const response = await fetch("/api/round3/deliverables", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ index, completed }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error ?? "Could not update deliverable.");
    }
  } catch (err) {
    setDeliverables(previous);
    setError(
      err instanceof Error ? err.message : "Could not update deliverable.",
    );
  } finally {
    setUpdatingDeliverable(null);
  }
}

async function saveDeployment() {
  if (savingDeployment) return;

  setSavingDeployment(true);
  setDeploymentMessage("");

  try {
    const response = await fetch("/api/round3/submission", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: deploymentUrl }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error ?? "Could not save deployment URL.");
    }

    setSavedDeploymentUrl(result.submission.url);
    setDeploymentUrl(result.submission.url);
    setDeploymentMessage("Deployment URL saved successfully.");
  } catch (err) {
    setDeploymentMessage(
      err instanceof Error ? err.message : "Could not save deployment URL.",
    );
  } finally {
    setSavingDeployment(false);
  }
}

useEffect(() => {
  let stopped = false;
  let pollTimeout: number | undefined;

  async function poll() {
    if (stopped) return;

    try {
      await Promise.all([
        loadState(),
        loadSubmission(),
        loadDeliverables(),
      ]);
    } finally {
      if (!stopped) {
        pollTimeout = window.setTimeout(() => {
          void poll();
        }, 3000);
      }
    }
  }

  const clockInterval = window.setInterval(() => {
    if (!stopped) {
      setNow(new Date().toISOString());
    }
  }, 1000);

  void poll();

  return () => {
    stopped = true;

    if (pollTimeout !== undefined) {
      window.clearTimeout(pollTimeout);
    }

    window.clearInterval(clockInterval);
  };
}, [loadState, loadSubmission, loadDeliverables]);

  const domains = useMemo(
    () => [
      "All",
      ...Array.from(new Set((data?.statements ?? []).map((s) => s.domain)))
        .sort((a, b) => a.localeCompare(b)),
    ],
    [data?.statements],
  );

  const filteredStatements = useMemo(() => {
    const query = search.trim().toLowerCase();

    return (data?.statements ?? []).filter((statement) => {
      const matchesDomain = domain === "All" || statement.domain === domain;
      const matchesSearch =
        !query ||
        statement.title.toLowerCase().includes(query) ||
        statement.domain.toLowerCase().includes(query) ||
        statement.shortDescription.toLowerCase().includes(query);

      return matchesDomain && matchesSearch;
    });
  }, [data?.statements, search, domain]);

  async function selectStatement() {
    if (!confirmSelection || selecting) return;

    setSelecting(true);
    setError("");

    try {
      const response = await fetch("/api/round3/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statementId: confirmSelection.id }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Could not select this problem.");
      }

      setConfirmSelection(null);
      setDetails(null);
      await loadState();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not select this problem.",
      );
      await loadState();
    } finally {
      setSelecting(false);
    }
  }

  const selectedStatement = data?.statements.find(
    (statement) => statement.id === data.selectedStatementId,
  );

  const timeLeft = remainingTime(data?.selectionWindow.deadline ?? null, now);

  return (
    <main className="min-h-screen bg-[#F7F2F5] px-4 py-8 text-[#302630] sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center border-b border-[#E7DCE4] pb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D9468D]">
              Blueprint to Live · Round 3
            </p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#302630]">
              Final Build-Off
            </h1>
            <p className="mt-1 text-sm text-[#746873]">
              Welcome, <strong className="font-semibold text-[#302630]">{participantName}</strong> · Team:{" "}
              <span className="font-bold text-[#BE3477]">{teamName}</span>
            </p>
          </div>

          <a
            href="/play"
            className="w-fit rounded-xl border border-[#E7DCE4] bg-white/70 px-4 py-2 text-xs font-semibold text-[#746873] shadow-xs backdrop-blur-md transition hover:border-[#D9468D]/40 hover:bg-white hover:text-[#BE3477]"
          >
            ← Back to dashboard
          </a>
        </header>

        {error && (
          <div
            role="alert"
            className="mt-6 flex items-start justify-between gap-4 rounded-2xl border border-red-500/25 bg-red-50/85 p-4 text-sm font-medium text-red-800 shadow-xs"
          >
            <p>{error}</p>
            <button
              type="button"
              onClick={() => setError("")}
              className="shrink-0 text-red-600 hover:text-red-900"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        )}

        {loading && !data ? (
          <section className="glass-panel mt-8 rounded-3xl p-8 text-center border border-white/80 shadow-xs">
            <p className="text-sm font-medium text-[#746873]">
              Loading problem statements and submission windows...
            </p>
          </section>
        ) : data && !data.isFinalist ? (
          <section className="glass-panel mt-8 rounded-3xl p-8 text-center border border-white/80 shadow-xs">
            <h2 className="text-xl font-bold text-[#302630]">
              Thank you for participating!
            </h2>
            <p className="mt-2 text-sm text-[#746873]">
              Round 3 is available only to finalist teams.
            </p>
          </section>
        ) : data ? (
          <>
            <section className="mt-8 grid gap-4 sm:grid-cols-3 animate-fade-in-up">
              <div className="glass-panel rounded-3xl p-5 border border-white/80 shadow-xs">
                <p className="text-xs font-bold uppercase tracking-wider text-[#746873]">Your selection</p>
                <p className="mt-2 text-base font-bold text-[#302630] truncate">
                  {selectedStatement?.title ?? "Not selected"}
                </p>
                <p className="mt-1 text-xs text-[#746873]">
                  {data.assignedByAdmin
                    ? "Assigned by the event admin"
                    : data.selectedAt
                      ? `Selected ${formatDate(data.selectedAt)}`
                      : "Choose one problem statement"}
                </p>
              </div>

              <div className="glass-panel rounded-3xl p-5 border border-white/80 shadow-xs">
                <p className="text-xs font-bold uppercase tracking-wider text-[#746873]">Selection window</p>
                <p className="mt-2 text-base font-bold text-[#302630]">
                  {data.selectionWindow.isOpen && timeLeft !== "00:00:00"
                    ? "Open"
                    : "Closed"}
                </p>
                <p className="mt-1 text-xs text-[#746873]">
                  {data.selectionWindow.isOpen
                    ? `Time remaining: ${timeLeft ?? "Unknown"}`
                    : "Wait for the event admin to open selection"}
                </p>
              </div>

              <div className="glass-panel rounded-3xl p-5 border border-white/80 shadow-xs">
                <p className="text-xs font-bold uppercase tracking-wider text-[#746873]">Available statements</p>
                <p className="mt-2 text-2xl font-black text-[#BE3477]">
                  {data.statements.filter((s) => s.status === "Available").length}
                </p>
                <p className="mt-1 text-xs text-[#746873]">
                  State refreshes automatically
                </p>
              </div>
            </section>

            {/* Selected Statement Banner */}
            {selectedStatement && (
              <section className="mt-6 rounded-3xl border border-[#D9468D]/30 bg-[#FCE7F1]/80 p-6 shadow-xs animate-fade-in-up">
                <p className="text-xs font-bold uppercase tracking-wider text-[#BE3477]">
                  Your team&apos;s locked problem statement
                </p>
                <h2 className="mt-2 text-xl font-bold text-[#302630]">
                  {selectedStatement.title}
                </h2>
                <button
                  type="button"
                  onClick={() => setDetails(selectedStatement)}
                  className="mt-4 rounded-xl bg-[#BE3477] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#a62a66] active:scale-[0.98]"
                >
                  View full statement details
                </button>
              </section>
            )}

            {/* Deployment submission */}
            <section className="glass-panel mt-6 rounded-3xl p-6 sm:p-7 border border-white/80 shadow-xs animate-fade-in-up animation-delay-75">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start border-b border-[#E7DCE4]/80 pb-5">
                <div>
                  <h2 className="text-xl font-bold text-[#302630]">Deployment submission</h2>
                  <p className="mt-1 text-xs sm:text-sm text-[#746873]">
                    Submit your team&apos;s deployed static website URL from EC2. You can update it while submissions are open.
                  </p>
                </div>

                <span
                  className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${
                    submissionOpen
                      ? "bg-emerald-500/15 text-emerald-800"
                      : "bg-[#F1E9EF] text-[#746873]"
                  }`}
                >
                  {submissionOpen ? "Submissions open" : "Submissions closed"}
                </span>
              </div>

              <div className="mt-5 rounded-2xl border border-[#E7DCE4] bg-white/70 p-4 shadow-xs">
                <p className="text-xs font-bold uppercase tracking-wider text-[#746873]">Submission deadline</p>
                <p className="mt-1 text-sm font-bold text-[#302630]">
                  {submissionDeadline
                    ? formatDate(submissionDeadline)
                    : "Not announced"}
                </p>
                <p className="mt-1 text-xs text-[#746873]">
                  {submissionOpen
                    ? `Time remaining: ${
                        remainingTime(submissionDeadline, now) ?? "Not available"
                      }`
                    : "Submissions closed"}
                </p>
              </div>

              <form
                className="mt-5 space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void saveDeployment();
                }}
              >
                <label htmlFor="deployment-url" className="block text-xs font-bold uppercase tracking-wider text-[#746873]">
                  EC2 website URL
                </label>

                <input
                  id="deployment-url"
                  type="url"
                  required
                  maxLength={2048}
                  value={deploymentUrl}
                  onChange={(event) => setDeploymentUrl(event.target.value)}
                  placeholder="http://your-ec2-public-ip or https://your-domain"
                  disabled={!submissionOpen || !data.selectedStatementId || savingDeployment}
                  className="w-full rounded-xl border border-[#E7DCE4] bg-white px-4 py-3 text-sm text-[#302630] outline-none placeholder:text-[#746873]/50 focus:border-[#D9468D] focus:ring-2 focus:ring-[#D9468D]/20 disabled:cursor-not-allowed disabled:opacity-50"
                />

                <p className="text-xs text-[#746873]">
                  Your team must select a problem statement before submitting.
                </p>

                <button
                  type="submit"
                  disabled={
                    !submissionOpen ||
                    !data.selectedStatementId ||
                    savingDeployment ||
                    !deploymentUrl.trim()
                  }
                  className="rounded-xl bg-[#BE3477] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#a62a66] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingDeployment
                    ? "Saving..."
                    : savedDeploymentUrl
                      ? "Update deployment URL"
                      : "Submit deployment URL"}
                </button>
              </form>

              {savedDeploymentUrl && (
                <div className="mt-5 rounded-2xl border border-emerald-500/25 bg-emerald-50/80 p-4 shadow-xs">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                    Saved deployment URL
                  </p>
                  <a
                    href={savedDeploymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block break-all text-sm font-semibold text-[#BE3477] underline underline-offset-4 hover:text-[#a62a66]"
                  >
                    {savedDeploymentUrl}
                  </a>
                </div>
              )}

              {deploymentMessage && (
                <p role="status" className="mt-4 text-xs font-semibold text-[#BE3477]">
                  {deploymentMessage}
                </p>
              )}
            </section>

            {/* Deliverables Checklist */}
            {data.selectedStatementId && (
              <section className="glass-panel mt-6 rounded-3xl p-6 sm:p-7 border border-white/80 shadow-xs animate-fade-in-up">
                <div className="flex items-center justify-between gap-3 border-b border-[#E7DCE4]/80 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-[#302630]">Deliverables checklist</h2>
                    <p className="mt-0.5 text-xs text-[#746873]">
                      Shared team progress updates automatically.
                    </p>
                  </div>
                  <span className="rounded-full bg-[#FCE7F1] px-3 py-1 text-xs font-bold text-[#BE3477]">
                    {deliverables.filter((item) => item.completed).length} / {deliverables.length} done
                  </span>
                </div>

                {loadingDeliverables && deliverables.length === 0 ? (
                  <p className="mt-5 text-sm text-[#746873]">
                    Loading deliverables...
                  </p>
                ) : deliverables.length === 0 ? (
                  <p className="mt-5 text-sm text-[#746873]">
                    No deliverables configured for this statement.
                  </p>
                ) : (
                  <ul className="mt-5 space-y-2.5">
                    {deliverables.map((item) => (
                      <li key={item.index}>
                        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#E7DCE4] bg-white/70 p-3.5 shadow-xs transition hover:bg-white">
                          <input
                            type="checkbox"
                            checked={item.completed}
                            disabled={updatingDeliverable !== null}
                            onChange={(event) =>
                              void toggleDeliverable(item.index, event.target.checked)
                            }
                            className="mt-0.5 size-4 rounded accent-[#BE3477]"
                          />
                          <span
                            className={`text-sm leading-6 ${
                              item.completed
                                ? "text-[#746873] line-through font-normal"
                                : "text-[#302630] font-medium"
                            }`}
                          >
                            {item.text}
                          </span>
                          {updatingDeliverable === item.index && (
                            <span className="ml-auto text-xs font-medium text-[#BE3477]">
                              Saving...
                            </span>
                          )}
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {/* Problem-solving hints */}
            {selectedStatement && (
              <section className="glass-panel mt-6 rounded-3xl p-6 sm:p-7 border border-white/80 shadow-xs animate-fade-in-up">
                <div>
                  <h2 className="text-xl font-bold text-[#302630]">Problem-solving hints</h2>
                  <p className="mt-0.5 text-xs text-[#746873]">
                    Consult hints if your team needs architecture or implementation guidance.
                  </p>
                </div>

                {selectedStatement.hints && selectedStatement.hints.length > 0 ? (
                  <div className="mt-5 space-y-3">
                    {selectedStatement.hints
                      .slice()
                      .sort((a, b) => a.order - b.order)
                      .map((hint) => (
                        <details
                          key={hint.id}
                          className="group rounded-2xl border border-[#E7DCE4] bg-white/80 shadow-xs"
                        >
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm font-bold text-[#302630]">
                            <span>
                              Hint {hint.order}: {hint.title}
                            </span>
                            <span className="text-xs text-[#746873] transition group-open:rotate-180">
                              ▼
                            </span>
                          </summary>
                          <div className="border-t border-[#E7DCE4] px-4 py-3.5 text-sm leading-6 text-[#746873]">
                            {hint.content}
                          </div>
                        </details>
                      ))}
                  </div>
                ) : (
                  <p className="mt-5 text-sm text-[#746873]">
                    No hints configured for this statement yet.
                  </p>
                )}
              </section>
            )}

            {/* Problem statements selector */}
            <section className="mt-10">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <h2 className="text-2xl font-bold text-[#302630]">Problem statements</h2>
                  <p className="mt-1 text-sm text-[#746873]">
                    {data.selectedStatementId
                      ? "Your team's choice is locked. You can review the remaining challenges."
                      : "Explore the available challenges and choose your problem statement."}
                  </p>
                </div>
                <p className="text-xs font-semibold text-[#746873]">
                  {filteredStatements.length} of {data.statements.length} shown
                </p>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_220px]">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by title, domain, or description..."
                  className="w-full rounded-xl border border-[#E7DCE4] bg-white px-4 py-3 text-sm text-[#302630] outline-none placeholder:text-[#746873]/50 focus:border-[#D9468D] shadow-xs"
                  aria-label="Search problem statements"
                />
                <select
                  value={domain}
                  onChange={(event) => setDomain(event.target.value)}
                  className="rounded-xl border border-[#E7DCE4] bg-white px-4 py-3 text-sm text-[#302630] outline-none focus:border-[#D9468D] shadow-xs"
                  aria-label="Filter by domain"
                >
                  {domains.map((item) => (
                    <option key={item} value={item}>
                      {item === "All" ? "All domains" : item}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {filteredStatements.map((statement) => {
                  const isSelected =
                    statement.id === data.selectedStatementId;
                  const canSelect =
                    !data.selectedStatementId &&
                    data.selectionWindow.isOpen &&
                    timeLeft !== "00:00:00" &&
                    statement.status === "Available";

                  return (
                    <article
                      key={statement.id}
                      className={`glass-panel-interactive flex flex-col rounded-3xl p-6 shadow-xs border ${
                        isSelected
                          ? "border-[#D9468D] ring-2 ring-[#D9468D]/30 bg-[#FCE7F1]/30"
                          : "border-white/80"
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#FCE7F1] px-2.5 py-0.5 text-xs font-bold text-[#BE3477]">
                          {statement.domain}
                        </span>
                        <span className="rounded-full bg-[#F1E9EF] px-2.5 py-0.5 text-xs font-semibold text-[#746873]">
                          {statement.difficulty}
                        </span>
                      </div>

                      <h3 className="mt-4 text-lg font-bold leading-snug text-[#302630]">
                        {statement.title}
                      </h3>
                      <p className="mt-2.5 flex-1 text-xs sm:text-sm leading-6 text-[#746873]">
                        {statement.shortDescription}
                      </p>

                      <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#E7DCE4] pt-4">
                        <div>
                          <p
                            className={`text-xs font-bold ${
                              isSelected
                                ? "text-[#BE3477]"
                                : statement.status === "Available"
                                  ? "text-emerald-700"
                                  : "text-[#746873]"
                            }`}
                          >
                            {isSelected ? "Your selection ✓" : statement.status}
                          </p>
                          <p className="mt-0.5 text-[11px] text-[#746873]">
                            {statement.selectedCount} selected
                            {statement.maxTeams !== null
                              ? ` / ${statement.maxTeams} teams`
                              : " / no limit"}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setDetails(statement)}
                          className="rounded-xl border border-[#E7DCE4] bg-white px-3 py-1.5 text-xs font-semibold text-[#302630] hover:bg-[#F1E9EF] transition shadow-xs"
                        >
                          Details
                        </button>
                      </div>

                      {canSelect && (
                        <button
                          type="button"
                          onClick={() => setConfirmSelection(statement)}
                          className="mt-4 w-full rounded-xl bg-[#BE3477] px-4 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-[#a62a66] active:scale-[0.98]"
                        >
                          Select this problem
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>

              {filteredStatements.length === 0 && (
                <div className="mt-6 rounded-3xl border border-dashed border-[#E7DCE4] p-10 text-center">
                  <p className="font-bold text-[#302630]">No matching statements</p>
                  <p className="mt-1 text-sm text-[#746873]">
                    Try another search term or domain filter.
                  </p>
                </div>
              )}
            </section>
          </>
        ) : (
          <section className="glass-panel mt-8 rounded-3xl p-8 border border-white/80 shadow-xs text-center">
            <p className="text-sm text-[#746873]">
              Round 3 could not be loaded.
            </p>
            <button
              type="button"
              onClick={() => void loadState(true)}
              className="mt-4 rounded-xl bg-[#BE3477] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#a62a66]"
            >
              Retry
            </button>
          </section>
        )}
      </div>

      {/* Details Dialog */}
      {details && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#302630]/40 backdrop-blur-sm p-4"
          onClick={() => setDetails(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="statement-dialog-title"
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/80 bg-white/95 p-6 sm:p-8 text-[#302630] shadow-2xl animate-fade-in"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#E7DCE4] pb-4">
              <div>
                <span className="rounded-full bg-[#FCE7F1] px-2.5 py-0.5 text-xs font-bold text-[#BE3477]">
                  {details.domain}
                </span>
                <h2
                  id="statement-dialog-title"
                  className="mt-2 text-2xl font-bold tracking-tight text-[#302630]"
                >
                  {details.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDetails(null)}
                className="rounded-xl border border-[#E7DCE4] bg-white px-3 py-1.5 text-xs font-bold text-[#746873] hover:text-[#BE3477]"
                aria-label="Close statement details"
              >
                ✕
              </button>
            </div>

            <div className="mt-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#746873]">Problem description</h3>
              <div className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[#302630]">
                {details.description || details.shortDescription || "No description provided yet."}
              </div>
            </div>

            {details.constraints && (
              <div className="mt-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#746873]">Constraints</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#746873]">
                  {details.constraints}
                </p>
              </div>
            )}

            {details.deliverables && (
              <div className="mt-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#746873]">Deliverables</h3>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm leading-6 text-[#746873]">
                  {details.deliverables
                    .split("\n")
                    .filter(Boolean)
                    .map((item, index) => (
                      <li key={`${index}-${item}`}>{item}</li>
                    ))}
                </ul>
              </div>
            )}

            {details.hints && details.hints.length > 0 && (
              <div className="mt-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#746873]">Hints</h3>
                <div className="mt-3 space-y-2.5">
                  {details.hints.map((hint) => (
                    <div
                      key={hint.id}
                      className="rounded-2xl border border-[#E7DCE4] bg-[#F1E9EF]/50 p-4"
                    >
                      <p className="text-xs font-bold text-[#302630]">{hint.title}</p>
                      <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-[#746873]">
                        {hint.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!data?.selectedStatementId &&
              data?.selectionWindow.isOpen &&
              details.status === "Available" && (
                <button
                  type="button"
                  onClick={() => setConfirmSelection(details)}
                  className="mt-8 w-full rounded-xl bg-[#BE3477] px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#a62a66] active:scale-[0.98]"
                >
                  Select this problem
                </button>
              )}
          </section>
        </div>
      )}

      {/* Confirm Selection Dialog */}
      {confirmSelection && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#302630]/40 backdrop-blur-sm p-4"
          onClick={() => {
            if (!selecting) setConfirmSelection(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="w-full max-w-md rounded-3xl border border-white/80 bg-white/95 p-6 sm:p-7 text-[#302630] shadow-2xl animate-fade-in"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#D9468D]">
              Confirmation required
            </p>
            <h2 id="confirm-title" className="mt-1 text-xl font-bold">
              Confirm your selection
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#746873]">
              Your team is about to select{" "}
              <strong className="font-bold text-[#302630]">
                {confirmSelection.title}
              </strong>
              . This choice cannot be changed by your team after confirmation.
            </p>
            <p className="mt-2 text-xs font-semibold text-amber-700">
              Make sure your team agrees before continuing.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={selecting}
                onClick={() => setConfirmSelection(null)}
                className="rounded-xl border border-[#E7DCE4] bg-white px-4 py-2.5 text-sm font-semibold text-[#302630] hover:bg-[#F1E9EF] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={selecting}
                onClick={() => void selectStatement()}
                className="rounded-xl bg-[#BE3477] px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#a62a66] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {selecting ? "Selecting..." : "Confirm choice"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
