
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";

const emailSchema = z
  .string()
  .trim()
  .email("Invalid email address")
  .refine(
    (email) => /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@gmail\.com$/i.test(email),
    "Only Gmail addresses are allowed",
  )
  .transform((email) => email.toLowerCase());

const csvRowSchema = z.object({
  teamName: z.string().trim(),
  name: z.string().trim(),
  email: z.string().trim(),
  usn: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  semester: z.string().trim().optional(),
  branch: z.string().trim().optional(),
});

const csvInputSchema = z.object({
  rows: z.array(csvRowSchema).min(1).max(500),
  overrideTeamLimit: z.boolean().default(false),
});

type CsvInput = z.infer<typeof csvInputSchema>;

type CsvIssue = {
  severity: "error" | "warning";
  message: string;
};

type CheckedRow = {
  rowNumber: number;
  teamName: string;
  name: string;
  email: string;
  usn: string;
  phone: string;
  semester: string;
  branch: string;
  issues: CsvIssue[];
};

export type CsvValidationResult =
  | {
      success: true;
      rows: CheckedRow[];
      errorCount: number;
      warningCount: number;
    }
  | { success: false; message: string };

export type CsvImportResult =
  | {
      success: true;
      message: string;
      imported: number;
      skipped: number;
      teamsCreated: number;
      errors: { rowNumber: number; message: string }[];
    }
  | { success: false; message: string };

function parseCsvInput(input: unknown) {
  return csvInputSchema.safeParse(input);
}

async function validateCsvRows(data: CsvInput): Promise<CheckedRow[]> {
  const emails = new Set<string>();

  const rows: CheckedRow[] = data.rows.map((row, index) => {
    const teamName = row.teamName.trim();
    const name = row.name.trim();
    const email = row.email.trim().toLowerCase();
    const issues: CsvIssue[] = [];

    if (!teamName) {
      issues.push({ severity: "error", message: "Team name is required." });
    }

    if (!name) {
      issues.push({ severity: "error", message: "Participant name is required." });
    }

    const parsedEmail = emailSchema.safeParse(email);

    if (!email) {
      issues.push({ severity: "error", message: "Email is required." });
    } else if (!parsedEmail.success) {
      issues.push({
        severity: "error",
        message: parsedEmail.error.issues[0]?.message ?? "Invalid email.",
      });
    }

    if (email) {
      if (emails.has(email)) {
        issues.push({
          severity: "error",
          message: "Duplicate email within this CSV.",
        });
      }
      emails.add(email);
    }

    if (row.branch?.trim() && row.branch.trim().toLowerCase() !== "ise") {
      issues.push({ severity: "warning", message: "Branch is not ISE." });
    }

    return {
      rowNumber: index + 2,
      teamName,
      name,
      email,
      usn: row.usn?.trim() ?? "",
      phone: row.phone?.trim() ?? "",
      semester: row.semester?.trim() ?? "",
      branch: row.branch?.trim() ?? "",
      issues,
    };
  });

  const validEmails = rows
    .filter((row) => !row.issues.some((issue) => issue.severity === "error"))
    .map((row) => row.email);

  if (validEmails.length > 0) {
    const existing = await prisma.participant.findMany({
      where: {
        email: { in: validEmails, mode: "insensitive" },
      },
      select: { email: true },
    });

    const existingEmails = new Set(
      existing.map((participant) => participant.email.toLowerCase()),
    );

    for (const row of rows) {
      if (existingEmails.has(row.email)) {
        row.issues.push({
          severity: "error",
          message: "Email is already registered in the database.",
        });
      }
    }
  }

  const teamCounts = new Map<string, number>();

  for (const row of rows) {
    const key = row.teamName.toLowerCase();
    teamCounts.set(key, (teamCounts.get(key) ?? 0) + 1);
  }

  const teamNames = [
    ...new Map(
      rows
        .filter((row) => row.teamName)
        .map((row) => [row.teamName.toLowerCase(), row.teamName]),
    ).values(),
  ];

  const existingTeams = await prisma.team.findMany({
    where: { name: { in: teamNames } },
    select: {
      name: true,
      _count: { select: { participants: true } },
    },
  });

  const existingTeamCounts = new Map(
    existingTeams.map((team) => [team.name.toLowerCase(), team._count.participants]),
  );

  for (const row of rows) {
    const key = row.teamName.toLowerCase();
    const total =
      (teamCounts.get(key) ?? 0) + (existingTeamCounts.get(key) ?? 0);

    if (total < 2 || total > 3) {
      row.issues.push({
        severity: "warning",
        message: `Team "${row.teamName}" would have ${total} members.`,
      });
    }
  }

  return rows;
}

