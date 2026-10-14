import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyAdminApi } from "@/lib/admin-api";

 

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
    (!Number.isInteger(item.maxTeams) ||
      Number(item.maxTeams) < 1)
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

function statementData(item: Record<string, unknown>) {
  return {
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
    enabled: item.enabled === undefined ? true : item.enabled === true,
    displayOrder:
      item.displayOrder === undefined ? 0 : Number(item.displayOrder),
  };
}

export async function GET() {
  const denied = await verifyAdminApi();
  if (denied) return denied;

  try {
    const statements = await prisma.problemStatement.findMany({
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      include: {
        hints: { orderBy: { order: "asc" } },
        _count: { select: { selections: true } },
      },
    });

    return NextResponse.json({ statements });
  } catch (error) {
    console.error("Round 3 statements GET:", error);
    return NextResponse.json(
      { error: "Could not load problem statements." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const denied = await verifyAdminApi();
  if (denied) return denied;

  try {
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

    const statement = await prisma.problemStatement.create({
      data: {
        ...statementData(item),
        hints: {
          create: hints.map((hint, index) => ({
            order: index + 1,
            title: hint.title.trim(),
            content: hint.content.trim(),
          })),
        },
      },
      include: { hints: { orderBy: { order: "asc" } } },
    });

    return NextResponse.json({ statement }, { status: 201 });
  } catch (error) {
    console.error("Round 3 statement POST:", error);
    return NextResponse.json(
      { error: "Could not create the problem statement." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const denied = await verifyAdminApi();
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);

    if (searchParams.get("confirm") !== "delete-all") {
      return NextResponse.json(
        { error: "Explicit bulk-delete confirmation is required." },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Remove dependent records before statements because selections
      // restrict statement deletion. Team records remain untouched.
      const selections = await tx.teamSelection.deleteMany({});
      const progress = await tx.teamDeliverableProgress.deleteMany({});
      const statements = await tx.problemStatement.deleteMany({});

      return {
        selectionsDeleted: selections.count,
        progressDeleted: progress.count,
        statementsDeleted: statements.count,
      };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Round 3 bulk statement DELETE:", error);
    return NextResponse.json(
      { error: "Could not delete all problem statements." },
      { status: 500 },
    );
  }
}