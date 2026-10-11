"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Phase =
  | "NOT_STARTED"
  | "COUNTDOWN"
  | "QUESTION"
  | "GAP"
  | "PAUSED"
  | "ENDED";

type QuizState = {
  serverNow: string;
  phase: Phase;
  index: number;
  total: number;
  questionId: string | null;
  questionEndsAtMs: number | null;
  msUntilStart: number;
  remainingMs: number;
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

  // Keep local selections tied to the question they belong to.
  const [selectedAnswer, setSelectedAnswer] = useState<{
    questionId: string;
    optionId: string;
  } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [clientNow, setClientNow] = useState(0);

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

      setServerOffsetMs(Date.parse(data.serverNow) - Date.now());
      setState(data);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load quiz state.",
      );
    }
  }, []);

  useEffect(() => {
    const initialFetch = window.setTimeout(() => {
      void refreshState();
    }, 0);

    const poll = window.setInterval(() => {
      void refreshState();
    }, 1000);

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
  }, [activeQuestionId]);

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

    // A local selection is only relevant to its own question.
    const currentSelection =
      selectedAnswer?.questionId === questionId
        ? selectedAnswer.optionId
        : null;

    if (currentSelection) return;
    if (answerRequestId.current === questionId) return;

    answerRequestId.current = questionId;
    setSubmitting(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/quiz/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId,
          optionId,
          clientEventId: crypto.randomUUID(),
        }),
      });

      const data = (await response.json()) as AnswerResponse;

      if (!response.ok) {
        throw new Error(data.error ?? "Could not submit your answer.");
      }

      if (data.lockedOptionId) {
        setSelectedAnswer({
          questionId,
          optionId: data.lockedOptionId,
        });
      }

      if (data.accepted) {
        setNotice("Answer locked.");
      } else if (data.reason === "ALREADY_ANSWERED") {
        setNotice("Your team's answer was already locked.");

        if (data.lockedOptionId) {
          setSelectedAnswer({
            questionId,
            optionId: data.lockedOptionId,
          });
        }
      } else {
        setNotice("Answer was not accepted. Refreshing quiz state.");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not submit your answer.",
      );
    } finally {
      answerRequestId.current = null;
      setSubmitting(false);
      await refreshState();
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

  const visibleQuestion =
    state?.phase === "QUESTION" && question?.id === state.questionId
      ? question
      : null;

  // Never reuse a local selection from a different question.
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

     
      {!rulesAccepted && (
        <div className="rounded-2xl border border-white/10 bg-zinc-900 p-6">
          <h2 className="text-xl font-semibold">Before you begin</h2>

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
            <span>
              I have read and agree to the quiz rules.
            </span>
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
          <p className="mt-5 text-zinc-300">
            Question complete. Get ready for the next one.
          </p>
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
              <p className="text-2xl font-bold tabular-nums">
                {displaySeconds}s
              </p>
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
                        disabled={locked || submitting}
                        onClick={() => void submitAnswer(option.id)}
                        className={`rounded-xl border p-4 text-left transition ${
                          selected
                            ? "border-violet-400 bg-violet-500/15"
                            : "border-white/10 bg-zinc-950 hover:border-violet-400/60"
                        } disabled:cursor-not-allowed disabled:opacity-80`}
                      >
                        <span className="font-semibold">{option.label}.</span>{" "}
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

                {displayedOptionId && (
                  <p className="mt-4 text-sm text-zinc-400">
                    Your team&apos;s answer is locked. You cannot change it.
                  </p>
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
    </section>
  );
}
