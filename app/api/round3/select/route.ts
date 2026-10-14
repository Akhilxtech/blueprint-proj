
import { NextResponse } from "next/server";
import { Prisma } from "@/lib/generated/prisma/client";
import { getParticipantForApi } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";
import { getRound3Window } from "@/lib/round3-windows";

export async function POST(request: Request) {
  try {
const authResult = await getParticipantForApi();

if ("error" in authResult) {
  return authResult.error;
}

const { team } = authResult;
    if (!team.isFinalist) {
      return NextResponse.json(
        { error: "Only finalist teams can select a problem statement." },
        { status: 403 },
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 },
      );
    }

    if (
      typeof body !== "object" ||
      body === null ||
      !("statementId" in body) ||
      typeof body.statementId !== "string" ||
      !body.statementId.trim()
    ) {
      return NextResponse.json(
        { error: "A valid statementId is required." },
        { status: 400 },
      );
    }

    const statementId = body.statementId.trim();

    const window = await getRound3Window("selection");

    if (!window.isOpen || !window.deadline ||
        Date.parse(window.deadline) <= Date.now()) {
      return NextResponse.json(
        { error: "Problem selection is closed." },
        { status: 409 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Lock this statement row so concurrent teams cannot exceed its capacity.
      const lockedRows = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id"
        FROM "problem_statements"
        WHERE "id" = ${statementId}
        FOR UPDATE
      `;

      if (lockedRows.length === 0) {
        return {
          ok: false as const,
          status: 404,
          error: "Problem statement not found.",
        };
      }

      const statement = await tx.problemStatement.findUnique({
        where: { id: statementId },
        select: {
          id: true,
          title: true,
          enabled: true,
          maxTeams: true,
        },
      });

      if (!statement || !statement.enabled) {
        return {
          ok: false as const,
          status: 409,
          error: "This problem statement is unavailable.",
        };
      }

      const existingSelection = await tx.teamSelection.findUnique({
        where: { teamId: team.id },
        include: { statement: { select: { title: true } } },
      });

      if (existingSelection) {
        return {
          ok: false as const,
          status: 409,
          error: `Your team already chose "${existingSelection.statement.title}".`,
          selectedStatementId: existingSelection.statementId,
        };
      }

      // Recheck the deadline after obtaining the row lock.
      const currentWindow = await getRound3Window("selection");

      if (
        !currentWindow.isOpen ||
        !currentWindow.deadline ||
        Date.parse(currentWindow.deadline) <= Date.now()
      ) {
        return {
          ok: false as const,
          status: 409,
          error: "Problem selection is closed.",
        };
      }

      const selectedCount = await tx.teamSelection.count({
  where: { statementId },
});

if (selectedCount > 0) {
  return {
    ok: false as const,
    status: 409,
    error:
      "This problem statement has already been selected by another team. Please choose a different statement.",
  };
}
      const selection = await tx.teamSelection.create({
        data: {
          teamId: team.id,
          statementId,
        },
        select: {
          statementId: true,
          selectedAt: true,
        },
      });

      return {
        ok: true as const,
        selection: {
          statementId: selection.statementId,
          selectedAt: selection.selectedAt.toISOString(),
          title: statement.title,
        },
      };
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          ...(result.selectedStatementId
            ? { selectedStatementId: result.selectedStatementId }
            : {}),
        },
        { status: result.status },
      );
    }

    return NextResponse.json(
      { success: true, selection: result.selection },
      { status: 201 },
    );
  } catch (error) {
    // A simultaneous request from another team member may win the unique teamId constraint.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      try {
const authResult = await getParticipantForApi();

if ("error" in authResult) {
  return authResult.error;
}

const { team } = authResult;        const existing = await prisma.teamSelection.findUnique({
          where: { teamId: team.id },
          include: { statement: { select: { title: true } } },
        });

        if (existing) {
          return NextResponse.json(
            {
              error: `Your team already chose "${existing.statement.title}".`,
              selectedStatementId: existing.statementId,
            },
            { status: 409 },
          );
        }
      } catch {
        // Fall through to the generic error response.
      }
    }

    console.error("Round 3 selection error:", error);

    return NextResponse.json(
      { error: "Could not select this problem. Please try again." },
      { status: 500 },
    );
  }
}
