
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";

const optionSchema = z.object({
  label: z.enum(["A", "B", "C", "D", "E", "F"]),
  content: z.string().trim().min(1, "Option content is required."),
  isCode: z.boolean().default(false),
  isCorrect: z.boolean().default(false),
});

const questionSchema = z.object({
  id: z.string().optional(),
  externalId: z.string().trim().optional(),
  text: z.string().trim().min(1, "Question text is required."),
  codeLanguage: z
    .enum(["c", "cpp", "java", "python", "javascript"])
    .nullable()
    .optional(),
  code: z.string().optional(),
  type: z.enum(["THEORY", "CODE"]),
  timeSeconds: z.number().int().min(1).max(3600).nullable(),
  marks: z.number().int().min(1).max(100),
  included: z.boolean().default(true),
  options: z.array(optionSchema).min(2).max(6),
}).superRefine((data, ctx) => {
  const labels = data.options.map((option) => option.label);

  if (new Set(labels).size !== labels.length) {
    ctx.addIssue({
      code: "custom",
      path: ["options"],
      message: "Option labels must be unique.",
    });
  }

  if (data.options.filter((option) => option.isCorrect).length !== 1) {
    ctx.addIssue({
      code: "custom",
      path: ["options"],
      message: "Select exactly one correct option.",
    });
  }

  if (data.code?.trim() && !data.codeLanguage) {
    ctx.addIssue({
      code: "custom",
      path: ["codeLanguage"],
      message: "Choose a language for the code block.",
    });
  }
});

export type QuestionInput = z.input<typeof questionSchema>;

export type QuestionActionResult =
  | { success: true; message: string }
  | { success: false; message: string };

function revalidateQuestionPages() {
  revalidatePath("/admin/questions");
  revalidatePath("/admin/settings");
}

export async function saveQuestion(
  input: QuestionInput,
): Promise<QuestionActionResult> {
  await requireAdmin();

  const parsed = questionSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid question.",
    };
  }

  const data = parsed.data;
  const externalId = data.externalId || null;

  try {
    await prisma.$transaction(async (tx) => {
      if (externalId) {
        const existing = await tx.question.findUnique({
          where: { externalId },
          select: { id: true },
        });

        if (existing && existing.id !== data.id) {
          throw new Error("That external ID is already assigned to another question.");
        }
      }

      let questionId = data.id;

      if (questionId) {
        const existing = await tx.question.findUnique({
          where: { id: questionId },
          select: { id: true },
        });

        if (!existing) {
          throw new Error("Question not found.");
        }

        await tx.question.update({
          where: { id: questionId },
          data: {
            externalId,
            text: data.text,
            codeLanguage: data.code?.trim() ? data.codeLanguage ?? null : null,
            code: data.code?.trim() ? data.code : null,
            type: data.code?.trim() ? "CODE" : data.type,
            timeSeconds: data.timeSeconds,
            marks: data.marks,
            included: data.included,
          },
        });

        await tx.questionOption.deleteMany({
          where: { questionId },
        });
      } else {
        const last = await tx.question.findFirst({
          orderBy: [{ position: "desc" }, { id: "desc" }],
          select: { position: true },
        });

        const created = await tx.question.create({
          data: {
            externalId,
            text: data.text,
            codeLanguage: data.code?.trim() ? data.codeLanguage ?? null : null,
            code: data.code?.trim() ? data.code : null,
            type: data.code?.trim() ? "CODE" : data.type,
            timeSeconds: data.timeSeconds,
            marks: data.marks,
            included: data.included,
            position: (last?.position ?? 0) + 1,
          },
          select: { id: true },
        });

        questionId = created.id;
      }

      if (!questionId) {
        throw new Error("Failed to resolve question ID.");
      }

      await tx.questionOption.createMany({
        data: data.options.map((option) => ({
          questionId: questionId!,
          label: option.label,
          content: option.content,
          isCode: option.isCode,
          isCorrect: option.isCorrect,
        })),
      });
    });

    revalidateQuestionPages();

    return {
      success: true,
      message: data.id ? "Question updated." : "Question created.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to save question.",
    };
  }
}

