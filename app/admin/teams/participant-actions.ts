
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";

const emailSchema = z
  .string()
  .trim()
  .email("Enter a valid email address")
  .refine(
    (email) => /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@gmail\.com$/i.test(email),
    "Only Gmail addresses are allowed",
  )
  .transform((email) => email.toLowerCase());

const memberSchema = z.object({
  name: z.string().trim().min(1, "Member name is required"),
  email: emailSchema,
  usn: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  semester: z.string().trim().optional(),
  branch: z.string().trim().optional(),
});

const teamSchema = z
  .object({
    teamId: z.string().trim().optional(),
    newTeamName: z.string().trim().optional(),
    members: z.array(memberSchema).min(2).max(3),
    overrideTeamLimit: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (!data.teamId && !data.newTeamName) {
      ctx.addIssue({
        code: "custom",
        path: ["teamId"],
        message: "Select an existing team or enter a new team name.",
      });
    }

    if (data.teamId && data.newTeamName) {
      ctx.addIssue({
        code: "custom",
        path: ["teamId"],
        message: "Choose either an existing team or a new team.",
      });
    }

    const emails = data.members.map((member) => member.email);

    if (new Set(emails).size !== emails.length) {
      ctx.addIssue({
        code: "custom",
        path: ["members"],
        message: "Each member must have a different email address.",
      });
    }
  });

export type CreateTeamParticipantsInput = z.input<typeof teamSchema>;

export type ParticipantActionResult =
  | { success: true; message: string }
  | { success: false; message: string };

export async function createTeamParticipants(
  input: CreateTeamParticipantsInput,
): Promise<ParticipantActionResult> {
  await requireAdmin();

  const parsed = teamSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid team details.",
    };
  }

  const data = parsed.data;
  const newTeamName = data.newTeamName?.trim();

  try {
    await prisma.$transaction(async (tx) => {
      const emails = data.members.map((member) => member.email);

      const existingParticipants = await tx.participant.findMany({
        where: {
          email: { in: emails, mode: "insensitive" },
        },
        select: { email: true },
      });

      if (existingParticipants.length > 0) {
        throw new Error(
          `Email already registered: ${existingParticipants[0].email}`,
        );
      }

      let teamId = data.teamId;

      if (newTeamName) {
        const existingTeam = await tx.team.findUnique({
          where: { name: newTeamName },
          select: { id: true },
        });

        if (existingTeam) {
          throw new Error(
            "A team with this name already exists. Select the existing team.",
          );
        }

        const team = await tx.team.create({
          data: { name: newTeamName },
          select: { id: true },
        });

        teamId = team.id;
      }

      if (!teamId) {
        throw new Error("Select a team.");
      }

      const team = await tx.team.findUnique({
        where: { id: teamId },
        select: {
          id: true,
          _count: { select: { participants: true } },
        },
      });

      if (!team) {
        throw new Error("The selected team does not exist.");
      }

      const currentCount = team._count.participants;

      if (
        currentCount + data.members.length > 3 &&
        !data.overrideTeamLimit
      ) {
        throw new Error(
          `This team has ${currentCount} members. Adding ${data.members.length} would exceed 3. Enable the override to continue.`,
        );
      }

      await tx.participant.createMany({
        data: data.members.map((member) => ({
          name: member.name,
          email: member.email,
          usn: member.usn || null,
          phone: member.phone || null,
          semester: member.semester || null,
          branch: member.branch || null,
          teamId: team.id,
        })),
      });
    });

    revalidatePath("/admin/teams");

    return {
      success: true,
      message: `${data.members.length} participants added successfully.`,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to add participants.",
    };
  }
}


const updateParticipantSchema = z.object({
  participantId: z.string().min(1),
  name: z.string().trim().min(1, "Name is required"),
  
email: z
  .string()
  .trim()
  .email("Enter a valid email address")
  .transform((email) => email.toLowerCase()),
  usn: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  semester: z.string().trim().optional(),
  branch: z.string().trim().optional(),
  teamId: z.string().min(1, "Select a team"),
  overrideTeamLimit: z.boolean().default(false),
});

export type UpdateParticipantInput = z.input<
  typeof updateParticipantSchema
>;

export async function updateParticipant(
  input: UpdateParticipantInput,
): Promise<ParticipantActionResult> {
  await requireAdmin();

  const parsed = updateParticipantSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid participant data.",
    };
  }

  const data = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      const participant = await tx.participant.findUnique({
        where: { id: data.participantId },
        select: { id: true, teamId: true },
      });

      if (!participant) {
        throw new Error("Participant not found.");
      }

      const duplicate = await tx.participant.findFirst({
        where: {
          email: { equals: data.email, mode: "insensitive" },
          NOT: { id: participant.id },
        },
        select: { id: true },
      });

      if (duplicate) {
        throw new Error("Another participant already uses this email.");
      }

      const targetTeam = await tx.team.findUnique({
        where: { id: data.teamId },
        select: {
          id: true,
          _count: { select: { participants: true } },
        },
      });

      if (!targetTeam) {
        throw new Error("Selected team not found.");
      }

      const isMoving = participant.teamId !== targetTeam.id;
      const resultingCount =
        targetTeam._count.participants + (isMoving ? 1 : 0);

      if (isMoving && resultingCount > 3 && !data.overrideTeamLimit) {
        throw new Error(
          "The destination team would exceed 3 members. Enable the override to continue.",
        );
      }

      await tx.participant.update({
        where: { id: participant.id },
        data: {
          name: data.name,
          email: data.email,
          usn: data.usn || null,
          phone: data.phone || null,
          semester: data.semester || null,
          branch: data.branch || null,
          teamId: data.teamId,
        },
      });
    });

    revalidatePath("/admin/teams");
    revalidatePath("/play");

    return { success: true, message: "Participant updated successfully." };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to update participant.",
    };
  }
}


export async function deleteParticipant(
  participantId: string,
): Promise<ParticipantActionResult> {
  await requireAdmin();

  if (typeof participantId !== "string" || !participantId.trim()) {
    return { success: false, message: "Invalid participant ID." };
  }

  try {
    const deleted = await prisma.participant.deleteMany({
      where: { id: participantId.trim() },
    });

    if (deleted.count !== 1) {
      return {
        success: false,
        message: "Participant not found. Refresh the page and try again.",
      };
    }

    revalidatePath("/admin/teams");
    revalidatePath("/play");

    return {
      success: true,
      message: "Participant deleted successfully.",
    };
  } catch (error) {
    console.error("deleteParticipant failed:", error);

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Could not delete this participant. Check the server logs.",
    };
  }
}



export async function deleteAllParticipants(): Promise<ParticipantActionResult> {
  await requireAdmin();

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Delete participants first because they belong to teams.
      const participants = await tx.participant.deleteMany({});

      // Delete all teams after their participants are removed.
      const teams = await tx.team.deleteMany({});

      return {
        participants: participants.count,
        teams: teams.count,
      };
    });

    revalidatePath("/admin/teams");
    revalidatePath("/play");
    revalidatePath("/");

    return {
      success: true,
      message: `Deleted ${result.participants} participants and ${result.teams} teams. User accounts were preserved.`,
    };
  } catch (error) {
    console.error("Failed to delete all participants and teams:", error);

    return {
      success: false,
      message: "Failed to delete participants and teams. Please try again.",
    };
  }
}
