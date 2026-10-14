
import { NextResponse } from "next/server";
import { getParticipantForApi } from "@/lib/auth-helper";import { prisma } from "@/lib/db";
import {
  getRound3Window,
} from "@/lib/round3-windows";

export async function GET() {
  try {
const authResult = await getParticipantForApi();

if ("error" in authResult) {
  return authResult.error;
}

const { team } = authResult;
    const [selectionWindow, submissionWindow, selection] =
      await Promise.all([
        getRound3Window("selection"),
        getRound3Window("submission"),
        prisma.teamSelection.findUnique({
          where: { teamId: team.id },
          include: {
            statement: {
              include: {
                hints: {
                  orderBy: { order: "asc" },
                },
              },
            },
          },
        }),
      ]);

    const statements = await prisma.problemStatement.findMany({
      where: { enabled: true },
      orderBy: [{ displayOrder: "asc" }, { title: "asc" }],
      include: {
        _count: {
          select: { selections: true },
        },
      },
    });

    const isFinalist = team.isFinalist;

    return NextResponse.json(
      {
        serverNow: new Date().toISOString(),
        isFinalist,
        selectionWindow,
        submissionWindow,
        selectedStatementId: selection?.statementId ?? null,
        selectedAt: selection?.selectedAt.toISOString() ?? null,
        assignedByAdmin: selection?.assignedByAdmin ?? false,
        statements: statements.map((statement) => {
          const selectedCount = statement._count.selections;
          const isSelected = selection?.statementId === statement.id;
        const isFull = selectedCount > 0 && !isSelected;

          return {
            id: statement.id,
            title: statement.title,
            domain: statement.domain,
            difficulty: statement.difficulty,
            shortDescription: statement.shortDescription,
            maxTeams: statement.maxTeams,
            selectedCount,
            status: isSelected
              ? "Selected"
              : isFull
                ? "Full"
                : !selectionWindow.isOpen || !isFinalist
                  ? "Unavailable"
                  : "Available",
         description: statement.description,
constraints: statement.constraints,
deliverables: statement.deliverables,

...(isSelected
  ? {
      hints: selection.statement.hints.map((hint) => ({
        id: hint.id,
        order: hint.order,
        title: hint.title,
        content: hint.content,
      })),
    }
  : {}),
          };
        }),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Round 3 participant state error:", error);

    return NextResponse.json(
      { error: "Could not load Round 3 state." },
      { status: 500 },
    );
  }
}
