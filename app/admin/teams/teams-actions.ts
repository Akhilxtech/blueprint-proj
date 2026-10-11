
"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";


export async function deleteEmptyTeam(teamId: string) {
  await requireAdmin();

  if (typeof teamId !== "string" || !teamId.trim()) {
    return { success: false as const, error: "Invalid team ID." };
  }

  try {
    const deleted = await prisma.team.deleteMany({
      where: {
        id: teamId.trim(),
        participants: { none: {} },
      },
    });

    if (deleted.count !== 1) {
      return {
        success: false as const,
        error:
          "Team not found or it contains participants. Refresh and try again.",
      };
    }

    revalidatePath("/admin/teams");

    return { success: true as const };
  } catch (error) {
    console.error("deleteEmptyTeam failed:", error);

    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Could not delete the team. Check the server logs.",
    };
  }
}

