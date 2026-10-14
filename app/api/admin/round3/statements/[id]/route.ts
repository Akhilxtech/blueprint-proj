
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyAdminApi } from "@/lib/admin-api";

 

type Context = {
  params: Promise<{ id: string }>;
};

function validateStatement(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "Invalid statement.";
  }

  const item = value as Record<string, unknown>;

  for (const field of [
    "title",
    "domain",
    "difficulty",
    "shortDescription",
    "description",
    "constraints",
    "deliverables",
  ]) {
    if (typeof item[field] !== "string" || !item[field].trim()) {
      return `${field} is required.`;
    }
  }

  if (
    item.maxTeams !== null &&
    item.maxTeams !== undefined &&
    (!Number.isInteger(item.maxTeams) || Number(item.maxTeams) < 1)
  ) {
    return "Maximum teams must be a positive integer or null.";
  }

  if (
    item.hints !== undefined &&
    (!Array.isArray(item.hints) ||
      !item.hints.every(
        (hint) =>
          hint &&
          typeof hint.title === "string" &&
          hint.title.trim() &&
          typeof hint.content === "string" &&
          hint.content.trim(),
      ))
  ) {
    return "Hints must contain a title and content.";
  }

  return null;
}

export async function PATCH(request: Request, context: Context) {
  const denied = await verifyAdminApi();
  if (denied) return denied;

  try {
    const { id } = await context.params;
    const body: unknown = await request.json();
    const validationError = validateStatement(body);

    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 },
      );
    }

    const item = body as Record<string, unknown>;
    const hints = (item.hints ?? []) as {
      title: string;
      content: string;
    }[];

    const statement = await prisma.$transaction(async (tx) => {
      const existing = await tx.problemStatement.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!existing) {
        throw new Error("STATEMENT_NOT_FOUND");
      }

      await tx.problemStatement.update({
        where: { id },
        data: {
          title: String(item.title).trim(),
          domain: String(item.domain).trim(),
          difficulty: String(item.difficulty).trim(),
          shortDescription: String(item.shortDescription).trim(),
          description: String(item.description).trim(),
          constraints: String(item.constraints).trim(),
          deliverables: String(item.deliverables).trim(),
          maxTeams:
            item.maxTeams === null || item.maxTeams === undefined
              ? null
              : Number(item.maxTeams),
          enabled: item.enabled !== false,
          displayOrder:
            item.displayOrder === undefined ? 0 : Number(item.displayOrder),
        },
      });

      await tx.statementHint.deleteMany({
        where: { statementId: id },
      });

      if (hints.length > 0) {
        await tx.statementHint.createMany({
          data: hints.map((hint, index) => ({
            statementId: id,
            order: index + 1,
            title: hint.title.trim(),
            content: hint.content.trim(),
          })),
        });
      }

      return tx.problemStatement.findUnique({
        where: { id },
        include: { hints: { orderBy: { order: "asc" } } },
      });
    });

    return NextResponse.json({ statement });
  } catch (error) {
    if (error instanceof Error && error.message === "STATEMENT_NOT_FOUND") {
      return NextResponse.json(
        { error: "Problem statement not found." },
        { status: 404 },
      );
    }

    console.error("Round 3 statement PATCH:", error);

    return NextResponse.json(
      { error: "Could not update the problem statement." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: Context) {
  const denied = await verifyAdminApi();
  if (denied) return denied;

  try {
    const { id } = await context.params;

    await prisma.$transaction(async (tx) => {
      const statement = await tx.problemStatement.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!statement) {
        throw new Error("STATEMENT_NOT_FOUND");
      }

      const selections = await tx.teamSelection.count({
        where: { statementId: id },
      });

      if (selections > 0) {
        throw new Error("STATEMENT_HAS_SELECTIONS");
      }

      await tx.teamDeliverableProgress.deleteMany({
        where: { statementId: id },
      });

      await tx.problemStatement.delete({
        where: { id },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "STATEMENT_NOT_FOUND") {
      return NextResponse.json(
        { error: "Problem statement not found." },
        { status: 404 },
      );
    }

    if (error instanceof Error && error.message === "STATEMENT_HAS_SELECTIONS") {
      return NextResponse.json(
        {
          error:
            "Teams have selected this statement. Reset or reassign those selections before deleting it.",
        },
        { status: 409 },
      );
    }

    console.error("Round 3 statement DELETE:", error);

    return NextResponse.json(
      { error: "Could not delete the problem statement." },
      { status: 500 },
    );
  }
}
