
import "server-only";

import { prisma } from "@/lib/db";

export type Round3WindowName = "selection" | "submission";

export type Round3Window = {
  isOpen: boolean;
  durationMinutes: number;
  deadline: string | null;
};

const WINDOW_KEYS: Record<Round3WindowName, string> = {
  selection: "round3.selectionWindow",
  submission: "round3.submissionWindow",
};

const DEFAULT_DURATION_MINUTES = 60;

function parseWindow(value: unknown): Round3Window {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return {
      isOpen: false,
      durationMinutes: DEFAULT_DURATION_MINUTES,
      deadline: null,
    };
  }

  const data = value as Record<string, unknown>;

  const durationMinutes =
    typeof data.durationMinutes === "number" &&
    Number.isInteger(data.durationMinutes) &&
    data.durationMinutes >= 1 &&
    data.durationMinutes <= 1440
      ? data.durationMinutes
      : DEFAULT_DURATION_MINUTES;

  const deadline =
    typeof data.deadline === "string" &&
    Number.isFinite(Date.parse(data.deadline))
      ? new Date(data.deadline).toISOString()
      : null;

  return {
    isOpen: data.isOpen === true,
    durationMinutes,
    deadline,
  };
}

export async function getRound3Window(
  name: Round3WindowName,
): Promise<Round3Window> {
  const setting = await prisma.setting.findUnique({
    where: { key: WINDOW_KEYS[name] },
    select: { value: true },
  });

  const window = parseWindow(setting?.value);

  if (
    window.isOpen &&
    (!window.deadline || Date.parse(window.deadline) <= Date.now())
  ) {
    window.isOpen = false;
  }

  return window;
}

export async function saveRound3Window(
  name: Round3WindowName,
  window: Round3Window,
): Promise<Round3Window> {
  const normalized = parseWindow(window);

  await prisma.setting.upsert({
    where: { key: WINDOW_KEYS[name] },
    create: {
      key: WINDOW_KEYS[name],
      value: normalized,
    },
    update: {
      value: normalized,
    },
  });

  return normalized;
}
