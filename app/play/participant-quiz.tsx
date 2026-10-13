
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BookX,
  Smartphone,
  Laptop,
  Lock,
  Timer,
  TriangleAlert,
  DoorClosed,
} from "lucide-react";
import { useTabSwitchGuard } from "@/hooks/use-tab-switch-guard";

type Phase =
  | "NOT_STARTED"
  | "COUNTDOWN"
  | "QUESTION"
  | "GAP"
  | "PAUSED"
  | "ENDED";

type QuizState = {
  runStartedAt: string | null;
  serverNow: string;
  phase: Phase;
  index: number;
  total: number;
  questionId: string | null;
  questionEndsAtMs: number | null;
  msUntilStart: number;
  remainingMs: number;
  questionDurationMs: number;
  team: {
    id: string;
    name: string;
    onRoster: boolean;
    quizStatus: "ACTIVE" | "ELIMINATED";
    warningCount: number;
    maxWarnings: number;
  };
  lockedOptionId: string | null;
  verdict: {
    questionId: string;
    selectedOptionId: string | null;
    isCorrect: boolean;
  } | null;
};

type QuizQuestion = {
  id: string;
  text: string;
  type: string;
  code: string | null;
  codeLanguage: string | null;
  codeHtml: string | null;
  options: {
    id: string;
    label: string;
    content: string;
    isCode: boolean;
  }[];
};

type QuestionResponse = {
  phase: Phase;
  index?: number;
  total?: number;
  question: QuizQuestion | null;
  reason?: string;
};

type AnswerResponse = {
  accepted?: boolean;
  reason?: string;
  error?: string;
  lockedOptionId?: string | null;
  responseMs?: number;
};

type ViolationResult = {
  success?: boolean;
  ignored?: boolean;
  duplicate?: boolean;
  warningCount?: number;
  maxWarnings?: number;
  eliminated?: boolean;
  error?: string;
};

type Props = {
  initialRulesAccepted: boolean;
};

