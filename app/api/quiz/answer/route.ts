
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireParticipant } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";
import { computeClock } from "@/lib/quiz-clock";
import { getSettings } from "@/lib/settings";

// export const dynamic = "force-dynamic";

const answerSchema = z.object({
  questionId: z.string().min(1),
  optionId: z.string().min(1),
  clientEventId: z.string().min(1).max(200),
});

function json(
  body: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  const { team } = await requireParticipant();

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = answerSchema.safeParse(body);

  if (!parsed.success) {
    return json(
      {
        error: "Invalid answer payload",
        details: parsed.error.flatten(),
      },
      400,
    );
  }

  const { questionId, optionId } = parsed.data;

  // Only teams included in the frozen quiz roster may answer.
  const rosterEntry = await prisma.quizRoster.findUnique({
    where: { teamId: team.id },
    select: { teamId: true },
  });

  if (!rosterEntry) {
    return json({ error: "Team is not on the quiz roster" }, 403);
  }

  // An existing response is immutable. Return its locked option
  // without exposing whether that option is correct.
  const existing = await prisma.response.findUnique({
    where: {
      teamId_questionId: {
        teamId: team.id,
        questionId,
      },
    },
    select: {
      optionId: true,
    },
  });

  if (existing) {
    return json({
      accepted: false,
      reason: "ALREADY_ANSWERED",
      lockedOptionId: existing.optionId,
    });
  }

  if (team.quizStatus !== "ACTIVE") {
    return json({ error: "Team is not active" }, 403);
  }

  const run = await prisma.quizRun.findUnique({
    where: { id: "main" },
    include: {
      questions: {
        orderBy: { position: "asc" },
      },
    },
  });

  if (!run) {
    return json({ error: "Quiz has not started" }, 409);
  }

  // Capture receipt time on the server, never from the client.
  const receivedAt = new Date();

  const clock = computeClock(
    {
      status: run.status,
      startedAt: run.startedAt,
      pausedAt: run.pausedAt,
      pausedMs: run.pausedMs,
      skipMs: run.skipMs,
    },
    run.questions,
    receivedAt.getTime(),
  );

  // A submission is valid only for the currently active question.
  // GAP is allowed only for the question that just ended, and only
  // within the configured grace period.
  if (
    clock.index < 0 ||
    (clock.phase !== "QUESTION" && clock.phase !== "GAP")
  ) {
    return json({
      accepted: false,
      reason: "QUESTION_NOT_ACTIVE",
      lockedOptionId: null,
    });
  }

  const slot = run.questions[clock.index];

  if (!slot || slot.questionId !== questionId) {
    return json({
      accepted: false,
      reason: "NOT_CURRENT_QUESTION",
      lockedOptionId: null,
    });
  }

  if (
    clock.questionStartAtMs === null ||
    clock.questionEndAtMs === null
  ) {
    return json({ error: "Invalid question timing" }, 500);
  }

  const settings = await getSettings();
  const receivedAtMs = receivedAt.getTime();
  const deadlineMs = clock.questionEndAtMs + settings.graceMs;

  if (
    receivedAtMs < clock.questionStartAtMs ||
    receivedAtMs > deadlineMs
  ) {
    return json({
      accepted: false,
      reason: "DEADLINE_PASSED",
      lockedOptionId: null,
    });
  }

  // Confirm the selected option belongs to the submitted question.
  const validOption = await prisma.questionOption.findFirst({
    where: {
      id: optionId,
      questionId,
    },
    select: { id: true },
  });

  if (!validOption) {
    return json(
      { error: "Option does not belong to this question" },
      400,
    );
  }

  const responseMs = Math.max(
    0,
    receivedAtMs - clock.questionStartAtMs,
  );

  // The unique (teamId, questionId) constraint is the final
  // concurrency-safe protection against double submissions.
  const result = await prisma.response.createMany({
    data: [
      {
        teamId: team.id,
        questionId,
        optionId,
        answeredAt: receivedAt,
        responseMs,
      },
    ],
    skipDuplicates: true,
  });

  // Fetch the stored answer instead of trusting the submitted option.
  // If another request won the race, its option remains locked.
  const lockedResponse = await prisma.response.findUnique({
    where: {
      teamId_questionId: {
        teamId: team.id,
        questionId,
      },
    },
    select: { optionId: true },
  });

  if (!lockedResponse) {
    return json({ error: "Could not save answer" }, 500);
  }

  if (result.count === 0) {
    return json({
      accepted: false,
      reason: "ALREADY_ANSWERED",
      lockedOptionId: lockedResponse.optionId,
    });
  }

  return json({
    accepted: true,
    lockedOptionId: lockedResponse.optionId,
    responseMs,
  });
}
