
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
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-fade-in"
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
        className="flex h-full w-full max-w-3xl flex-col overflow-hidden border-l border-[#E7DCE4] bg-[#F7F2F5] shadow-2xl animate-fade-in-up"
      >
        <header className="flex items-center justify-between border-b border-[#E7DCE4] bg-white/80 p-5 backdrop-blur-xs">
          <div>
            <h2 id="question-editor-title" className="text-base font-bold text-[#302630]">
              {question.id ? "Edit question" : "Create question"}
            </h2>
            <p className="mt-0.5 text-xs text-[#4E404C]">
              Configure the question and answer options.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-xl border border-[#E7DCE4] bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-[#4E404C] hover:bg-white hover:text-[#302630] transition-colors"
          >
            Close
          </button>
        </header>

        <form
          onSubmit={submitQuestion}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            <section className="space-y-1.5">
              <label htmlFor="external-id" className="text-xs font-bold uppercase tracking-wider text-[#4E404C]">
                External ID (optional)
              </label>
              <input
                id="external-id"
                value={question.externalId ?? ""}
                onChange={(event) =>
                  updateQuestion("externalId", event.target.value)
                }
                placeholder="e.g. Q001"
                className="w-full rounded-xl border border-[#E7DCE4] bg-white/90 px-3.5 py-2 text-xs text-[#302630] outline-none placeholder:text-[#4E404C]/60 focus:border-[#D9468D] focus:ring-2 focus:ring-[#D9468D]/20 transition-all"
              />
            </section>

            <section className="space-y-1.5">
              <label htmlFor="question-text" className="text-xs font-bold uppercase tracking-wider text-[#4E404C]">
                Question text *
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
                className="w-full rounded-xl border border-[#E7DCE4] bg-white/90 px-3.5 py-2 text-xs text-[#302630] outline-none placeholder:text-[#4E404C]/60 focus:border-[#D9468D] focus:ring-2 focus:ring-[#D9468D]/20 transition-all"
              />
              <p className="text-2xs text-[#4E404C]">
                Markdown syntax can be entered. Rendering depends on the QuestionCard implementation.
              </p>
            </section>

            <section className="space-y-3 rounded-2xl border border-white/80 bg-white/70 p-4 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#BE3477]">
                Question code (optional)
              </h3>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="question-language" className="text-2xs font-bold uppercase tracking-wider text-[#4E404C]">
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
                    className="mt-1 w-full rounded-xl border border-[#E7DCE4] bg-white/90 px-3.5 py-2 text-xs text-[#302630] outline-none focus:border-[#D9468D]"
                  >
                    {LANGUAGES.map((language) => (
                      <option key={language.value} value={language.value}>
                        {language.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

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
                className="w-full rounded-xl border border-[#E7DCE4] bg-[#221721] p-3 font-mono text-xs text-pink-100 outline-none focus:border-[#D9468D]"
              />

              {codeToHighlight && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-[#4E404C]">Syntax-highlighted preview</p>

                  {currentHighlightedCode ? (
                    <div
                      className="max-h-72 overflow-auto rounded-xl border border-[#E7DCE4] bg-[#221721] p-3 text-xs [&_pre]:m-0 [&_pre]:overflow-x-auto [&_pre]:whitespace-pre [&_code]:whitespace-pre"
                      dangerouslySetInnerHTML={{
                        __html: currentHighlightedCode,
                      }}
                    />
                  ) : (
                    <p className="text-xs text-[#4E404C]">
                      Generating code preview...
                    </p>
                  )}

                  {highlightError && (
                    <p role="status" className="rounded-xl border border-rose-300 bg-rose-50 p-2.5 text-xs font-semibold text-rose-800">
                      {highlightError}
                    </p>
                  )}
                </div>
              )}

              <p className="text-2xs text-[#4E404C]">
                Adding code automatically selects CODE. You can override the type below.
              </p>
            </section>

            <section className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label htmlFor="question-type" className="text-xs font-bold uppercase tracking-wider text-[#4E404C]">
                  Type
                </label>
                <select
                  id="question-type"
                  value={question.type}
                  onChange={(event) =>
                    updateQuestion("type", event.target.value as QuestionType)
                  }
                  className="w-full rounded-xl border border-[#E7DCE4] bg-white px-3.5 py-2 text-xs font-bold text-[#302630] outline-none focus:border-[#D9468D]"
                >
                  <option value="THEORY">Theory</option>
                  <option value="CODE">Code</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="question-time" className="text-xs font-bold uppercase tracking-wider text-[#4E404C]">
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
                  className="w-full rounded-xl border border-[#E7DCE4] bg-white px-3.5 py-2 text-xs font-bold text-[#302630] outline-none focus:border-[#D9468D]"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="question-marks" className="text-xs font-bold uppercase tracking-wider text-[#4E404C]">
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
                  className="w-full rounded-xl border border-[#E7DCE4] bg-white px-3.5 py-2 text-xs font-bold text-[#302630] outline-none focus:border-[#D9468D]"
                />
              </div>
            </section>

            <label className="flex items-center gap-2.5 rounded-xl border border-white/80 bg-white/60 p-3 text-xs font-bold text-[#302630]">
              <input
                type="checkbox"
                className="accent-[#BE3477]"
                checked={question.included}
                onChange={(event) =>
                  updateQuestion("included", event.target.checked)
                }
              />
              Include this question in the quiz
            </label>

            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#BE3477]">
                    Answer options
                  </h3>
                  <p className="mt-0.5 text-xs text-[#4E404C]">
                    Select exactly one correct answer. Add between 2 and 6 options.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addOption}
                  disabled={question.options.length >= 6}
                  className="rounded-xl border border-[#D9468D]/30 bg-white/80 px-3.5 py-1.5 text-xs font-bold text-[#BE3477] hover:bg-[#FCE7F1] transition-colors disabled:opacity-40"
                >
                  + Add option
                </button>
              </div>

              {question.options.map((option, index) => (
                <div
                  key={option.label}
                  className="space-y-3 rounded-2xl border border-white/80 bg-white/70 p-4 shadow-xs"
                >
                  <div className="flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-xs font-bold text-[#302630]">
                      <input
                        type="radio"
                        name="correct-option"
                        className="accent-[#BE3477]"
                        checked={option.isCorrect}
                        onChange={() => selectCorrectOption(index)}
                      />
                      Option {option.label}
                      {option.isCorrect && (
                        <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-2xs font-bold text-emerald-800">
                          Correct answer
                        </span>
                      )}
                    </label>

                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      disabled={question.options.length <= 2}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline disabled:opacity-40"
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
                    className="w-full rounded-xl border border-[#E7DCE4] bg-white px-3.5 py-2 text-xs text-[#302630] outline-none focus:border-[#D9468D]"
                  />

                  <label className="flex items-center gap-2 text-xs text-[#4E404C]">
                    <input
                      type="checkbox"
                      className="accent-[#BE3477]"
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
                      className="w-full rounded-xl border border-[#E7DCE4] bg-white px-3.5 py-2 text-xs text-[#302630] outline-none focus:border-[#D9468D]"
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
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#4E404C]">Live preview</h3>

              <div className="rounded-2xl border border-white/80 bg-white/70 p-4 shadow-xs">
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
              <p role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
                {error}
              </p>
            )}
          </div>

          <footer className="flex justify-end gap-3 border-t border-[#E7DCE4] bg-white/80 p-4 backdrop-blur-xs">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-xl border border-[#E7DCE4] bg-white px-5 py-2 text-xs font-semibold text-[#4E404C] hover:bg-white hover:text-[#302630] transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isPending}
              className="rounded-xl bg-[#BE3477] px-6 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#a82a67] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isPending ? "Saving..." : "Save question"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}