export default function ParticipantQuiz({
  initialRulesAccepted,
}: Props) {
  const [rulesChecked, setRulesChecked] = useState(false);
  const [rulesAccepted, setRulesAccepted] = useState(initialRulesAccepted);
  const [acceptingRules, setAcceptingRules] = useState(false);

  const [state, setState] = useState<QuizState | null>(null);
  const [question, setQuestion] = useState<QuizQuestion | null>(null);

  const [selectedAnswer, setSelectedAnswer] = useState<{
    questionId: string;
    optionId: string;
  } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [clientNow, setClientNow] = useState(0);
  const [answerNeedsRetry, setAnswerNeedsRetry] = useState(false);

  const [warningModal, setWarningModal] = useState<{
    warningCount: number;
    maxWarnings: number;
  } | null>(null);

  const runStartedAtRef = useRef<string | null | undefined>(undefined);

  const answerEventRef = useRef<{
    questionId: string;
    optionId: string;
    clientEventId: string;
  } | null>(null);

  const questionRequestId = useRef<string | null>(null);
  const answerRequestId = useRef<string | null>(null);

  const refreshState = useCallback(async () => {
    try {
      const response = await fetch("/api/quiz/state", {
        cache: "no-store",
      });

      const data = (await response.json()) as QuizState & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not load quiz state.");
      }

     const nextRunStartedAt = data.runStartedAt ?? null;
const previousRunStartedAt = runStartedAtRef.current;

const isNewRun =
  previousRunStartedAt !== undefined &&
  previousRunStartedAt !== nextRunStartedAt;

if (isNewRun) {
  // Remove the previous run's local answer and status message.
  setSelectedAnswer(null);
  setNotice("");
  setError("");
  setAnswerNeedsRetry(false);
  setSubmitting(false);

  answerEventRef.current = null;
  answerRequestId.current = null;

  // Force the question-loading effect to recognize a new run.
  questionRequestId.current = null;
  setQuestion(null);
}

runStartedAtRef.current = nextRunStartedAt;

setServerOffsetMs(Date.parse(data.serverNow) - Date.now());
setState(data);
setError("");
      if (
        data.phase === "QUESTION" &&
        data.questionId &&
        data.lockedOptionId
      ) {
        setSelectedAnswer({
          questionId: data.questionId,
          optionId: data.lockedOptionId,
        });
        setAnswerNeedsRetry(false);
      }

      // Do not leave a stale warning modal open after the team
      // has been eliminated by this or another request.
      if (data.team.quizStatus === "ELIMINATED") {
        setWarningModal(null);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load quiz state.",
      );
    }
  }, []);

  const handleViolation = useCallback((result: ViolationResult) => {
    if (typeof result.warningCount !== "number") return;

    setState((current) => {
      if (!current) return current;

      return {
        ...current,
        team: {
          ...current.team,
          warningCount: result.warningCount!,
          maxWarnings:
            result.maxWarnings ?? current.team.maxWarnings,
          quizStatus: result.eliminated
            ? "ELIMINATED"
            : current.team.quizStatus,
        },
      };
    });

    if (result.eliminated) {
      setWarningModal(null);
      setNotice("");
      setError("");
      return;
    }

    if (result.duplicate || result.ignored) return;

    setWarningModal({
      warningCount: result.warningCount,
      maxWarnings: result.maxWarnings ?? 3,
    });
  }, []);

  // The hook is declared after its dependencies and at the top level.
  // It handles visibility changes, blur/focus, and retrying violations.
  useTabSwitchGuard({
    enabled:
      !!state &&
      state.team.onRoster &&
      state.team.quizStatus === "ACTIVE" &&
      (state.phase === "QUESTION" || state.phase === "GAP"),
    minAwaySeconds: 1,
    onViolation: handleViolation,
  });

  useEffect(() => {
    const initialFetch = window.setTimeout(() => {
      void refreshState();
    }, 0);

    const poll = window.setInterval(() => {
      void refreshState();
    }, 2000);

    const clock = window.setInterval(() => {
      setClientNow(Date.now());
    }, 200);

    return () => {
      window.clearTimeout(initialFetch);
      window.clearInterval(poll);
      window.clearInterval(clock);
    };
  }, [refreshState]);

  const activeQuestionId =
    state?.phase === "QUESTION" ? state.questionId : null;

  useEffect(() => {
    if (!activeQuestionId) {
      questionRequestId.current = null;
      return;
    }

    if (questionRequestId.current === activeQuestionId) return;

    questionRequestId.current = activeQuestionId;
    let cancelled = false;

    async function loadQuestion() {
      try {
        const response = await fetch("/api/quiz/question", {
          cache: "no-store",
        });

        const data = (await response.json()) as QuestionResponse & {
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error ?? "Could not load the question.");
        }

        if (cancelled) return;

        if (
          data.phase === "QUESTION" &&
          data.question?.id === activeQuestionId
        ) {
          setQuestion(data.question);
        } else {
          questionRequestId.current = null;
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load the question.",
          );
          questionRequestId.current = null;
        }
      }
    }

    void loadQuestion();

    return () => {
      cancelled = true;
    };
  }, [activeQuestionId ,state?.runStartedAt]);

  async function acceptRules() {
    setAcceptingRules(true);
    setError("");

    try {
      const response = await fetch("/api/play/ready", {
        method: "POST",
      });

      const data = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Could not accept the rules.");
      }

      setRulesAccepted(true);
      setNotice("Rules accepted. Waiting for the quiz to start.");
      await refreshState();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not accept the rules.",
      );
    } finally {
      setAcceptingRules(false);
    }
  }

  async function submitAnswer(optionId: string) {
    if (
      !state ||
      !question ||
      submitting ||
      state.phase !== "QUESTION" ||
      question.id !== state.questionId ||
      !state.team.onRoster ||
      state.team.quizStatus !== "ACTIVE" ||
      state.lockedOptionId
    ) {
      return;
    }

    const questionId = question.id;

    const currentSelection =
      selectedAnswer?.questionId === questionId
        ? selectedAnswer.optionId
        : null;

    // Retrying can only resend the original choice.
    if (currentSelection && currentSelection !== optionId) return;
    if (answerRequestId.current === questionId) return;

    let answerEvent = answerEventRef.current;

    if (
      !answerEvent ||
      answerEvent.questionId !== questionId ||
      answerEvent.optionId !== optionId
    ) {
      answerEvent = {
        questionId,
        optionId,
        clientEventId: crypto.randomUUID(),
      };
      answerEventRef.current = answerEvent;
    }

    // Lock the selection in the UI immediately.
    setSelectedAnswer({ questionId, optionId });
    setSubmitting(true);
    setAnswerNeedsRetry(false);
    setError("");
    setNotice("Saving answer…");
    answerRequestId.current = questionId;

    const wait = (ms: number) =>
      new Promise<void>((resolve) => window.setTimeout(resolve, ms));

    let submissionError = "";

    try {
      let completed = false;

      for (let attempt = 0; attempt < 4; attempt++) {
        let response: Response;

        try {
          response = await fetch("/api/quiz/answer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              questionId,
              optionId,
              clientEventId: answerEvent.clientEventId,
            }),
          });
        } catch {
          if (attempt < 3) {
            await wait([300, 700, 1500][attempt]);
            continue;
          }

          setAnswerNeedsRetry(true);
          throw new Error(
            "Connection failed. Your selection is retained; retry saving the same answer.",
          );
        }

        if (
          (response.status === 429 || response.status >= 500) &&
          attempt < 3
        ) {
          await wait([300, 700, 1500][attempt]);
          continue;
        }

        if (response.status === 429 || response.status >= 500) {
          setAnswerNeedsRetry(true);
          throw new Error(
            "The server could not confirm your answer. Retry saving the same answer.",
          );
        }

        const data = (await response.json()) as AnswerResponse;

        if (!response.ok) {
          if (response.status === 403) {
            // A 403 may mean the team was eliminated while the
            // answer request was in flight. Refresh authoritative state.
            await refreshState();
          }

          throw new Error(data.error ?? "Could not submit your answer.");
        }

        if (data.lockedOptionId) {
          setSelectedAnswer({
            questionId,
            optionId: data.lockedOptionId,
          });
        }

        if (data.accepted) {
          setNotice("Answer saved and locked.");
        } else if (data.reason === "ALREADY_ANSWERED") {
          setNotice("Your team's previously saved answer is locked.");
        } else {
          setNotice("The answer was not accepted. Refreshing quiz state.");
        }

        setAnswerNeedsRetry(false);
        completed = true;
        break;
      }

      if (!completed) {
        setAnswerNeedsRetry(true);
        setNotice("");
        throw new Error(
          "Could not confirm your answer. Retry saving the same answer.",
        );
      }
    } catch (err) {
      submissionError =
        err instanceof Error ? err.message : "Could not submit your answer.";
      setNotice("");
      setError(submissionError);
    } finally {
      answerRequestId.current = null;
      setSubmitting(false);
      await refreshState();

      if (submissionError) setError(submissionError);
    }
  }

  const estimatedServerNow = clientNow + serverOffsetMs;

  const countdownMs =
    state?.phase === "COUNTDOWN"
      ? Math.max(
          0,
          Date.parse(state.serverNow) +
            serverOffsetMs +
            state.msUntilStart -
            estimatedServerNow,
        )
      : 0;

  const questionRemainingMs =
    state?.phase === "QUESTION" && state.questionEndsAtMs !== null
      ? Math.max(0, state.questionEndsAtMs - estimatedServerNow)
      : 0;

  const displayMs =
    state?.phase === "QUESTION" ? questionRemainingMs : countdownMs;

  const displaySeconds = Math.ceil(displayMs / 1000);

  const totalTimerMs =
    state?.phase === "QUESTION"
      ? Math.max(state.questionDurationMs, 1)
      : state?.phase === "COUNTDOWN"
        ? Math.max(state.msUntilStart, 1)
        : 1;

  const timerProgress = Math.min(
    100,
    Math.max(0, (displayMs / totalTimerMs) * 100),
  );

  const timerUrgency =
    displaySeconds <= 5
      ? "bg-red-500"
      : displaySeconds <= 15
        ? "bg-amber-400"
        : "bg-emerald-400";

  const timerTextColor =
    displaySeconds <= 5
      ? "text-red-400"
      : displaySeconds <= 15
        ? "text-amber-300"
        : "text-zinc-100";

  const visibleQuestion =
    state?.phase === "QUESTION" && question?.id === state.questionId
      ? question
      : null;

  const effectiveSelectedOptionId =
    state?.phase === "QUESTION" &&
    selectedAnswer?.questionId === state.questionId
      ? selectedAnswer.optionId
      : null;

  const lockedOptionId =
    state?.phase === "QUESTION" ? state.lockedOptionId : null;

  const displayedOptionId =
    lockedOptionId ?? effectiveSelectedOptionId;

  return (
    <section className="mt-8 space-y-6">
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
        >
          {error}
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4 text-sm text-violet-200"
        >
          {notice}
        </div>
      )}

      {state?.team.onRoster &&
        state.team.quizStatus === "ELIMINATED" && (
          <div
            role="alert"
            className="rounded-xl border border-red-500/40 bg-red-500/10 p-5"
          >
            <h2 className="text-lg font-bold text-red-300">
              Team eliminated
            </h2>
            <p className="mt-2 text-sm leading-6 text-red-200">
              Your team has been eliminated from the quiz and cannot submit
              further answers.
            </p>
            <p className="mt-2 text-sm text-red-200">
              Tab-switch warnings: {state.team.warningCount}
              {state.team.maxWarnings > 0
                ? ` / ${state.team.maxWarnings}`
                : ""}
            </p>
          </div>
        )}

      {!rulesAccepted && (
        <div className="rounded-2xl border border-white/10 bg-zinc-900 p-6">
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Please read the following quiz rules carefully before continuing.
            Your team must be marked ready by the administrator before it can
            be included in the quiz roster.
          </p>

          <div className="mt-5 space-y-3">
            {[
              {
                icon: BookX,
                title: "Closed-book",
                description:
                  "No notes, books or internet. Use only your own knowledge.",
              },
              {
                icon: Smartphone,
                title: "No AI or phones",
                description:
                  "AI tools, search engines and messaging apps are not allowed. Keep phones away.",
              },
              {
                icon: Laptop,
                title: "One device per team",
                description:
                  "Your team uses a single device. Discuss together, but don't talk to other teams.",
              },
              {
                icon: Lock,
                title: "First answer is final",
                description:
                  "Once you pick an option, it is locked. You can't change it.",
              },
              {
                icon: Timer,
                title: "No going back",
                description:
                  "Questions change automatically for all teams when the timer ends. You can't skip or return.",
              },
              {
                icon: TriangleAlert,
                title: "Stay on this screen",
                description:
                  "Leaving the quiz tab or window gives you a warning. After 3 warnings, your team is eliminated.",
              },
              {
                icon: DoorClosed,
                title: "No late joining",
                description:
                  "Once the quiz starts, new teams can't join. Stay on this page until it begins.",
              },
            ].map((rule) => {
              const Icon = rule.icon;

              return (
                <div
                  key={rule.title}
                  className="flex items-start gap-3 rounded-xl border border-white/10 bg-zinc-950 p-4"
                >
                  <div className="rounded-lg bg-violet-500/10 p-2 text-violet-300">
                    <Icon size={20} aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium text-zinc-100">
                      {rule.title}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-zinc-400">
                      {rule.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Follow the event rules. Your team must be ready before the
            administrator can include it in the quiz roster. Your team&apos;s
            first submitted answer for each question is final.
          </p>

          <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm text-zinc-200">
            <input
              type="checkbox"
              checked={rulesChecked}
              onChange={(event) => setRulesChecked(event.target.checked)}
              className="mt-1 size-4 accent-violet-500"
            />
            <span>I have read and agree to the quiz rules.</span>
          </label>

          <button
            type="button"
            onClick={() => void acceptRules()}
            disabled={!rulesChecked || acceptingRules}
            className="mt-5 rounded-lg bg-violet-500 px-5 py-3 text-sm font-semibold hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {acceptingRules ? "Accepting..." : "Accept & Continue"}
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-zinc-900 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-zinc-400">Quiz status</p>
            <h2 className="mt-1 text-2xl font-semibold">
              {state?.phase ?? "Connecting..."}
            </h2>
          </div>

          {state && (
            <div className="text-right">
              <p className="text-sm text-zinc-400">Team status</p>
              <p className="mt-1 font-medium">
                {!state.team.onRoster
                  ? "Not on roster"
                  : state.team.quizStatus}
              </p>

              {state.team.onRoster && (
                <p className="mt-2 text-sm text-zinc-400">
                  Tab-switch warnings:{" "}
                  <span
                    className={
                      state.team.maxWarnings > 0 &&
                      state.team.warningCount >= state.team.maxWarnings
                        ? "font-semibold text-red-300"
                        : "font-semibold text-amber-300"
                    }
                  >
                    {state.team.warningCount}
                    {state.team.maxWarnings > 0
                      ? ` / ${state.team.maxWarnings}`
                      : ""}
                  </span>
                </p>
              )}
            </div>
          )}
        </div>

        {state?.phase === "NOT_STARTED" && (
          <p className="mt-5 text-zinc-400">
            The quiz has not started yet. Stay on this page while the
            administrator prepares the quiz.
          </p>
        )}

        {state?.phase === "COUNTDOWN" && (
          <div className="mt-6 text-center">
            <p className="text-sm text-zinc-400">Quiz starts in</p>
            <p className="mt-2 text-6xl font-bold tabular-nums">
              {displaySeconds}
            </p>
          </div>
        )}

        {state?.phase === "PAUSED" && (
          <p className="mt-5 text-amber-300">
            The quiz is paused. Wait for the administrator to resume.
          </p>
        )}

        {state?.phase === "GAP" && (
          <div className="mt-6 rounded-xl border border-violet-500/20 bg-violet-500/5 p-5 text-center">
            <p className="text-sm font-medium text-violet-300">
              Question complete
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-white">
              {Math.ceil(
                Math.max(
                  0,
                  state.remainingMs -
                    (estimatedServerNow - Date.parse(state.serverNow)),
                ) / 1000,
              )}
              s
            </p>
            <p className="mt-2 text-sm text-zinc-400">
              Get ready for the next question.
            </p>
          </div>
        )}

        {state?.phase === "ENDED" && (
          <div className="mt-5">
            <h3 className="text-xl font-semibold">Quiz ended</h3>
            {state.verdict && (
              <p className="mt-3 text-sm text-zinc-300">
                Your final answer was{" "}
                {state.verdict.isCorrect ? "correct" : "incorrect"}.
              </p>
            )}
          </div>
        )}

        {state?.phase === "QUESTION" && (
          <div className="mt-6">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-zinc-400">
                Question {state.index + 1} of {state.total}
              </p>

              <p
                role="timer"
                aria-label={`${displaySeconds} seconds remaining`}
                className={`text-2xl font-bold tabular-nums ${timerTextColor}`}
              >
                {displaySeconds}s
              </p>
            </div>

            <div
              className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"
              role="progressbar"
              aria-label="Question time remaining"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(timerProgress)}
            >
              <div
                className={`h-full rounded-full transition-[width] duration-200 ${timerUrgency}`}
                style={{ width: `${timerProgress}%` }}
              />
            </div>

            {!state.team.onRoster ? (
              <p className="mt-6 text-amber-300">
                Your team is not in the frozen quiz roster.
              </p>
            ) : state.team.quizStatus === "ELIMINATED" ? (
              <p className="mt-6 text-red-300">
                Your team has been eliminated from the quiz.
              </p>
            ) : !visibleQuestion ? (
              <p className="mt-6 text-zinc-400">Loading question...</p>
            ) : (
              <div className="mt-6">
                <h3 className="whitespace-pre-wrap text-xl font-semibold leading-8">
                  {visibleQuestion.text}
                </h3>

                {visibleQuestion.code && (
                  <pre className="mt-4 overflow-x-auto rounded-lg border border-white/10 bg-zinc-950 p-4 text-sm">
                    <code>{visibleQuestion.code}</code>
                  </pre>
                )}

                <div className="mt-6 grid gap-3">
                  {visibleQuestion.options.map((option) => {
                    const selected = displayedOptionId === option.id;
                    const locked = displayedOptionId !== null;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        disabled={
                          locked ||
                          submitting ||
                          state.team.quizStatus !== "ACTIVE"
                        }
                        onClick={() => void submitAnswer(option.id)}
                        className={`rounded-xl border p-4 text-left transition ${
                          selected
                            ? "border-violet-400 bg-violet-500/15"
                            : "border-white/10 bg-zinc-950 hover:border-violet-400/60"
                        } disabled:cursor-not-allowed disabled:opacity-80`}
                      >
                        <span className="font-semibold">
                          {option.label}.
                        </span>{" "}
                        <span className="whitespace-pre-wrap">
                          {option.content}
                        </span>
                        {selected && (
                          <span className="ml-2 text-sm text-violet-300">
                            Locked
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {submitting && (
                  <p
                    role="status"
                    className="mt-4 text-sm text-violet-300"
                  >
                    Saving your answer…
                  </p>
                )}

                {displayedOptionId &&
                  !submitting &&
                  !answerNeedsRetry && (
                    <p className="mt-4 text-sm text-zinc-400">
                      Your team&apos;s answer is locked. You cannot change it.
                    </p>
                  )}

                {answerNeedsRetry &&
                  effectiveSelectedOptionId &&
                  !lockedOptionId && (
                    <div className="mt-4 space-y-3">
                      <p role="alert" className="text-sm text-amber-300">
                        We could not confirm that the answer was saved. Your
                        selection is retained. Retry the same answer; you
                        cannot change it.
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          void submitAnswer(effectiveSelectedOptionId)
                        }
                        disabled={submitting}
                        className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-400/20 disabled:opacity-50"
                      >
                        Retry saving answer
                      </button>
                    </div>
                  )}
              </div>
            )}
          </div>
        )}
      </div>

      {state?.verdict && state.phase !== "ENDED" && (
        <div
          className={`rounded-xl border p-4 ${
            state.verdict.isCorrect
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/30 bg-red-500/10 text-red-300"
          }`}
        >
          Previous question:{" "}
          {state.verdict.isCorrect ? "Correct answer" : "Incorrect answer"}
        </div>
      )}

      {/* Overlay leaves the timer and quiz visible behind the warning. */}
      {warningModal && state?.team.quizStatus !== "ELIMINATED" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="tab-warning-title"
            aria-describedby="tab-warning-description"
            className="w-full max-w-md rounded-2xl border border-amber-400/30 bg-zinc-900 p-6 shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <TriangleAlert
                className="text-amber-300"
                size={28}
                aria-hidden="true"
              />
              <h2
                id="tab-warning-title"
                className="text-xl font-bold text-amber-200"
              >
                Warning {warningModal.warningCount} of{" "}
                {warningModal.maxWarnings}
              </h2>
            </div>

            <p
              id="tab-warning-description"
              className="mt-4 text-sm leading-6 text-zinc-200"
            >
              You left the quiz screen. After {warningModal.maxWarnings}{" "}
              warnings your team will be eliminated.
            </p>

            <button
              type="button"
              autoFocus
              onClick={() => setWarningModal(null)}
              className="mt-6 w-full rounded-lg bg-amber-400 px-4 py-3 font-semibold text-zinc-950 hover:bg-amber-300"
            >
              I understand
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
