
import "server-only";

import { prisma } from "@/lib/db";

export type QuizReadinessProblem = {
  questionId?: string;
  position?: number;
  message: string;
};

export type QuizReadiness = {
  ready: boolean;
  includedQuestionCount: number;
  problems: QuizReadinessProblem[];
};

export async function getQuizReadiness(): Promise<QuizReadiness> {
  const questions = await prisma.question.findMany({
    where: { included: true },
    orderBy: [{ position: "asc" }, { id: "asc" }],
    select: {
      id: true,
      position: true,
      text: true,
      options: {
        select: {
          isCorrect: true,
        },
      },
    },
  });

  const problems: QuizReadinessProblem[] = [];

  if (questions.length === 0) {
    problems.push({
      message: "There are no included questions.",
    });
  }

  for (const question of questions) {
    if (question.options.length < 2) {
      problems.push({
        questionId: question.id,
        position: question.position,
        message: `Question at position ${question.position} has fewer than 2 options.`,
      });
    }

    if (!question.options.some((option) => option.isCorrect)) {
      problems.push({
        questionId: question.id,
        position: question.position,
        message: `Question at position ${question.position} has no correct option.`,
      });
    }
  }

  return {
    ready: problems.length === 0,
    includedQuestionCount: questions.length,
    problems,
  };
}
