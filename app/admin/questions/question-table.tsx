"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteQuestion,
  reorderQuestion,
  toggleQuestionIncluded,
  updateQuestionMarks,
  updateQuestionTiming,
} from "./question-actions";
import QuestionEditor from "./questions-editor";
import QuestionCsvImport from "./question-import-csv";

import { deleteAllQuestions } from "./question-actions";

type CodeLanguage = "c" | "cpp" | "java" | "javascript" | "python";
type QuestionType = "THEORY" | "CODE";


export interface OptionRow {
  id: string;
  label: string;
  content: string;
  isCode: boolean;
  isCorrect: boolean;
}

export interface QuestionRow {
  id: string;
  externalId?: string | null;
  position: number;
  text: string;
  type: string;
  code?: string | null;
  codeLanguage?: string | null;
  timeSeconds: number | null;
  marks: number;
  included: boolean;
  options: OptionRow[];
}

interface ActionResult {
  success: boolean;
  message?: string;
}

interface QuestionsTableProps {
  questions: QuestionRow[];
}



function normalizeLanguage(language?: string | null): CodeLanguage {
  switch (language) {
    case "c":
    case "cpp":
    case "java":
    case "python":
    case "javascript":
      return language;
    default:
      return "javascript";
  }
}

export default function QuestionsTable({ questions }: QuestionsTableProps) {
  const router = useRouter();
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] =
    useState<QuestionRow | null>(null);

  function openCreateEditor() {
    setEditingQuestion(null);
    setEditorOpen(true);
  }

  function openEditEditor(question: QuestionRow) {
    setEditingQuestion(question);
    setEditorOpen(true);
  }

  function closeEditor() {
    setEditorOpen(false);
    setEditingQuestion(null);
    router.refresh();
  }

  function executeAction(
    questionId: string,
    action: () => Promise<ActionResult>,
  ) {
    setActiveActionId(questionId);

    startTransition(async () => {
      try {
        const result = await action();

        if (!result.success) {
          window.alert(result.message ?? "Operation failed.");
          return;
        }

        router.refresh();
      } catch {
        window.alert(
          "Something went wrong. Please check your connection and try again.",
        );
      } finally {
        setActiveActionId(null);
      }
    });
  }

const [isDeletingAll, startDeleteTransition] = useTransition();

