
import "server-only";

import { z } from "zod";
import { prisma } from "@/lib/db";

const settingsSchema = z.object({
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

export type QuizSettings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: QuizSettings = {
  theorySeconds: 20,
  codeSeconds: 90,
  fallbackSeconds: 30,
  gapSeconds: 3,
  prestartSeconds: 10,
  graceMs: 1500,
  maxWarnings: 3,
  minAwaySeconds: 1,
  verdictBannerSeconds: 6,
};

export async function getSettings(): Promise<QuizSettings> {
  const rows = await prisma.setting.findMany();

  const stored: Record<string, unknown> = {};

  for (const row of rows) {
    stored[row.key] = row.value;
  }

  const candidate = {
    ...DEFAULT_SETTINGS,
    ...stored,
  };

  const parsed = settingsSchema.safeParse(candidate);

  // Invalid or missing settings fall back to safe defaults.
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
}
