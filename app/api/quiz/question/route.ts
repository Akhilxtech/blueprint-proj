

import { NextResponse } from "next/server";
import { requireParticipant } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";
import { computeClock } from "@/lib/quiz-clock";
import { highlightCode } from "@/lib/highlight-code";

//  

type CachedQuestion = {
  id: string;
  text: string;
  type: string;
  code: string | null;
  codeLanguage: string | null;
  codeHtml: string | null;
  options: {
    id: string;
    label: string;
    content: string;
    isCode: boolean;
  }[];
};

const questionCache = new Map<
  string,
  Promise<CachedQuestion | null>
>();

async function loadQuestion(
  questionId: string,
): Promise<CachedQuestion | null> {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: {
      id: true,
      text: true,
      type: true,
      code: true,
      codeLanguage: true,
      options: {
        orderBy: { label: "asc" },
        select: {
          id: true,
          label: true,
          content: true,
          isCode: true,
        },
      },
    },
  });

  if (!question) {
    return null;
  }

  let codeHtml: string | null = null;

  if (question.code && question.codeLanguage) {
    try {
      codeHtml = await highlightCode(
        question.code,
        question.codeLanguage,
      );
    } catch {
      codeHtml = null;
    }
  }

  return {
    ...question,
    codeHtml,
  };
}

function getCachedQuestion(questionId: string) {
  let cached = questionCache.get(questionId);

  if (!cached) {
    cached = loadQuestion(questionId);
    questionCache.set(questionId, cached);

    // Allow a failed or missing lookup to be retried.
    void cached.then((question) => {
      if (!question && questionCache.get(questionId) === cached) {
        questionCache.delete(questionId);
      }
    }).catch(() => {
      if (questionCache.get(questionId) === cached) {
        questionCache.delete(questionId);
      }
    });
  }

  return cached;
}

export async function GET() {
  const { team } = await requireParticipant();
  const serverNow = new Date();

  const run = await prisma.quizRun.findUnique({
    where: { id: "main" },
    include: {
      questions: {
        orderBy: { position: "asc" },
      },
    },
  });

  const noStoreHeaders = {
    "Cache-Control": "no-store",
  };

  if (!run) {
    return NextResponse.json(
      { question: null, phase: "NOT_STARTED" },
      { headers: noStoreHeaders },
    );
  }

  const clock = computeClock(
    {
      status: run.status,
      startedAt: run.startedAt,
      pausedAt: run.pausedAt,
      pausedMs: run.pausedMs,
      skipMs: run.skipMs,
    },
    run.questions,
    serverNow.getTime(),
  );

  if (clock.phase !== "QUESTION" || clock.index < 0) {
    return NextResponse.json(
      { question: null, phase: clock.phase },
      { headers: noStoreHeaders },
    );
  }

  const slot = run.questions[clock.index];

  if (!slot) {
    return NextResponse.json(
      { question: null, phase: clock.phase },
      { headers: noStoreHeaders },
    );
  }

  const rosterEntry = await prisma.quizRoster.findUnique({
    where: { teamId: team.id },
    select: { teamId: true },
  });

  if (!rosterEntry) {
    return NextResponse.json(
      {
        question: null,
        phase: clock.phase,
        reason: "NOT_ON_ROSTER",
      },
      {
        status: 403,
        headers: noStoreHeaders,
      },
    );
  }

  if (team.quizStatus === "ELIMINATED") {
    return NextResponse.json(
      {
        question: null,
        phase: clock.phase,
        reason: "ELIMINATED",
      },
      {
        status: 403,
        headers: noStoreHeaders,
      },
    );
  }

  const question = await getCachedQuestion(slot.questionId);

  if (!question) {
    return NextResponse.json(
      { error: "Question not found" },
      {
        status: 500,
        headers: noStoreHeaders,
      },
    );
  }

  return NextResponse.json(
    {
      phase: clock.phase,
      index: clock.index,
      total: run.questions.length,
      question,
    },
    { headers: noStoreHeaders },
  );
}