export async function validateCsvImport(
  input: unknown,
): Promise<CsvValidationResult> {
  await requireAdmin();

  const parsed = parseCsvInput(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid CSV data.",
    };
  }

  try {
    const rows = await validateCsvRows(parsed.data);

    return {
      success: true,
      rows,
      errorCount: rows.filter((row) =>
        row.issues.some((issue) => issue.severity === "error"),
      ).length,
      warningCount: rows.filter((row) =>
        row.issues.some((issue) => issue.severity === "warning"),
      ).length,
    };
  } catch {
    return {
      success: false,
      message: "Could not validate against the database. Please retry.",
    };
  }
}

export async function importCsvParticipants(
  input: unknown,
): Promise<CsvImportResult> {
  await requireAdmin();

  const parsed = parseCsvInput(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid CSV data.",
    };
  }

  const validation = await validateCsvRows(parsed.data);

  const errors = validation.flatMap((row) =>
    row.issues
      .filter((issue) => issue.severity === "error")
      .map((issue) => ({
        rowNumber: row.rowNumber,
        message: issue.message,
      })),
  );

  if (errors.length > 0) {
    return {
      success: false,
      message: "Fix validation errors before importing.",
    };
  }

  const data = parsed.data;
  const teamNames = [
    ...new Map(
      validation.map((row) => [row.teamName.toLowerCase(), row.teamName]),
    ).values(),
  ];

  try {
    const result = await prisma.$transaction(async (tx) => {
      const teamsBefore = await tx.team.findMany({
        where: { name: { in: teamNames } },
        select: { name: true },
      });

      const existingTeamNames = new Set(
        teamsBefore.map((team) => team.name.toLowerCase()),
      );

      const existingEmails = await tx.participant.findMany({
        where: {
          email: { in: validation.map((row) => row.email), mode: "insensitive" },
        },
        select: { email: true },
      });

      const existingEmailSet = new Set(
        existingEmails.map((participant) => participant.email.toLowerCase()),
      );

      const rowsToImport = validation.filter(
        (row) => !existingEmailSet.has(row.email),
      );

      const skipped = validation.length - rowsToImport.length;

      for (const teamName of teamNames) {
        const teamRows = rowsToImport.filter(
          (row) => row.teamName.toLowerCase() === teamName.toLowerCase(),
        );

        if (teamRows.length === 0) continue;

        const existingTeam = await tx.team.findFirst({
          where: { name: { equals: teamName, mode: "insensitive" } },
          select: {
            id: true,
            _count: { select: { participants: true } },
          },
        });

        const currentCount = existingTeam?._count.participants ?? 0;
        const finalCount = currentCount + teamRows.length;

        if (
          (finalCount < 2 || finalCount > 3) &&
          !data.overrideTeamLimit
        ) {
          throw new Error(
            `Team "${teamName}" would have ${finalCount} members. Enable the team-size override to continue.`,
          );
        }
      }

      let imported = 0;

      for (const teamName of teamNames) {
        const teamRows = rowsToImport.filter(
          (row) => row.teamName.toLowerCase() === teamName.toLowerCase(),
        );

        if (teamRows.length === 0) continue;

        const team = await tx.team.upsert({
          where: { name: teamName },
          update: {},
          create: { name: teamName },
          select: { id: true },
        });

        await tx.participant.createMany({
          data: teamRows.map((row) => ({
            teamId: team.id,
            name: row.name,
            email: row.email,
            usn: row.usn || null,
            phone: row.phone || null,
            semester: row.semester || null,
            branch: row.branch || null,
          })),
        });

        imported += teamRows.length;
      }

      const teamsAfter = await tx.team.findMany({
        where: { name: { in: teamNames } },
        select: { name: true },
      });

      const teamsCreated = teamsAfter.filter(
        (team) => !existingTeamNames.has(team.name.toLowerCase()),
      ).length;

      return { imported, skipped, teamsCreated };
    });

    revalidatePath("/admin/teams");

    return {
      success: true,
      message: "CSV import completed.",
      ...result,
      errors: [],
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "CSV import failed.",
    };
  }
}
