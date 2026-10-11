"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { Prisma } from "@/lib/generated/prisma/client";

const settingsInputSchema = z.object({
  theorySeconds: z.number().int().min(1).max(3600),
  codeSeconds: z.number().int().min(1).max(3600),
  fallbackSeconds: z.number().int().min(1).max(3600),
  gapSeconds: z.number().int().min(0).max(3600),
  prestartSeconds: z.number().int().min(0).max(3600),
  graceMs: z.number().int().min(0).max(60000),
  maxWarnings: z.number().int().min(0).max(100),
  minAwaySeconds: z.number().int().min(0).max(3600),
  verdictBannerSeconds: z.number().int().min(0).max(3600),
});

export type SaveSettingsResult =
  | { success: true; message: string }
  | { success: false; message: string };

export async function saveSettings(
  input: unknown,
): Promise<SaveSettingsResult> {
  await requireAdmin();

  const parsed = settingsInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid settings.",
    };
  }

  try {
    await prisma.$transaction(
      Object.entries(parsed.data).map(([key, value]) =>
        prisma.setting.upsert({
          where: { key },
          create: {
            key,
            value: value as Prisma.InputJsonValue,
          },
          update: {
            value: value as Prisma.InputJsonValue,
          },
        }),
      ),
    );

    revalidatePath("/admin/settings");

    return {
      success: true,
      message: "Settings saved successfully.",
    };
  } catch (error) {
    console.error("Failed to save quiz settings:", error);

    return {
      success: false,
      message: "Could not save settings. Please try again.",
    };
  }
}