
"use client";

import { useEffect, useState, useTransition } from "react";
import type { FormEvent } from "react";

import QuestionCard from "@/components/questions/question-card";
import { saveQuestion } from "./question-actions";
import { getHighlightedCode } from "./highlight-actions";

const OPTION_LABELS = ["A", "B", "C", "D", "E", "F"] as const;

type OptionLabel = (typeof OPTION_LABELS)[number];
type CodeLanguage = "c" | "cpp" | "java" | "python" | "javascript";
type QuestionType = "THEORY" | "CODE";

type OptionInput = {
  id?: string;
  label: OptionLabel;
  content: string;
  isCode: boolean;
  isCorrect: boolean;
  codeLanguage: CodeLanguage;
};

type QuestionInput = {
  id?: string;
  externalId?: string | null;
  text: string;
  type: QuestionType;
  code?: string | null;
  codeLanguage?: CodeLanguage | null;
  timeSeconds: number | null;
  marks: number;
  included: boolean;
  options: OptionInput[];
};

type QuestionEditorProps = {
  open: boolean;
  initialQuestion?: QuestionInput | null;
  onClose: () => void;
};

const LANGUAGES: { value: CodeLanguage; label: string }[] = [
  { value: "c", label: "C" },
  { value: "cpp", label: "C++" },
  { value: "java", label: "Java" },
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
];

function createOption(label: OptionLabel): OptionInput {
  return {
    label,
    content: "",
    isCode: false,
    isCorrect: false,
    codeLanguage: "javascript",
  };
}

function createQuestion(): QuestionInput {
  return {
    text: "",
    type: "THEORY",
    code: "",
    codeLanguage: "javascript",
    timeSeconds: null,
    marks: 1,
    included: true,
    options: [
      { ...createOption("A"), isCorrect: true },
      createOption("B"),
    ],
  };
}

function normalizeQuestion(
  input?: QuestionInput | null,
): QuestionInput {
  if (!input) return createQuestion();

  return {
    ...input,
    options: input.options.map((option, index) => ({
      ...option,
      label: OPTION_LABELS[index],
      codeLanguage:
        option.codeLanguage ?? input.codeLanguage ?? "javascript",
    })),
  };
}

export default function QuestionEditor({
  open,
  initialQuestion,
  onClose,
}: QuestionEditorProps) {
  if (!open) return null;

  return (
    <QuestionEditorForm
      key={initialQuestion?.id ?? "new-question"}
      initialQuestion={initialQuestion}
      onClose={onClose}
    />
  );
}

