
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";
import { getRound2Settings } from "@/lib/round2";

const markSchema = z.object({
  teamId: z.string().min(1),
  questionNo: z.number().int().min(1).max(10),
  marks: z.number().int().min(0).max(10000),
});

export async function POST(request: Request) {
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

  const parsed = markSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid marks. Question must be 1-10 and marks must be a whole number from 0 to 10000.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { teamId, questionNo, marks } = parsed.data;

  try {
    const settings = await getRound2Settings();
    const maximum = settings.questionMaxMarks[questionNo - 1];

    if (marks > maximum) {
      return NextResponse.json(
        {
          error: `Question ${questionNo} has a maximum of ${maximum} marks.`,
        },
        { status: 400 },
      );
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true },
    });

    if (!team) {
      return NextResponse.json(
        { error: "Team not found." },
        { status: 404 },
      );
    }

    const saved = await prisma.round2Mark.upsert({
      where: {
        teamId_questionNo: { teamId, questionNo },
      },
      create: { teamId, questionNo, marks },
      update: { marks },
      select: { teamId: true, questionNo: true, marks: true },
    });

    return NextResponse.json(
      { success: true, mark: saved },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Round 2 mark save error:", error);

    return NextResponse.json(
      { error: "Could not save this mark." },
      { status: 500 },
    );
  }
}