export async function updateQuestionTiming(
  questionId: string,
  timeSeconds: number | null,
): Promise<QuestionActionResult> {
  await requireAdmin();

  if (!questionId || (
    timeSeconds !== null &&
    (!Number.isInteger(timeSeconds) || timeSeconds < 1 || timeSeconds > 3600)
  )) {
    return { success: false, message: "Invalid question timing." };
  }

  try {
    await prisma.question.update({
      where: { id: questionId },
      data: { timeSeconds },
    });

    revalidateQuestionPages();

    return { success: true, message: "Question time updated." };
  } catch {
    return { success: false, message: "Could not update question time." };
  }
}

export async function updateQuestionMarks(
  questionId: string,
  marks: number,
): Promise<QuestionActionResult> {
  await requireAdmin();

  if (!questionId || !Number.isInteger(marks) || marks < 1 || marks > 100) {
    return { success: false, message: "Marks must be between 1 and 100." };
  }

  try {
    await prisma.question.update({
      where: { id: questionId },
      data: { marks },
    });

    revalidateQuestionPages();

    return { success: true, message: "Question marks updated." };
  } catch {
    return { success: false, message: "Could not update question marks." };
  }
}

export async function toggleQuestionIncluded(
  questionId: string,
  included: boolean,
): Promise<QuestionActionResult> {
  await requireAdmin();

  if (!questionId || typeof included !== "boolean") {
    return { success: false, message: "Invalid inclusion setting." };
  }

  try {
    await prisma.question.update({
      where: { id: questionId },
      data: { included },
    });

    revalidateQuestionPages();

    return { success: true, message: "Question inclusion updated." };
  } catch {
    return { success: false, message: "Could not update question inclusion." };
  }
}

export async function deleteQuestion(
  questionId: string,
): Promise<QuestionActionResult> {
  await requireAdmin();

  if (!questionId) {
    return { success: false, message: "Invalid question ID." };
  }

  try {
    await prisma.question.delete({
      where: { id: questionId },
    });

    revalidateQuestionPages();

    return { success: true, message: "Question deleted." };
  } catch {
    return { success: false, message: "Could not delete question." };
  }
}

export async function reorderQuestion(
  questionId: string,
  direction: "up" | "down",
): Promise<QuestionActionResult> {
  await requireAdmin();

  if (!questionId || !["up", "down"].includes(direction)) {
    return { success: false, message: "Invalid reorder request." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const questions = await tx.question.findMany({
        orderBy: [{ position: "asc" }, { id: "asc" }],
        select: { id: true, position: true },
      });

      const index = questions.findIndex((question) => question.id === questionId);

      if (index === -1) throw new Error("Question not found.");

      const otherIndex = direction === "up" ? index - 1 : index + 1;

      if (otherIndex < 0 || otherIndex >= questions.length) return;

      const current = questions[index]!;
      const other = questions[otherIndex]!;

      // Use a temporary position to avoid transient collisions.
      await tx.question.update({
        where: { id: current.id },
        data: { position: -1 },
      });

      await tx.question.update({
        where: { id: other.id },
        data: { position: current.position },
      });

      await tx.question.update({
        where: { id: current.id },
        data: { position: other.position },
      });
    });

    revalidateQuestionPages();

    return { success: true, message: "Question order updated." };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Could not reorder questions.",
    };
  }
}


export async function deleteAllQuestions() {
  await requireAdmin();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const run = await tx.quizRun.findUnique({
        where: { id: "main" },
        select: { status: true },
      });

      if (run?.status === "RUNNING" || run?.status === "PAUSED") {
        throw new Error(
          "End the quiz before deleting all questions.",
        );
      }

      // Responses reference questions, so delete them first.
      await tx.response.deleteMany();

      // Frozen quiz slots also reference questions.
      await tx.quizRunQuestion.deleteMany();

      // Clear the frozen team roster for the old practice run.
      await tx.quizRoster.deleteMany();

      // Options belong to questions.
      await tx.questionOption.deleteMany();

      const questions = await tx.question.deleteMany();

      // Keep the run reusable after the question bank is cleared.
      if (run) {
        await tx.quizRun.update({
          where: { id: "main" },
          data: {
            status: "NOT_STARTE",
            startedAt: null,
            pausedAt: null,
            pausedMs: 0,
            skipMs: 0,
            endedAt: null,
          },
        });
      }

      return questions;
    });

    revalidateQuestionPages();

    return {
      success: true,
      message: `Deleted ${result.count} questions.`,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Could not delete all questions.",
    };
  }
}