function handleDeleteAllQuestions() {
  const confirmed = window.confirm(
    "Delete ALL questions and their options? This cannot be undone."
  );

  if (!confirmed) return;

  startDeleteTransition(async () => {
    try {
      const result = await deleteAllQuestions();

      if (result.success) {
        window.alert(
          `Deleted ${result.deletedQuestions} questions successfully.`
        );
        router.refresh();
      }
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Failed to delete questions."
      );
    }
  });
}

  function handleSaveTime(question: QuestionRow, rawValue: string) {
    const trimmed = rawValue.trim();

    if (trimmed === "") {
      if (question.timeSeconds !== null) {
        executeAction(question.id, () =>
          updateQuestionTiming(question.id, null),
        );
      }
      return;
    }

    const seconds = Number(trimmed);

    if (!Number.isInteger(seconds) || seconds < 1 || seconds > 3600) {
      window.alert("Enter a whole number between 1 and 3600 seconds.");
      return;
    }

    if (seconds === question.timeSeconds) return;

    executeAction(question.id, () =>
      updateQuestionTiming(question.id, seconds),
    );
  }

  function handleSaveMarks(question: QuestionRow, rawValue: string) {
    const marks = Number(rawValue.trim());

    if (!Number.isInteger(marks) || marks < 1 || marks > 100) {
      window.alert("Enter a whole number between 1 and 100.");
      return;
    }

    if (marks === question.marks) return;

    executeAction(question.id, () =>
      updateQuestionMarks(question.id, marks),
    );
  }

  function handleConfirmDelete(question: QuestionRow) {
    const confirmed = window.confirm(
      `Delete question ${question.position}? This cannot be undone.`,
    );

    if (!confirmed) return;

    executeAction(question.id, () => deleteQuestion(question.id));
  }

  const initialQuestion = editingQuestion
    ? {
        id: editingQuestion.id,
        externalId: editingQuestion.externalId ?? undefined,
        text: editingQuestion.text,
        type: (
          editingQuestion.type === "CODE" ? "CODE" : "THEORY"
        ) as QuestionType,
        code: editingQuestion.code ?? "",
        codeLanguage: normalizeLanguage(editingQuestion.codeLanguage),
        timeSeconds: editingQuestion.timeSeconds,
        marks: editingQuestion.marks,
        included: editingQuestion.included,
        options: editingQuestion.options.map((option) => ({
          id: option.id,
          label: option.label as "A" | "B" | "C" | "D" | "E" | "F",
          content: option.content,
          isCode: option.isCode,
          isCorrect: option.isCorrect,
          codeLanguage: normalizeLanguage(editingQuestion.codeLanguage),
        })),
      }
    : null;

  return (
    <>
      <section className="overflow-hidden rounded-xl border bg-card text-card-foreground">
        {/* <div className="flex items-center justify-between gap-4 border-b p-4">
          <div>
            <h2 className="font-semibold">Question bank</h2>
            <p className="text-sm text-muted-foreground">
              Leave time blank to use the default duration for the question
              type.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateEditor}
            disabled={isPending}
            className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
          >
            Add question
          </button>
        </div> */
        

          <div className="space-y-4 border-b p-4">
  <div className="flex items-center justify-between gap-4">
    <div>
      <h2 className="font-semibold">Question bank</h2>
      <p className="text-sm text-muted-foreground">
        Leave time blank to use the default duration for the question type.
      </p>
    </div>

    <div className="flex items-center gap-2">
  <button
    type="button"
    onClick={handleDeleteAllQuestions}
    disabled={isDeletingAll || questions.length === 0}
    className="rounded-md border border-red-500 px-3 py-2 text-sm text-red-500 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
  >
    {isDeletingAll ? "Deleting..." : "Delete all questions"}
  </button>

  <button
    type="button"
    onClick={openCreateEditor}
    className="rounded-md border px-3 py-2 text-sm"
  >
    Add question
  </button>
</div>
  </div>

  <QuestionCsvImport />
</div>

        }



        {questions.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-medium text-foreground">No questions yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first question to get started.
            </p>
            <button
              type="button"
              onClick={openCreateEditor}
              className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
            >
              Create question
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Position</th>
                  <th className="px-4 py-3 font-medium">Question</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Time (sec)</th>
                  <th className="px-4 py-3 font-medium">Marks</th>
                  <th className="px-4 py-3 font-medium">Included</th>
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {questions.map((question, index) => {
                  const isRowBusy =
                    isPending && activeActionId === question.id;

                  return (
                    <tr
                      key={question.id}
                      className={`transition-opacity ${
                        !question.included ? "opacity-50" : ""
                      }`}
                    >
                      <td className="px-4 py-3 font-mono text-muted-foreground">
                        {question.position}
                      </td>

                      <td className="max-w-[280px] px-4 py-3">
                        <p
                          className="truncate font-medium text-foreground"
                          title={question.text}
                        >
                          {question.text}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {question.options.length} options
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-md border px-2 py-0.5 text-xs font-medium">
                          {question.type}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <input
                          key={`${question.id}-time-${question.timeSeconds}`}
                          type="number"
                          min={1}
                          max={3600}
                          defaultValue={question.timeSeconds ?? ""}
                          placeholder="Default"
                          disabled={isPending}
                          onBlur={(event) =>
                            handleSaveTime(
                              question,
                              event.currentTarget.value,
                            )
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.currentTarget.blur();
                            }
                          }}
                          className="w-24 rounded-md border bg-background px-2 py-1.5 disabled:opacity-50"
                          aria-label={`Time override for question ${question.position}`}
                        />
                      </td>

                      <td className="px-4 py-3">
                        <input
                          key={`${question.id}-marks-${question.marks}`}
                          type="number"
                          min={1}
                          max={100}
                          defaultValue={question.marks}
                          disabled={isPending}
                          onBlur={(event) =>
                            handleSaveMarks(
                              question,
                              event.currentTarget.value,
                            )
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.currentTarget.blur();
                            }
                          }}
                          className="w-20 rounded-md border bg-background px-2 py-1.5 disabled:opacity-50"
                          aria-label={`Marks for question ${question.position}`}
                        />
                      </td>

                      <td className="px-4 py-3">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            executeAction(question.id, () =>
                              toggleQuestionIncluded(
                                question.id,
                                !question.included,
                              ),
                            )
                          }
                          className={`rounded-md border px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${
                            question.included
                              ? "bg-secondary text-secondary-foreground"
                              : "border-dashed text-muted-foreground"
                          }`}
                        >
                          {question.included ? "Included" : "Excluded"}
                        </button>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            disabled={index === 0 || isPending}
                            onClick={() =>
                              executeAction(question.id, () =>
                                reorderQuestion(question.id, "up"),
                              )
                            }
                            className="rounded border p-1 text-xs disabled:pointer-events-none disabled:opacity-30"
                            aria-label={`Move question ${question.position} up`}
                          >
                            ↑
                          </button>

                          <button
                            type="button"
                            disabled={
                              index === questions.length - 1 || isPending
                            }
                            onClick={() =>
                              executeAction(question.id, () =>
                                reorderQuestion(question.id, "down"),
                              )
                            }
                            className="rounded border p-1 text-xs disabled:pointer-events-none disabled:opacity-30"
                            aria-label={`Move question ${question.position} down`}
                          >
                            ↓
                          </button>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => openEditEditor(question)}
                            className="rounded border px-3 py-1.5 text-xs disabled:opacity-50"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            disabled={isRowBusy}
                            onClick={() => handleConfirmDelete(question)}
                            className="rounded-md border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive disabled:opacity-40"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <QuestionEditor
        open={editorOpen}
        initialQuestion={initialQuestion}
        onClose={closeEditor}
      />
    </>
  );
}