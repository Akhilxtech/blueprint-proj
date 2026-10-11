"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";

const languages = ["c", "cpp", "java", "python", "javascript"] as const;
const labels = ["A", "B", "C", "D", "E", "F"] as const;

const csvQuestionSchema = z.object({
  external_id: z.string().trim().min(1).max(120),
  question_text: z.string().trim().min(1).max(20000),
  code_language: z.enum(languages).or(z.literal("")).optional(),
  code: z.string().max(20000).optional(),
  option_a: z.string().trim().optional(),
  option_b: z.string().trim().optional(),
  option_c: z.string().trim().optional(),
  option_d: z.string().trim().optional(),
  option_e: z.string().trim().optional(),
  option_f: z.string().trim().optional(),
  correct_option: z.enum(labels),
  marks: z.coerce.number().int().min(1).max(100),
  question_type: z.enum(["THEORY", "CODE"]).or(z.literal("")).optional(),
  time_seconds: z.union([
    z.literal(""),
    z.coerce.number().int().min(1).max(3600),
  ]).optional(),
});

export type CsvQuestionRow = z.input<typeof csvQuestionSchema>;

export type CsvImportResult =
  | {
      success: true;
      message: string;
      created: number;
      updated: number;
    }
  | { success: false; message: string };

export async function importQuestionsFromCsv(
  input: unknown,
): Promise<CsvImportResult> {
  await requireAdmin();

  if (!Array.isArray(input) || input.length === 0) {
    return { success: false, message: "The CSV contains no question rows." };
  }

  if (input.length > 500) {
    return {
      success: false,
      message: "Import is limited to 500 questions per file.",
    };
  }

  const parsedRows = input.map((row, index) => {
    const parsed = csvQuestionSchema.safeParse(row);

    if (!parsed.success) {
      throw new Error(
        `Row ${index + 2}: ${parsed.error.issues[0]?.message ?? "Invalid data."}`,
      );
    }

    const data = parsed.data;
    const options = labels.flatMap((label) => {
      const content = data[`option_${label.toLowerCase()}` as
        | "option_a"
        | "option_b"
        | "option_c"
        | "option_d"
        | "option_e"
        | "option_f"];

      return content?.trim()
        ? [{
            label,
            content: content.trim(),
            isCorrect: label === data.correct_option,
          }]
        : [];
    });

    if (options.length < 2) {
      throw new Error(`Row ${index + 2}: Provide at least two options.`);
    }

    if (!options.some((option) => option.isCorrect)) {
      throw new Error(
        `Row ${index + 2}: The correct option must have content.`,
      );
    }

    const code = data.code?.trim() ?? "";
    const language = data.code_language || "";

    if (code && !language) {
      throw new Error(
        `Row ${index + 2}: Select a code language when code is provided.`,
      );
    }

    return {
      externalId: data.external_id,
      text: data.question_text,
      code: code || null,
      codeLanguage: code ? language || null : null,
      type: data.question_type || (code ? "CODE" : "THEORY"),
      timeSeconds:
        data.time_seconds === "" || data.time_seconds == null
          ? null
          : Number(data.time_seconds),
      marks: Number(data.marks),
      options,
    };
  });

  const ids = parsedRows.map((row) => row.externalId);
  if (new Set(ids).size !== ids.length) {
    return {
      success: false,
      message: "The CSV contains duplicate external_id values.",
    };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      let created = 0;
      let updated = 0;

      const existingQuestions = await tx.question.findMany({
        where: { externalId: { in: ids } },
        select: { id: true, externalId: true, position: true },
      });

      const existingByExternalId = new Map(
        existingQuestions.map((question) => [
          question.externalId,
          question,
        ]),
      );

      const lastQuestion = await tx.question.findFirst({
        orderBy: [{ position: "desc" }, { id: "desc" }],
        select: { position: true },
      });

      let nextPosition = lastQuestion?.position ?? 0;

      for (const row of parsedRows) {
        const existing = existingByExternalId.get(row.externalId);

        let questionId: string;

        if (existing) {
          questionId = existing.id;

          await tx.question.update({
            where: { id: questionId },
            data: {
              text: row.text,
              code: row.code,
              codeLanguage: row.codeLanguage,
              type: row.type,
              timeSeconds: row.timeSeconds,
              marks: row.marks,
            },
          });

          await tx.questionOption.deleteMany({
            where: { questionId },
          });

          updated++;
        } else {
          nextPosition++;

          const question = await tx.question.create({
            data: {
              externalId: row.externalId,
              text: row.text,
              code: row.code,
              codeLanguage: row.codeLanguage,
              type: row.type,
              timeSeconds: row.timeSeconds,
              marks: row.marks,
              position: nextPosition,
              included: true,
            },
            select: { id: true },
          });

          questionId = question.id;
          created++;
        }

        await tx.questionOption.createMany({
          data: row.options.map((option) => ({
            questionId,
            label: option.label,
            content: option.content,
            isCorrect: option.isCorrect,
            isCode: false,
          })),
        });
      }

      return { created, updated };
    });

    revalidatePath("/admin/questions");
    revalidatePath("/admin/settings");

    return {
      success: true,
      ...result,
      message: `Import complete: ${result.created} created, ${result.updated} updated.`,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to import questions.",
    };
  }
}
