
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";
import { getRound2Settings } from "@/lib/round2";

const settingsSchema = z
  .object({
    weightRound1: z.number().min(0).max(1),
    weightRound2: z.number().min(0).max(1),
    finalistCount: z.number().int().min(1).max(500),
    questionMaxMarks: z
      .array(z.number().int().min(1).max(10000))
      .length(10)
      .optional(),
  })
  .refine(
    (data) =>
      Math.abs(data.weightRound1 + data.weightRound2 - 1) < 0.000001,
    {
      message: "Round 1 and Round 2 weights must sum to 1.",
      path: ["weightRound2"],
    },
  );

export async function PATCH(request: Request) {
  await requireAdmin();

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body." },
      { status: 400 },
    );
  }

  const parsed = settingsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid Round 2 settings.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const {
    weightRound1,
    weightRound2,
    finalistCount,
    questionMaxMarks,
  } = parsed.data;

  try {
    const operations = [
      prisma.setting.upsert({
        where: { key: "round2.weightRound1" },
        create: { key: "round2.weightRound1", value: weightRound1 },
        update: { value: weightRound1 },
      }),
      prisma.setting.upsert({
        where: { key: "round2.weightRound2" },
        create: { key: "round2.weightRound2", value: weightRound2 },
        update: { value: weightRound2 },
      }),
      prisma.setting.upsert({
        where: { key: "round2.finalistCount" },
        create: { key: "round2.finalistCount", value: finalistCount },
        update: { value: finalistCount },
      }),
    ];

    if (questionMaxMarks) {
      operations.push(
        prisma.setting.upsert({
          where: { key: "round2.questionMaxMarks" },
          create: {
            key: "round2.questionMaxMarks",
            value: questionMaxMarks,
          },
          update: { value: questionMaxMarks },
        }),
      );
    }

    await prisma.$transaction(operations);

    return NextResponse.json({
      success: true,
      settings: await getRound2Settings(),
    });
  } catch (error) {
    console.error("Round 2 settings error:", error);

    return NextResponse.json(
      { error: "Could not save Round 2 settings." },
      { status: 500 },
    );
  }
}
