
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyAdminApi } from "@/lib/admin-api";

 

const MAX_IMPORT_ROWS = 5000;

function validateStatement(value: unknown, index: number): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return `Row ${index + 2}: invalid statement.`;
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
      return `Row ${index + 2}: ${field} is required.`;
    }
  }

  if (
    item.maxTeams !== null &&
    item.maxTeams !== undefined &&
    item.maxTeams !== "" &&
    (!Number.isInteger(Number(item.maxTeams)) ||
      Number(item.maxTeams) < 1)
  ) {
    return `Row ${index + 2}: maxTeams must be a positive integer or empty.`;
  }

  if (
    item.displayOrder !== undefined &&
    item.displayOrder !== "" &&
    (!Number.isInteger(Number(item.displayOrder)) ||
      Number(item.displayOrder) < 0)
  ) {
    return `Row ${index + 2}: displayOrder must be a non-negative integer.`;
  }

  if (
    item.enabled !== undefined &&
    typeof item.enabled !== "boolean"
  ) {
    return `Row ${index + 2}: enabled must be true or false.`;
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
    return `Row ${index + 2}: hints must contain titles and content.`;
  }

  return null;
}

export async function POST(request: Request) {
  const denied = await verifyAdminApi();
  if (denied) return denied;

  try {
    const body: unknown = await request.json();

    if (
      !body ||
      typeof body !== "object" ||
      !Array.isArray((body as { statements?: unknown }).statements)
    ) {
      return NextResponse.json(
        { error: "Expected a statements array." },
        { status: 400 },
      );
    }

    const statements = (body as { statements: unknown[] }).statements;

    if (statements.length < 1 || statements.length > MAX_IMPORT_ROWS) {
      return NextResponse.json(
        { error: `Import between 1 and ${MAX_IMPORT_ROWS} statements.` },
        { status: 400 },
      );
    }

    // Validate every row before beginning the transaction.
    for (let i = 0; i < statements.length; i++) {
      const error = validateStatement(statements[i], i);

      if (error) {
        return NextResponse.json({ error }, { status: 400 });
      }
    }

    const imported = await prisma.$transaction(async (tx) => {
      for (let index = 0; index < statements.length; index++) {
        const item = statements[index] as Record<string, unknown>;

        const hints = (item.hints ?? []) as {
          title: string;
          content: string;
        }[];

        await tx.problemStatement.create({
          data: {
            title: (item.title as string).trim(),
            domain: (item.domain as string).trim(),
            difficulty: (item.difficulty as string).trim(),
            shortDescription: (item.shortDescription as string).trim(),
            description: (item.description as string).trim(),
            constraints: (item.constraints as string).trim(),
            deliverables: (item.deliverables as string).trim(),
            maxTeams:
              item.maxTeams === null ||
              item.maxTeams === undefined ||
              item.maxTeams === ""
                ? null
                : Number(item.maxTeams),
enabled: item.enabled === undefined ? true : (item.enabled as boolean),
            displayOrder:
              item.displayOrder === undefined || item.displayOrder === ""
                ? index
                : Number(item.displayOrder),
            hints: {
              create: hints.map((hint, hintIndex) => ({
                order: hintIndex + 1,
                title: hint.title.trim(),
                content: hint.content.trim(),
              })),
            },
          },
        });
      }

      return statements.length;
    });

    return NextResponse.json({ success: true, imported });
  } catch (error) {
    console.error("Round 3 CSV import:", error);

    return NextResponse.json(
      {
        error:
          "Import failed. The transaction was rolled back; no rows from this import were committed.",
      },
      { status: 500 },
    );
  }
}
