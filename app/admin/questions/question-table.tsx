"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/confirm-dialog";
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

  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<QuestionRow | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

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
          setAlertMessage(result.message ?? "Operation failed.");
          return;
        }

        router.refresh();
      } catch {
        setAlertMessage(
          "Something went wrong. Please check your connection and try again.",
        );
      } finally {
        setActiveActionId(null);
      }
    });
  }

  const [isDeletingAll, startDeleteTransition] = useTransition();

  function requestDeleteAllQuestions() {
    setShowDeleteAllConfirm(true);
  }

  function handleConfirmDeleteAll() {
    setShowDeleteAllConfirm(false);
    startDeleteTransition(async () => {
      try {
        const result = await deleteAllQuestions();

        if (!result.success) {
          setAlertMessage(result.message);
          return;
        }

        router.refresh();
      } catch (error) {
        setAlertMessage(
          error instanceof Error
            ? error.message
            : "Failed to delete questions.",
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
      setAlertMessage("Enter a whole number between 1 and 3600 seconds.");
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
      setAlertMessage("Enter a whole number between 1 and 100.");
      return;
    }

    if (marks === question.marks) return;

    executeAction(question.id, () =>
      updateQuestionMarks(question.id, marks),
    );
  }

  function requestDeleteQuestion(question: QuestionRow) {
    setQuestionToDelete(question);
  }

  function handleConfirmDeleteQuestion() {
    if (!questionToDelete) return;
    const target = questionToDelete;
    setQuestionToDelete(null);
    executeAction(target.id, () => deleteQuestion(target.id));
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
      <section className="overflow-hidden rounded-2xl border border-white/70 bg-white/70 shadow-sm backdrop-blur-md">
        <div className="space-y-4 border-b border-[#E7DCE4] p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-[#302630]">Question bank</h2>
              <p className="mt-0.5 text-xs text-[#4E404C]">
                Leave time blank to use the default duration for the question type.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={requestDeleteAllQuestions}
                disabled={isDeletingAll || questions.length === 0}
                className="rounded-xl border border-rose-300 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isDeletingAll ? "Deleting..." : "Delete all questions"}
              </button>

              <button
                type="button"
                onClick={openCreateEditor}
                className="rounded-xl bg-[#BE3477] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#a82a67] active:scale-[0.98] transition-all"
              >
                + Add question
              </button>
            </div>
          </div>

          <QuestionCsvImport />
        </div>

        {alertMessage && (
          <div className="mx-5 mt-4 flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-900">
            <span>{alertMessage}</span>
            <button
              type="button"
              onClick={() => setAlertMessage(null)}
              className="text-amber-800 hover:text-amber-950 font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {questions.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-bold text-[#302630]">No questions yet</p>
            <p className="mt-1 text-xs text-[#4E404C]">
              Create your first question or import via CSV to get started.
            </p>
            <button
              type="button"
              onClick={openCreateEditor}
              className="mt-4 rounded-xl bg-[#BE3477] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#a82a67] transition-all"
            >
              Create question
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-xs">
              <thead className="border-b border-[#E7DCE4] bg-[#F1E9EF]/80 text-[#4E404C]">
                <tr>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider">Position</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider">Question</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider">Time (sec)</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider">Marks</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider">Included</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider">Order</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#E7DCE4] bg-white/60">
                {questions.map((question, index) => {
                  const isRowBusy =
                    isPending && activeActionId === question.id;

                  return (
                    <tr
                      key={question.id}
                      className={`hover:bg-[#FCE7F1]/20 transition-opacity ${
                        !question.included ? "opacity-50" : ""
                      }`}
                    >
                      <td className="px-4 py-3 font-mono font-bold text-[#BE3477]">
                        #{question.position}
                      </td>

                      <td className="max-w-[280px] px-4 py-3">
                        <p
                          className="truncate font-bold text-[#302630]"
                          title={question.text}
                        >
                          {question.text}
                        </p>
                        <p className="mt-0.5 text-xs text-[#4E404C]">
                          {question.options.length} options
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full border border-[#D9468D]/20 bg-[#FCE7F1] px-2.5 py-0.5 text-xs font-bold text-[#BE3477]">
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
                          className="w-20 rounded-xl border border-[#E7DCE4] bg-white px-2.5 py-1.5 font-semibold text-[#302630] outline-none focus:border-[#D9468D] disabled:opacity-50"
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
                          className="w-16 rounded-xl border border-[#E7DCE4] bg-white px-2.5 py-1.5 font-semibold text-[#302630] outline-none focus:border-[#D9468D] disabled:opacity-50"
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
                          className={`rounded-xl border px-3 py-1 text-xs font-bold transition-all disabled:opacity-50 ${
                            question.included
                              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                              : "border-[#E7DCE4] bg-white/60 text-[#4E404C] hover:text-[#302630]"
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
                            className="rounded-lg border border-[#E7DCE4] bg-white px-2 py-1 text-xs font-bold text-[#4E404C] hover:bg-[#FCE7F1] hover:text-[#BE3477] disabled:pointer-events-none disabled:opacity-30"
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
                            className="rounded-lg border border-[#E7DCE4] bg-white px-2 py-1 text-xs font-bold text-[#4E404C] hover:bg-[#FCE7F1] hover:text-[#BE3477] disabled:pointer-events-none disabled:opacity-30"
                            aria-label={`Move question ${question.position} down`}
                          >
                            ↓
                          </button>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => openEditEditor(question)}
                            className="rounded-xl border border-[#E7DCE4] bg-white/80 px-3 py-1.5 text-xs font-semibold text-[#302630] hover:bg-white transition-colors disabled:opacity-50"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            disabled={isRowBusy}
                            onClick={() => requestDeleteQuestion(question)}
                            className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors disabled:opacity-40"
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

      <ConfirmDialog
        isOpen={showDeleteAllConfirm}
        title="Delete All Questions"
        description="Are you sure you want to delete ALL questions and their options? This cannot be undone."
        confirmLabel="Delete All Questions"
        cancelLabel="Cancel"
        isDestructive
        onConfirm={handleConfirmDeleteAll}
        onCancel={() => setShowDeleteAllConfirm(false)}
      />

      <ConfirmDialog
        isOpen={!!questionToDelete}
        title="Delete Question"
        description={`Are you sure you want to delete question #${questionToDelete?.position}? This cannot be undone.`}
        confirmLabel="Delete Question"
        cancelLabel="Cancel"
        isDestructive
        onConfirm={handleConfirmDeleteQuestion}
        onCancel={() => setQuestionToDelete(null)}
      />
    </>
  );
}