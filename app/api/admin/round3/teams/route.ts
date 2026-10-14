import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyAdminApi } from "@/lib/admin-api";

 
 

export async function GET() {
  const authError = await verifyAdminApi();
  if (authError) return authError;

  try {
    const [teams, statements] = await Promise.all([
      prisma.team.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          isFinalist: true,
          selectionResetCount: true,
          round3Selection: {
            select: {
              id: true,
              statementId: true,
              selectedAt: true,
              assignedByAdmin: true,
              resetCount: true,
              statement: {
                select: {
                  id: true,
                  title: true,
                  domain: true,
                  enabled: true,
                },
              },
            },
          },
          deploymentSubmission: {
            select: {
              url: true,
              submittedAt: true,
              updatedAt: true,
            },
          },
        },
      }),
      prisma.problemStatement.findMany({
        orderBy: [{ displayOrder: "asc" }, { title: "asc" }],
        select: {
          id: true,
          title: true,
          domain: true,
          enabled: true,
          maxTeams: true,
          _count: {
            select: { selections: true },
          },
        },
      }),
    ]);

    return NextResponse.json({ teams, statements });
  } catch (error) {
    console.error("Failed to load Round 3 teams:", error);
    return NextResponse.json(
      { error: "Failed to load team management data." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const authError = await verifyAdminApi();
  if (authError) return authError;

  try {
    const body: unknown = await request.json();

    if (
      !body ||
      typeof body !== "object" ||
      !("teamId" in body) ||
      !("statementId" in body) ||
      typeof body.teamId !== "string" ||
      typeof body.statementId !== "string" ||
      !body.teamId.trim() ||
      !body.statementId.trim()
    ) {
      return NextResponse.json(
        { error: "A valid teamId and statementId are required." },
        { status: 400 },
      );
    }

    const { teamId, statementId } = body;

    const result = await prisma.$transaction(async (tx) => {
      const team = await tx.team.findUnique({
        where: { id: teamId },
        select: { id: true, isFinalist: true },
      });

      if (!team) {
        return { error: "Team not found.", status: 404 as const };
      }

      if (!team.isFinalist) {
        return {
          error: "Only finalist teams can be assigned a Round 3 statement.",
          status: 400 as const,
        };
      }

      const statement = await tx.problemStatement.findUnique({
        where: { id: statementId },
        select: { id: true, enabled: true, maxTeams: true },
      });

      if (!statement || !statement.enabled) {
        return {
          error: "The problem statement does not exist or is disabled.",
          status: 400 as const,
        };
      }

      const existing = await tx.teamSelection.findUnique({
        where: { teamId },
        select: { id: true, statementId: true },
      });

   if (existing?.statementId !== statementId) {
  // Lock the statement row to serialize competing admin assignments.
  const lockedRows = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id"
    FROM "problem_statements"
    WHERE "id" = ${statementId}
    FOR UPDATE
  `;

  if (lockedRows.length === 0) {
    return {
      error: "Problem statement not found.",
      status: 404 as const,
    };
  }

  const selectedCount = await tx.teamSelection.count({
    where: { statementId },
  });

  if (selectedCount > 0) {
    return {
      error: "This problem statement is already assigned to another team.",
      status: 409 as const,
    };
  }
}

      if (existing && existing.statementId !== statementId) {
        await tx.teamDeliverableProgress.deleteMany({
          where: {
            teamId,
            statementId: existing.statementId,
          },
        });
      }

      const selection = await tx.teamSelection.upsert({
        where: { teamId },
        create: {
          teamId,
          statementId,
          assignedByAdmin: true,
          resetCount: 0,
        },
        update: {
          statementId,
          selectedAt: new Date(),
          assignedByAdmin: true,
        },
        select: {
          id: true,
          teamId: true,
          statementId: true,
          selectedAt: true,
          assignedByAdmin: true,
          resetCount: true,
        },
      });

      return { selection };
    });

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    return NextResponse.json({ selection: result.selection });
  } catch (error) {
    console.error("Failed to assign Round 3 statement:", error);
    return NextResponse.json(
      { error: "Failed to assign the problem statement." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const authError = await verifyAdminApi();
  if (authError) return authError;

  try {
    const body: unknown = await request.json();

    if (!body || typeof body !== "object" || !("scope" in body)) {
      return NextResponse.json(
        { error: 'Specify scope as "one" or "all".' },
        { status: 400 },
      );
    }

    const scope = body.scope;

    if (scope === "one") {
      if (!("teamId" in body) || typeof body.teamId !== "string" || !body.teamId.trim()) {
        return NextResponse.json(
          { error: "A valid teamId is required." },
          { status: 400 },
        );
      }

      const teamId = body.teamId;

      const result = await prisma.$transaction(async (tx) => {
        const team = await tx.team.findUnique({
          where: { id: teamId },
          select: { id: true },
        });

        if (!team) {
          return { error: "Team not found.", status: 404 as const };
        }

        const selection = await tx.teamSelection.findUnique({
          where: { teamId },
          select: { statementId: true },
        });

        if (!selection) {
          return { reset: false };
        }

        await tx.teamDeliverableProgress.deleteMany({
          where: { teamId, statementId: selection.statementId },
        });

        await tx.teamSelection.delete({ where: { teamId } });

        await tx.team.update({
          where: { id: teamId },
          data: { selectionResetCount: { increment: 1 } },
        });

        return { reset: true };
      });

      if ("error" in result) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status },
        );
      }

      return NextResponse.json(result);
    }

    if (scope === "all") {
      if (!("confirm" in body) || body.confirm !== "RESET_ALL_SELECTIONS") {
        return NextResponse.json(
          {
            error:
              'Confirmation required. Send confirm: "RESET_ALL_SELECTIONS".',
          },
          { status: 400 },
        );
      }

      const result = await prisma.$transaction(async (tx) => {
        const selections = await tx.teamSelection.findMany({
          select: { teamId: true, statementId: true },
        });

        if (selections.length === 0) {
          return { resetCount: 0 };
        }

        await tx.teamDeliverableProgress.deleteMany({
          where: {
            OR: selections.map((selection) => ({
              teamId: selection.teamId,
              statementId: selection.statementId,
            })),
          },
        });

        await tx.team.updateMany({
          where: {
            id: { in: selections.map((selection) => selection.teamId) },
          },
          data: { selectionResetCount: { increment: 1 } },
        });

        await tx.teamSelection.deleteMany();

        return { resetCount: selections.length };
      });

      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: 'Scope must be "one" or "all".' },
      { status: 400 },
    );
  } catch (error) {
    console.error("Failed to reset Round 3 selections:", error);
    return NextResponse.json(
      { error: "Failed to reset Round 3 selections." },
      { status: 500 },
    );
  }
}
