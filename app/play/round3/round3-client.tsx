
"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import ThemeToggle from "@/components/theme-toggle";

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

function remainingSeconds(deadline: string | null, serverNow: string) {
  if (!deadline) return 0;
  return Math.max(
    0,
    Math.floor(
      (new Date(deadline).getTime() - new Date(serverNow).getTime()) / 1000,
    ),
  );
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
  const isSelectionOpen = Boolean(data?.selectionWindow.isOpen && timeLeft !== "00:00:00");
  const selectionSeconds = remainingSeconds(data?.selectionWindow.deadline ?? null, now);
  const submissionSeconds = remainingSeconds(submissionDeadline, now);
  const submissionTimeLeft = remainingTime(submissionDeadline, now);

  return (
    <main className="min-h-screen bg-[#F7F2F5] dark:bg-[#050505] px-4 py-8 text-[#302630] dark:text-[#FAFAFA] sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center border-b border-[#E7DCE4] dark:border-[#292929] pb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D9468D] dark:text-[#8B5CF6]">
              Blueprint to Live · Round 3
            </p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#302630] dark:text-[#FAFAFA]">
              Final Build-Off
            </h1>
            <p className="mt-1 text-sm text-[#746873] dark:text-[#A3A3A3]">
              Welcome, <strong className="font-semibold text-[#302630] dark:text-[#FAFAFA]">{participantName}</strong> · Team:{" "}
              <span className="font-bold text-[#BE3477] dark:text-[#8B5CF6]">{teamName}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <a
              href="/play"
              className="w-fit rounded-xl border border-[#E7DCE4] dark:border-[#292929] bg-white/70 dark:bg-[#111111] px-4 py-2 text-xs font-semibold text-[#746873] dark:text-[#A3A3A3] shadow-xs backdrop-blur-md transition hover:border-[#D9468D]/40 dark:hover:border-[#8B5CF6]/40 hover:bg-white dark:hover:bg-[#171717] hover:text-[#BE3477] dark:hover:text-[#8B5CF6]"
            >
              ← Back to dashboard
            </a>
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="mt-6 flex items-start justify-between gap-4 rounded-2xl border border-red-500/25 bg-red-50/85 dark:bg-red-950/30 p-4 text-sm font-medium text-red-800 dark:text-red-300 shadow-xs"
          >
            <p>{error}</p>
            <button
              type="button"
              onClick={() => setError("")}
              className="shrink-0 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        )}

        {loading && !data ? (
          <section className="glass-panel mt-8 rounded-3xl p-8 text-center border border-white/80 dark:border-[#292929] dark:bg-[#111111] shadow-xs">
            <p className="text-sm font-medium text-[#746873] dark:text-[#A3A3A3]">
              Loading problem statements and submission windows...
            </p>
          </section>
        ) : data && !data.isFinalist ? (
          <section className="glass-panel mt-8 rounded-3xl p-8 text-center border border-white/80 dark:border-[#292929] dark:bg-[#111111] shadow-xs">
            <h2 className="text-xl font-bold text-[#302630] dark:text-[#FAFAFA]">
              Thank you for participating!
            </h2>
            <p className="mt-2 text-sm text-[#746873] dark:text-[#A3A3A3]">
              Round 3 is available only to finalist teams.
            </p>
          </section>
        ) : data ? (
          <>
            {/* Sticky Timer Panel */}
            <div className="sticky top-2 z-30 mb-8 rounded-3xl border border-white/80 dark:border-[#292929] bg-white/90 dark:bg-[#090909]/95 p-4 sm:p-5 shadow-lg backdrop-blur-xl transition-all">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {/* Problem Selection Window Timer Card */}
                <div
                  className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 transition-all ${
                    isSelectionOpen
                      ? "border-purple-500/30 dark:border-[#8B5CF6]/30 bg-purple-50/40 dark:bg-[#8B5CF6]/10 shadow-xs"
                      : "border-[#E7DCE4] dark:border-[#292929] bg-white/60 dark:bg-[#111111]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#746873] dark:text-[#A3A3A3]">
                      Problem Selection Window
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        isSelectionOpen
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-[#F1E9EF] dark:bg-[#171717] dark:border dark:border-[#292929] text-[#746873] dark:text-[#A3A3A3]"
                      }`}
                    >
                      {isSelectionOpen && (
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      )}
                      {isSelectionOpen ? "Window Open" : "Window Closed"}
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-baseline justify-between gap-2">
                    <p
                      className={`font-black tracking-tight tabular-nums text-3xl sm:text-4xl md:text-5xl ${
                        !isSelectionOpen
                          ? "text-[#746873] dark:text-[#737373]"
                          : selectionSeconds <= 300
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-[#BE3477] dark:text-[#8B5CF6]"
                      }`}
                    >
                      {isSelectionOpen ? (timeLeft ?? "00:00:00") : "00:00:00"}
                    </p>
                  </div>

                  <p className="mt-2 text-xs text-[#746873] dark:text-[#A3A3A3] flex items-center justify-between">
                    <span>
                      {data?.selectionWindow.deadline
                        ? `Deadline: ${formatDate(data.selectionWindow.deadline)}`
                        : "Deadline not announced"}
                    </span>
                    {isSelectionOpen && selectionSeconds <= 300 && (
                      <span className="font-semibold text-amber-600 dark:text-amber-400">
                        Closing soon!
                      </span>
                    )}
                  </p>
                </div>

                {/* Deployment Submission Window Timer Card */}
                <div
                  className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 transition-all ${
                    submissionOpen
                      ? "border-purple-500/30 dark:border-[#8B5CF6]/30 bg-purple-50/40 dark:bg-[#8B5CF6]/10 shadow-xs"
                      : "border-[#E7DCE4] dark:border-[#292929] bg-white/60 dark:bg-[#111111]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#746873] dark:text-[#A3A3A3]">
                      Deployment Submission Window
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        submissionOpen
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-[#F1E9EF] dark:bg-[#171717] dark:border dark:border-[#292929] text-[#746873] dark:text-[#A3A3A3]"
                      }`}
                    >
                      {submissionOpen && (
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      )}
                      {submissionOpen ? "Window Open" : "Window Closed"}
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-baseline justify-between gap-2">
                    <p
                      className={`font-black tracking-tight tabular-nums text-3xl sm:text-4xl md:text-5xl ${
                        !submissionOpen
                          ? "text-[#746873] dark:text-[#737373]"
                          : submissionSeconds <= 300
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-[#BE3477] dark:text-[#8B5CF6]"
                      }`}
                    >
                      {submissionOpen
                        ? (submissionTimeLeft ?? "00:00:00")
                        : "00:00:00"}
                    </p>
                  </div>

                  <p className="mt-2 text-xs text-[#746873] dark:text-[#A3A3A3] flex items-center justify-between">
                    <span>
                      {submissionDeadline
                        ? `Deadline: ${formatDate(submissionDeadline)}`
                        : "Deadline not announced"}
                    </span>
                    {submissionOpen && submissionSeconds <= 300 && (
                      <span className="font-semibold text-amber-600 dark:text-amber-400">
                        Closing soon!
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            <section className="mt-8 grid gap-4 sm:grid-cols-3 animate-fade-in-up">
              <div className="glass-panel rounded-3xl p-5 border border-white/80 dark:border-[#292929] dark:bg-[#111111] shadow-xs">
                <p className="text-xs font-bold uppercase tracking-wider text-[#746873] dark:text-[#A3A3A3]">Your selection</p>
                <p className="mt-2 text-base font-bold text-[#302630] dark:text-[#FAFAFA] truncate">
                  {selectedStatement?.title ?? "Not selected"}
                </p>
                <p className="mt-1 text-xs text-[#746873] dark:text-[#A3A3A3]">
                  {data.assignedByAdmin
                    ? "Assigned by the event admin"
                    : data.selectedAt
                      ? `Selected ${formatDate(data.selectedAt)}`
                      : "Choose one problem statement"}
                </p>
              </div>

              <div className="glass-panel rounded-3xl p-5 border border-white/80 dark:border-[#292929] dark:bg-[#111111] shadow-xs">
                <p className="text-xs font-bold uppercase tracking-wider text-[#746873] dark:text-[#A3A3A3]">Selection window</p>
                <p className="mt-2 text-base font-bold text-[#302630] dark:text-[#FAFAFA]">
                  {isSelectionOpen ? "Open" : "Closed"}
                </p>
                <p className="mt-1 text-xs text-[#746873] dark:text-[#A3A3A3]">
                  {isSelectionOpen
                    ? `Time remaining: ${timeLeft ?? "Unknown"}`
                    : "Wait for the event admin to open selection"}
                </p>
              </div>

              <div className="glass-panel rounded-3xl p-5 border border-white/80 dark:border-[#292929] dark:bg-[#111111] shadow-xs">
                <p className="text-xs font-bold uppercase tracking-wider text-[#746873] dark:text-[#A3A3A3]">Available statements</p>
                <p className="mt-2 text-2xl font-black text-[#BE3477] dark:text-[#8B5CF6]">
                  {data.statements.filter((s) => s.status === "Available").length}
                </p>
                <p className="mt-1 text-xs text-[#746873] dark:text-[#A3A3A3]">
                  State refreshes automatically
                </p>
              </div>
            </section>

            {/* Selected Statement Banner */}
            {selectedStatement && (
              <section className="mt-6 rounded-3xl border border-[#D9468D]/30 dark:border-[#8B5CF6]/30 bg-[#FCE7F1]/80 dark:bg-[#8B5CF6]/10 p-6 shadow-xs animate-fade-in-up">
                <p className="text-xs font-bold uppercase tracking-wider text-[#BE3477] dark:text-[#8B5CF6]">
                  Your team&apos;s locked problem statement
                </p>
                <h2 className="mt-2 text-xl font-bold text-[#302630] dark:text-[#FAFAFA]">
                  {selectedStatement.title}
                </h2>
                <button
                  type="button"
                  onClick={() => setDetails(selectedStatement)}
                  className="mt-4 rounded-xl bg-[#BE3477] dark:bg-[#8B5CF6] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#a62a66] dark:hover:bg-[#A78BFA] active:scale-[0.98]"
                >
                  View full statement details
                </button>
              </section>
            )}

            {/* Deployment submission */}
            <section className="glass-panel mt-6 rounded-3xl p-6 sm:p-7 border border-white/80 dark:border-[#292929] dark:bg-[#111111] shadow-xs animate-fade-in-up animation-delay-75">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start border-b border-[#E7DCE4]/80 dark:border-[#292929] pb-5">
                <div>
                  <h2 className="text-xl font-bold text-[#302630] dark:text-[#FAFAFA]">Deployment submission</h2>
                  <p className="mt-1 text-xs sm:text-sm text-[#746873] dark:text-[#A3A3A3]">
                    Submit your team&apos;s deployed static website URL from EC2. You can update it while submissions are open.
                  </p>
                </div>

                <span
                  className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${
                    submissionOpen
                      ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 border border-emerald-500/20"
                      : "bg-[#F1E9EF] dark:bg-[#171717] dark:border dark:border-[#292929] text-[#746873] dark:text-[#A3A3A3]"
                  }`}
                >
                  {submissionOpen ? "Submissions open" : "Submissions closed"}
                </span>
              </div>

              <div className="mt-5 rounded-2xl border border-[#E7DCE4] dark:border-[#292929] bg-white/70 dark:bg-[#171717] p-4 shadow-xs">
                <p className="text-xs font-bold uppercase tracking-wider text-[#746873] dark:text-[#A3A3A3]">Submission deadline</p>
                <p className="mt-1 text-sm font-bold text-[#302630] dark:text-[#FAFAFA]">
                  {submissionDeadline
                    ? formatDate(submissionDeadline)
                    : "Not announced"}
                </p>
                <p className="mt-1 text-xs text-[#746873] dark:text-[#A3A3A3]">
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
                <label htmlFor="deployment-url" className="block text-xs font-bold uppercase tracking-wider text-[#746873] dark:text-[#A3A3A3]">
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
                  className="w-full rounded-xl border border-[#E7DCE4] dark:border-[#292929] bg-white dark:bg-[#171717] px-4 py-3 text-sm text-[#302630] dark:text-[#FAFAFA] outline-none placeholder:text-[#746873]/50 dark:placeholder:text-[#A3A3A3]/40 focus:border-[#D9468D] dark:focus:border-[#8B5CF6] focus:ring-2 focus:ring-[#D9468D]/20 dark:focus:ring-[#8B5CF6]/20 disabled:cursor-not-allowed disabled:opacity-50"
                />

                <p className="text-xs text-[#746873] dark:text-[#A3A3A3]">
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
                  className="rounded-xl bg-[#BE3477] dark:bg-[#8B5CF6] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#a62a66] dark:hover:bg-[#A78BFA] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingDeployment
                    ? "Saving..."
                    : savedDeploymentUrl
                      ? "Update deployment URL"
                      : "Submit deployment URL"}
                </button>
              </form>

              {savedDeploymentUrl && (
                <div className="mt-5 rounded-2xl border border-emerald-500/25 dark:border-emerald-500/30 bg-emerald-50/80 dark:bg-emerald-950/25 p-4 shadow-xs">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                    Saved deployment URL
                  </p>
                  <a
                    href={savedDeploymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block break-all text-sm font-semibold text-[#BE3477] dark:text-[#8B5CF6] underline underline-offset-4 hover:text-[#a62a66] dark:hover:text-[#A78BFA]"
                  >
                    {savedDeploymentUrl}
                  </a>
                </div>
              )}

              {deploymentMessage && (
                <p role="status" className="mt-4 text-xs font-semibold text-[#BE3477] dark:text-[#8B5CF6]">
                  {deploymentMessage}
                </p>
              )}
            </section>

            {/* Deliverables Checklist */}
            {data.selectedStatementId && (
              <section className="glass-panel mt-6 rounded-3xl p-6 sm:p-7 border border-white/80 dark:border-[#292929] dark:bg-[#111111] shadow-xs animate-fade-in-up">
                <div className="flex items-center justify-between gap-3 border-b border-[#E7DCE4]/80 dark:border-[#292929] pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-[#302630] dark:text-[#FAFAFA]">Deliverables checklist</h2>
                    <p className="mt-0.5 text-xs text-[#746873] dark:text-[#A3A3A3]">
                      Shared team progress updates automatically.
                    </p>
                  </div>
                  <span className="rounded-full bg-[#FCE7F1] dark:bg-[#8B5CF6]/15 text-[#BE3477] dark:text-[#8B5CF6] border border-transparent dark:border-[#8B5CF6]/30 px-3 py-1 text-xs font-bold">
                    {deliverables.filter((item) => item.completed).length} / {deliverables.length} done
                  </span>
                </div>

                {loadingDeliverables && deliverables.length === 0 ? (
                  <p className="mt-5 text-sm text-[#746873] dark:text-[#A3A3A3]">
                    Loading deliverables...
                  </p>
                ) : deliverables.length === 0 ? (
                  <p className="mt-5 text-sm text-[#746873] dark:text-[#A3A3A3]">
                    No deliverables configured for this statement.
                  </p>
                ) : (
                  <ul className="mt-5 space-y-2.5">
                    {deliverables.map((item) => (
                      <li key={item.index}>
                        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#E7DCE4] dark:border-[#292929] bg-white/70 dark:bg-[#171717] p-3.5 shadow-xs transition hover:bg-white dark:hover:bg-[#202020]">
                          <input
                            type="checkbox"
                            checked={item.completed}
                            disabled={updatingDeliverable !== null}
                            onChange={(event) =>
                              void toggleDeliverable(item.index, event.target.checked)
                            }
                            className="mt-0.5 size-4 rounded accent-[#BE3477] dark:accent-[#8B5CF6]"
                          />
                          <span
                            className={`text-sm leading-6 ${
                              item.completed
                                ? "text-[#746873] dark:text-[#737373] line-through font-normal"
                                : "text-[#302630] dark:text-[#FAFAFA] font-medium"
                            }`}
                          >
                            {item.text}
                          </span>
                          {updatingDeliverable === item.index && (
                            <span className="ml-auto text-xs font-medium text-[#BE3477] dark:text-[#8B5CF6]">
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
              <section className="glass-panel mt-6 rounded-3xl p-6 sm:p-7 border border-white/80 dark:border-[#292929] dark:bg-[#111111] shadow-xs animate-fade-in-up">
                <div>
                  <h2 className="text-xl font-bold text-[#302630] dark:text-[#FAFAFA]">Problem-solving hints</h2>
                  <p className="mt-0.5 text-xs text-[#746873] dark:text-[#A3A3A3]">
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
                          className="group rounded-2xl border border-[#E7DCE4] dark:border-[#292929] bg-white/80 dark:bg-[#171717] shadow-xs"
                        >
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm font-bold text-[#302630] dark:text-[#FAFAFA]">
                            <span>
                              Hint {hint.order}: {hint.title}
                            </span>
                            <span className="text-xs text-[#746873] dark:text-[#A3A3A3] transition group-open:rotate-180">
                              ▼
                            </span>
                          </summary>
                          <div className="border-t border-[#E7DCE4] dark:border-[#292929] px-4 py-3.5 text-sm leading-6 text-[#746873] dark:text-[#A3A3A3]">
                            {hint.content}
                          </div>
                        </details>
                      ))}
                  </div>
                ) : (
                  <p className="mt-5 text-sm text-[#746873] dark:text-[#A3A3A3]">
                    No hints configured for this statement yet.
                  </p>
                )}
              </section>
            )}

            {/* Problem statements selector */}
            <section className="mt-10">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <h2 className="text-2xl font-bold text-[#302630] dark:text-[#FAFAFA]">Problem statements</h2>
                  <p className="mt-1 text-sm text-[#746873] dark:text-[#A3A3A3]">
                    {data.selectedStatementId
                      ? "Your team's choice is locked. You can review the remaining challenges."
                      : "Explore the available challenges and choose your problem statement."}
                  </p>
                </div>
                <p className="text-xs font-semibold text-[#746873] dark:text-[#A3A3A3]">
                  {filteredStatements.length} of {data.statements.length} shown
                </p>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_220px]">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by title, domain, or description..."
                  className="w-full rounded-xl border border-[#E7DCE4] dark:border-[#292929] bg-white dark:bg-[#171717] px-4 py-3 text-sm text-[#302630] dark:text-[#FAFAFA] outline-none placeholder:text-[#746873]/50 dark:placeholder:text-[#A3A3A3]/40 focus:border-[#D9468D] dark:focus:border-[#8B5CF6] shadow-xs"
                  aria-label="Search problem statements"
                />
                <select
                  value={domain}
                  onChange={(event) => setDomain(event.target.value)}
                  className="rounded-xl border border-[#E7DCE4] dark:border-[#292929] bg-white dark:bg-[#171717] px-4 py-3 text-sm text-[#302630] dark:text-[#FAFAFA] outline-none focus:border-[#D9468D] dark:focus:border-[#8B5CF6] shadow-xs"
                  aria-label="Filter by domain"
                >
                  {domains.map((item) => (
                    <option key={item} value={item} className="bg-white dark:bg-[#171717] text-[#302630] dark:text-[#FAFAFA]">
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
                          ? "border-[#D9468D] dark:border-[#8B5CF6] ring-2 ring-[#D9468D]/30 dark:ring-[#8B5CF6]/30 bg-[#FCE7F1]/30 dark:bg-[#8B5CF6]/10"
                          : "border-white/80 dark:border-[#292929] dark:bg-[#111111]"
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#FCE7F1] dark:bg-[#8B5CF6]/15 text-[#BE3477] dark:text-[#8B5CF6] border border-transparent dark:border-[#8B5CF6]/30 px-2.5 py-0.5 text-xs font-bold">
                          {statement.domain}
                        </span>
                        <span className="rounded-full bg-[#F1E9EF] dark:bg-[#171717] dark:border dark:border-[#292929] px-2.5 py-0.5 text-xs font-semibold text-[#746873] dark:text-[#A3A3A3]">
                          {statement.difficulty}
                        </span>
                      </div>

                      <h3 className="mt-4 text-lg font-bold leading-snug text-[#302630] dark:text-[#FAFAFA]">
                        {statement.title}
                      </h3>
                      <p className="mt-2.5 flex-1 text-xs sm:text-sm leading-6 text-[#746873] dark:text-[#A3A3A3]">
                        {statement.shortDescription}
                      </p>

                      <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#E7DCE4] dark:border-[#292929] pt-4">
                        <div>
                          <p
                            className={`text-xs font-bold ${
                              isSelected
                                ? "text-[#BE3477] dark:text-[#8B5CF6]"
                                : statement.status === "Available"
                                  ? "text-emerald-700 dark:text-emerald-400"
                                  : "text-[#746873] dark:text-[#A3A3A3]"
                            }`}
                          >
                            {isSelected ? "Your selection ✓" : statement.status}
                          </p>
                          <p className="mt-0.5 text-[11px] text-[#746873] dark:text-[#A3A3A3]">
                            {statement.selectedCount} selected
                            {statement.maxTeams !== null
                              ? ` / ${statement.maxTeams} teams`
                              : " / no limit"}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setDetails(statement)}
                          className="rounded-xl border border-[#E7DCE4] dark:border-[#292929] bg-white dark:bg-[#171717] px-3 py-1.5 text-xs font-semibold text-[#302630] dark:text-[#FAFAFA] hover:bg-[#F1E9EF] dark:hover:bg-[#202020] transition shadow-xs"
                        >
                          Details
                        </button>
                      </div>

                      {canSelect && (
                        <button
                          type="button"
                          onClick={() => setConfirmSelection(statement)}
                          className="mt-4 w-full rounded-xl bg-[#BE3477] dark:bg-[#8B5CF6] px-4 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-[#a62a66] dark:hover:bg-[#A78BFA] active:scale-[0.98]"
                        >
                          Select this problem
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>

              {filteredStatements.length === 0 && (
                <div className="mt-6 rounded-3xl border border-dashed border-[#E7DCE4] dark:border-[#292929] p-10 text-center">
                  <p className="font-bold text-[#302630] dark:text-[#FAFAFA]">No matching statements</p>
                  <p className="mt-1 text-sm text-[#746873] dark:text-[#A3A3A3]">
                    Try another search term or domain filter.
                  </p>
                </div>
              )}
            </section>
          </>
        ) : (
          <section className="glass-panel mt-8 rounded-3xl p-8 border border-white/80 dark:border-[#292929] dark:bg-[#111111] shadow-xs text-center">
            <p className="text-sm text-[#746873] dark:text-[#A3A3A3]">
              Round 3 could not be loaded.
            </p>
            <button
              type="button"
              onClick={() => void loadState(true)}
              className="mt-4 rounded-xl bg-[#BE3477] dark:bg-[#8B5CF6] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#a62a66] dark:hover:bg-[#A78BFA]"
            >
              Retry
            </button>
          </section>
        )}
      </div>

      {/* Details Dialog */}
      {details && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#302630]/40 dark:bg-black/75 backdrop-blur-sm p-4"
          onClick={() => setDetails(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="statement-dialog-title"
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/80 dark:border-[#292929] bg-white/95 dark:bg-[#111111] p-6 sm:p-8 text-[#302630] dark:text-[#FAFAFA] shadow-2xl animate-fade-in"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#E7DCE4] dark:border-[#292929] pb-4">
              <div>
                <span className="rounded-full bg-[#FCE7F1] dark:bg-[#8B5CF6]/15 text-[#BE3477] dark:text-[#8B5CF6] border border-transparent dark:border-[#8B5CF6]/30 px-2.5 py-0.5 text-xs font-bold">
                  {details.domain}
                </span>
                <h2
                  id="statement-dialog-title"
                  className="mt-2 text-2xl font-bold tracking-tight text-[#302630] dark:text-[#FAFAFA]"
                >
                  {details.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDetails(null)}
                className="rounded-xl border border-[#E7DCE4] dark:border-[#292929] bg-white dark:bg-[#171717] px-3 py-1.5 text-xs font-bold text-[#746873] dark:text-[#A3A3A3] hover:text-[#BE3477] dark:hover:text-[#8B5CF6]"
                aria-label="Close statement details"
              >
                ✕
              </button>
            </div>

            <div className="mt-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#746873] dark:text-[#A3A3A3]">Problem description</h3>
              <div className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[#302630] dark:text-[#FAFAFA]">
                {details.description || details.shortDescription || "No description provided yet."}
              </div>
            </div>

            {details.constraints && (
              <div className="mt-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#746873] dark:text-[#A3A3A3]">Constraints</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#746873] dark:text-[#A3A3A3]">
                  {details.constraints}
                </p>
              </div>
            )}

            {details.deliverables && (
              <div className="mt-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#746873] dark:text-[#A3A3A3]">Deliverables</h3>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm leading-6 text-[#746873] dark:text-[#A3A3A3]">
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
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#746873] dark:text-[#A3A3A3]">Hints</h3>
                <div className="mt-3 space-y-2.5">
                  {details.hints.map((hint) => (
                    <div
                      key={hint.id}
                      className="rounded-2xl border border-[#E7DCE4] dark:border-[#292929] bg-[#F1E9EF]/50 dark:bg-[#171717] p-4"
                    >
                      <p className="text-xs font-bold text-[#302630] dark:text-[#FAFAFA]">{hint.title}</p>
                      <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-[#746873] dark:text-[#A3A3A3]">
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
                  className="mt-8 w-full rounded-xl bg-[#BE3477] dark:bg-[#8B5CF6] px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#a62a66] dark:hover:bg-[#A78BFA] active:scale-[0.98]"
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
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#302630]/40 dark:bg-black/75 backdrop-blur-sm p-4"
          onClick={() => {
            if (!selecting) setConfirmSelection(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="w-full max-w-md rounded-3xl border border-white/80 dark:border-[#292929] bg-white/95 dark:bg-[#111111] p-6 sm:p-7 text-[#302630] dark:text-[#FAFAFA] shadow-2xl animate-fade-in"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#D9468D] dark:text-[#8B5CF6]">
              Confirmation required
            </p>
            <h2 id="confirm-title" className="mt-1 text-xl font-bold">
              Confirm your selection
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#746873] dark:text-[#A3A3A3]">
              Your team is about to select{" "}
              <strong className="font-bold text-[#302630] dark:text-[#FAFAFA]">
                {confirmSelection.title}
              </strong>
              . This choice cannot be changed by your team after confirmation.
            </p>
            <p className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
              Make sure your team agrees before continuing.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={selecting}
                onClick={() => setConfirmSelection(null)}
                className="rounded-xl border border-[#E7DCE4] dark:border-[#292929] bg-white dark:bg-[#171717] px-4 py-2.5 text-sm font-semibold text-[#302630] dark:text-[#FAFAFA] hover:bg-[#F1E9EF] dark:hover:bg-[#202020] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={selecting}
                onClick={() => void selectStatement()}
                className="rounded-xl bg-[#BE3477] dark:bg-[#8B5CF6] px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#a62a66] dark:hover:bg-[#A78BFA] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
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
