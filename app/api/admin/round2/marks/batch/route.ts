
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";
import { getRound2Settings } from "@/lib/round2";

const batchSchema = z.object({
  marks: z
    .array(
      z.object({
        teamId: z.string().min(1),
        questionNo: z.number().int().min(1).max(10),
        marks: z.number().int().min(0).max(10000),
      }),
    )
    .min(1)
    .max(1000),
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

  const parsed = batchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid batch. Check team IDs, question numbers, and marks.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const entries = parsed.data.marks;
  const seen = new Set<string>();

  for (const entry of entries) {
    const key = `${entry.teamId}:${entry.questionNo}`;

    if (seen.has(key)) {
      return NextResponse.json(
        {
          error: `Duplicate entry for question ${entry.questionNo} of team ${entry.teamId}.`,
        },
        { status: 400 },
      );
    }

    seen.add(key);
  }

  try {
    const settings = await getRound2Settings();

    for (const entry of entries) {
      const maximum = settings.questionMaxMarks[entry.questionNo - 1];

      if (
        maximum === undefined ||
        entry.marks > maximum
      ) {
        return NextResponse.json(
          {
            error: `Question ${entry.questionNo} has a maximum of ${maximum ?? 0} marks.`,
          },
          { status: 400 },
        );
      }
    }

    const teamIds = [...new Set(entries.map((entry) => entry.teamId))];

    const existingTeams = await prisma.team.findMany({
      where: { id: { in: teamIds } },
      select: { id: true },
    });

    const existingTeamIds = new Set(existingTeams.map((team) => team.id));
    const missingTeam = teamIds.find((id) => !existingTeamIds.has(id));

    if (missingTeam) {
      return NextResponse.json(
        { error: "One or more teams could not be found." },
        { status: 404 },
      );
    }

    await prisma.$transaction(async (tx) => {
      for (const entry of entries) {
        await tx.round2Mark.upsert({
          where: {
            teamId_questionNo: {
              teamId: entry.teamId,
              questionNo: entry.questionNo,
            },
          },
          create: {
            teamId: entry.teamId,
            questionNo: entry.questionNo,
            marks: entry.marks,
          },
          update: {
            marks: entry.marks,
          },
        });
      }
    });

    return NextResponse.json(
      {
        success: true,
        savedCount: entries.length,
        message: `Successfully saved ${entries.length} mark entries.`,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Round 2 batch mark save error:", error);

    return NextResponse.json(
      { error: "Could not save all marks. No partial changes were committed." },
      { status: 500 },
    );
  }
}