function QuestionEditorForm({
  initialQuestion,
  onClose,
}: {
  initialQuestion?: QuestionInput | null;
  onClose: () => void;
}) {
  const [question, setQuestion] = useState<QuestionInput>(() =>
    normalizeQuestion(initialQuestion),
  );

  const [error, setError] = useState("");
  const [highlightedCode, setHighlightedCode] = useState("");
  const [highlightError, setHighlightError] = useState("");
  const [isPending, startTransition] = useTransition();

  const codeToHighlight = question.code?.trim() ?? "";
  const languageToHighlight = question.codeLanguage ?? "";

  useEffect(() => {
    const code = codeToHighlight;
    const language = languageToHighlight;

    if (!code || !language) {
      return;
    }

    let cancelled = false;

    async function highlight() {
      try {
        const result = await getHighlightedCode(code, language);

        if (cancelled) return;

        if (result.success) {
          setHighlightedCode(result.html);
          setHighlightError("");
        } else {
          setHighlightedCode("");
          setHighlightError(result.message);
        }
      } catch {
        if (cancelled) return;

        setHighlightedCode("");
        setHighlightError("Could not generate the code preview.");
      }
    }

    void highlight();

    return () => {
      cancelled = true;
    };
  }, [codeToHighlight, languageToHighlight]);

  // Never display highlighted HTML belonging to older code or a different language.
  const currentHighlightedCode =
    codeToHighlight &&
    languageToHighlight &&
    highlightedCode
      ? highlightedCode
      : undefined;

  function updateQuestion<K extends keyof QuestionInput>(
    key: K,
    value: QuestionInput[K],
  ) {
    setQuestion((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateOption(index: number, patch: Partial<OptionInput>) {
    setQuestion((current) => ({
      ...current,
      options: current.options.map((option, optionIndex) =>
        optionIndex === index ? { ...option, ...patch } : option,
      ),
    }));
  }

  function addOption() {
    if (question.options.length >= 6) return;

    const label = OPTION_LABELS[question.options.length];

    setQuestion((current) => ({
      ...current,
      options: [...current.options, createOption(label)],
    }));
  }

  function removeOption(index: number) {
    if (question.options.length <= 2) return;

    setQuestion((current) => {
      const options = current.options
        .filter((_, optionIndex) => optionIndex !== index)
        .map((option, optionIndex) => ({
          ...option,
          label: OPTION_LABELS[optionIndex],
        }));

      if (!options.some((option) => option.isCorrect)) {
        options[0] = { ...options[0], isCorrect: true };
      }

      return { ...current, options };
    });
  }

  function selectCorrectOption(index: number) {
    setQuestion((current) => ({
      ...current,
      options: current.options.map((option, optionIndex) => ({
        ...option,
        isCorrect: index === optionIndex,
      })),
    }));
  }

  function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!question.text.trim()) {
      setError("Enter the question text.");
      return;
    }

    if (question.options.length < 2 || question.options.length > 6) {
      setError("Add between 2 and 6 options.");
      return;
    }

    if (question.options.some((option) => !option.content.trim())) {
      setError("Fill in the content for every option.");
      return;
    }

    if (question.options.filter((option) => option.isCorrect).length !== 1) {
      setError("Select exactly one correct option.");
      return;
    }

    if (
      !Number.isInteger(question.marks) ||
      question.marks < 1 ||
      question.marks > 100
    ) {
      setError("Marks must be a whole number between 1 and 100.");
      return;
    }

    if (
      question.timeSeconds !== null &&
      (!Number.isInteger(question.timeSeconds) ||
        question.timeSeconds < 1 ||
        question.timeSeconds > 3600)
    ) {
      setError("Time must be between 1 and 3600 seconds.");
      return;
    }

    const code = question.code?.trim() || undefined;

    const payload = {
      ...(question.id ? { id: question.id } : {}),
      ...(question.externalId?.trim()
        ? { externalId: question.externalId.trim() }
        : {}),
      text: question.text.trim(),
      type: question.type,
      ...(code ? { code } : {}),
      codeLanguage: code ? question.codeLanguage ?? null : null,
      timeSeconds: question.timeSeconds,
      marks: question.marks,
      included: question.included,
      options: question.options.map((option) => ({
        label: option.label,
        content: option.content.trim(),
        isCode: option.isCode,
        isCorrect: option.isCorrect,
      })),
    };

    startTransition(async () => {
      try {
        const result = await saveQuestion(payload);

        if (!result.success) {
          setError(result.message);
          return;
        }

        onClose();
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not save the question. Please try again.",
        );
      }
    });
  }

  const previewOptions = question.options.map((option) => ({
    label: option.label,
    content: option.content || `Option ${option.label} preview`,
    isCode: option.isCode,
  }));

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isPending) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="question-editor-title"
        className="flex h-full w-full max-w-3xl flex-col overflow-hidden bg-background shadow-xl"
      >
        <header className="flex items-center justify-between border-b p-5">
          <div>
            <h2 id="question-editor-title" className="text-xl font-semibold">
              {question.id ? "Edit question" : "Create question"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Configure the question and answer options.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-md border px-3 py-2"
          >
            Close
          </button>
        </header>

        <form
          onSubmit={submitQuestion}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 space-y-6 overflow-y-auto p-5">
            <section className="space-y-2">
              <label htmlFor="external-id" className="text-sm font-medium">
                External ID (optional)
              </label>
              <input
                id="external-id"
                value={question.externalId ?? ""}
                onChange={(event) =>
                  updateQuestion("externalId", event.target.value)
                }
                placeholder="e.g. Q001"
                className="w-full rounded-md border bg-background px-3 py-2"
              />
            </section>

            <section className="space-y-2">
              <label htmlFor="question-text" className="text-sm font-medium">
                Question text
              </label>
              <textarea
                id="question-text"
                required
                rows={5}
                value={question.text}
                onChange={(event) =>
                  updateQuestion("text", event.target.value)
                }
                placeholder="Enter the question. Markdown syntax is accepted."
                className="w-full rounded-md border bg-background px-3 py-2"
              />
              <p className="text-xs text-muted-foreground">
                Markdown syntax can be entered. Rendering depends on the
                QuestionCard implementation.
              </p>
            </section>

            <section className="space-y-3 rounded-lg border p-4">
              <h3 className="font-semibold">Question code (optional)</h3>

              <label htmlFor="question-language" className="text-sm">
                Language
              </label>
              <select
                id="question-language"
                value={question.codeLanguage ?? "javascript"}
                onChange={(event) =>
                  updateQuestion(
                    "codeLanguage",
                    event.target.value as CodeLanguage,
                  )
                }
                className="w-full rounded-md border bg-background px-3 py-2"
              >
                {LANGUAGES.map((language) => (
                  <option key={language.value} value={language.value}>
                    {language.label}
                  </option>
                ))}
              </select>

              <textarea
                aria-label="Question code"
                rows={7}
                spellCheck={false}
                value={question.code ?? ""}
                onChange={(event) => {
                  const code = event.target.value;

                  setQuestion((current) => ({
                    ...current,
                    code,
                    type: code.trim() ? "CODE" : current.type,
                  }));
                }}
                placeholder="Paste code here..."
                className="w-full rounded-md border bg-background px-3 py-2 font-mono text-sm"
              />

              {codeToHighlight && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Syntax-highlighted code</p>

                  {currentHighlightedCode ? (
                    <div
                      className="max-h-72 overflow-auto rounded-lg border bg-muted/30 p-3 text-sm [&_pre]:m-0 [&_pre]:overflow-x-auto [&_pre]:whitespace-pre [&_code]:whitespace-pre"
                      dangerouslySetInnerHTML={{
                        __html: currentHighlightedCode,
                      }}
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Generating code preview...
                    </p>
                  )}

                  {highlightError && (
                    <p role="status" className="text-sm text-red-500">
                      {highlightError}
                    </p>
                  )}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Adding code automatically selects CODE. You can override the
                type below.
              </p>
            </section>

            <section className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <label htmlFor="question-type" className="text-sm font-medium">
                  Type
                </label>
                <select
                  id="question-type"
                  value={question.type}
                  onChange={(event) =>
                    updateQuestion("type", event.target.value as QuestionType)
                  }
                  className="w-full rounded-md border bg-background px-3 py-2"
                >
                  <option value="THEORY">Theory</option>
                  <option value="CODE">Code</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="question-time" className="text-sm font-medium">
                  Time override (sec)
                </label>
                <input
                  id="question-time"
                  type="number"
                  min={1}
                  max={3600}
                  value={question.timeSeconds ?? ""}
                  onChange={(event) =>
                    updateQuestion(
                      "timeSeconds",
                      event.target.value === ""
                        ? null
                        : Number(event.target.value),
                    )
                  }
                  placeholder="Default"
                  className="w-full rounded-md border bg-background px-3 py-2"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="question-marks" className="text-sm font-medium">
                  Marks
                </label>
                <input
                  id="question-marks"
                  type="number"
                  min={1}
                  max={100}
                  value={question.marks}
                  onChange={(event) =>
                    updateQuestion("marks", Number(event.target.value))
                  }
                  className="w-full rounded-md border bg-background px-3 py-2"
                />
              </div>
            </section>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={question.included}
                onChange={(event) =>
                  updateQuestion("included", event.target.checked)
                }
              />
              Include this question in the quiz
            </label>

            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold">Answer options</h3>
                <button
                  type="button"
                  onClick={addOption}
                  disabled={question.options.length >= 6}
                  className="rounded-md border px-3 py-2 text-sm disabled:opacity-40"
                >
                  Add option
                </button>
              </div>

              <p className="text-sm text-muted-foreground">
                Select exactly one correct answer. Add between 2 and 6 options.
              </p>

              {question.options.map((option, index) => (
                <div
                  key={option.label}
                  className="space-y-3 rounded-lg border p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2 font-medium">
                      <input
                        type="radio"
                        name="correct-option"
                        checked={option.isCorrect}
                        onChange={() => selectCorrectOption(index)}
                      />
                      Option {option.label}
                      {option.isCorrect && (
                        <span className="text-xs text-green-700">
                          Correct answer
                        </span>
                      )}
                    </label>

                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      disabled={question.options.length <= 2}
                      className="text-sm text-red-600 disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </div>

                  <textarea
                    required
                    rows={3}
                    value={option.content}
                    onChange={(event) =>
                      updateOption(index, { content: event.target.value })
                    }
                    placeholder={`Enter option ${option.label}`}
                    className="w-full rounded-md border bg-background px-3 py-2"
                  />

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={option.isCode}
                      onChange={(event) =>
                        updateOption(index, { isCode: event.target.checked })
                      }
                    />
                    This option contains code
                  </label>

                  {option.isCode && (
                    <select
                      value={option.codeLanguage}
                      onChange={(event) =>
                        updateOption(index, {
                          codeLanguage: event.target.value as CodeLanguage,
                        })
                      }
                      aria-label={`Language for option ${option.label}`}
                      className="w-full rounded-md border bg-background px-3 py-2"
                    >
                      {LANGUAGES.map((language) => (
                        <option key={language.value} value={language.value}>
                          {language.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
            </section>

            <section className="space-y-3">
              <h3 className="font-semibold">Live preview</h3>

              <div className="rounded-xl border p-4">
                <QuestionCard
                  question={{
                    text: question.text || "Your question will appear here.",
                    type: question.type,
                    marks: question.marks || 1,
                    code: codeToHighlight || undefined,
                    codeLanguage: languageToHighlight || undefined,
                    highlightedCode: currentHighlightedCode,
                    options: previewOptions,
                  }}
                />
              </div>
            </section>

            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}
          </div>

          <footer className="flex justify-end gap-3 border-t p-5">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-md border px-4 py-2"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
            >
              {isPending ? "Saving..." : "Save question"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}