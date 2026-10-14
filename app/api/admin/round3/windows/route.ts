
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";
import {
  getRound3Window,
  saveRound3Window,
  type Round3WindowName,
} from "@/lib/round3-windows";

export async function GET() {
  try {
    await requireAdmin();

    const [selection, submission] = await Promise.all([
      getRound3Window("selection"),
      getRound3Window("submission"),
    ]);

    return NextResponse.json(
      { selection, submission },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Round 3 windows GET error:", error);

    return NextResponse.json(
      { error: "Could not load Round 3 windows." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin();

    const body: unknown = await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 },
      );
    }

    const data = body as Record<string, unknown>;
    const name = data.name;
    const action = data.action;

    if (name !== "selection" && name !== "submission") {
      return NextResponse.json(
        { error: "Window name must be selection or submission." },
        { status: 400 },
      );
    }

    if (
      action !== "open" &&
      action !== "close" &&
      action !== "setDuration" &&
      action !== "adjustTime"
    ) {
      return NextResponse.json(
        { error: "Unsupported window action." },
        { status: 400 },
      );
    }

    const windowName: Round3WindowName = name;
    const current = await getRound3Window(windowName);
    const now = Date.now();

    if (action === "close") {
      const saved = await saveRound3Window(windowName, {
        ...current,
        isOpen: false,
      });

      return NextResponse.json({ success: true, window: saved });
    }

    if (action === "open") {
      const durationMinutes =
        typeof data.durationMinutes === "number"
          ? data.durationMinutes
          : current.durationMinutes;

      if (
        !Number.isInteger(durationMinutes) ||
        durationMinutes < 1 ||
        durationMinutes > 1440
      ) {
        return NextResponse.json(
          { error: "Duration must be between 1 and 1440 minutes." },
          { status: 400 },
        );
      }

      const saved = await saveRound3Window(windowName, {
        isOpen: true,
        durationMinutes,
        deadline: new Date(
          now + durationMinutes * 60_000,
        ).toISOString(),
      });

      return NextResponse.json({ success: true, window: saved });
    }

    if (action === "setDuration") {
      const durationMinutes = data.durationMinutes;

      if (
        typeof durationMinutes !== "number" ||
        !Number.isInteger(durationMinutes) ||
        durationMinutes < 1 ||
        durationMinutes > 1440
      ) {
        return NextResponse.json(
          { error: "Duration must be between 1 and 1440 minutes." },
          { status: 400 },
        );
      }

      const deadline =
        current.isOpen && current.deadline
          ? new Date(
              Date.parse(current.deadline) +
                (durationMinutes - current.durationMinutes) * 60_000,
            ).toISOString()
          : current.deadline;

      const saved = await saveRound3Window(windowName, {
        ...current,
        durationMinutes,
        deadline,
      });

      return NextResponse.json({ success: true, window: saved });
    }

    const minutes = data.minutes;

    if (
      typeof minutes !== "number" ||
      !Number.isInteger(minutes) ||
      minutes === 0 ||
      Math.abs(minutes) > 1440
    ) {
      return NextResponse.json(
        { error: "Time adjustment must be between -1440 and 1440 minutes, excluding zero." },
        { status: 400 },
      );
    }

    if (!current.isOpen || !current.deadline) {
      return NextResponse.json(
        { error: "Open the window before adjusting its remaining time." },
        { status: 409 },
      );
    }

    const nextDeadline =
      Date.parse(current.deadline) + minutes * 60_000;

    if (nextDeadline <= now) {
      const saved = await saveRound3Window(windowName, {
        ...current,
        isOpen: false,
        deadline: new Date(nextDeadline).toISOString(),
      });

      return NextResponse.json({ success: true, window: saved });
    }

    const saved = await saveRound3Window(windowName, {
      ...current,
      deadline: new Date(nextDeadline).toISOString(),
    });

    return NextResponse.json({ success: true, window: saved });
  } catch (error) {
    console.error("Round 3 windows PATCH error:", error);

    return NextResponse.json(
      { error: "Could not update the Round 3 window." },
      { status: 500 },
    );
  }
}
