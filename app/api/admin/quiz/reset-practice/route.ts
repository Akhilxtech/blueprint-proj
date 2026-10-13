
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST() {
  await requireAdmin();

  const result = await prisma.$transaction(async (tx) => {
    const run = await tx.quizRun.findUnique({
      where: { id: "main" },
      select: { id: true, status: true },
    });

    if (!run) {
      return { error: "No quiz run exists to reset.", status: 404 };
    }

    if (run.status === "RUNNING" || run.status === "PAUSED") {
      return {
        error: "End the quiz before resetting practice.",
        status: 409,
      };
    }

    // Responses have no runId, so these belong to the single main quiz.
    const deletedResponses = await tx.response.deleteMany();
    const deletedRoster = await tx.quizRoster.deleteMany();

    await tx.team.updateMany({
      data: {
        quizStatus: "ACTIVE",
        warningCount: 0,
        eliminatedAt: null,
        isFinalist: false,
      },
    });

    const updated = await tx.quizRun.updateMany({
      where: {
        id: "main",
        status: run.status,
      },
      data: {
        status: "NOT_STARTED",
        startedAt: null,
        pausedAt: null,
        pausedMs: 0,
        skipMs: 0,
        endedAt: null,
      },
    });

    if (updated.count !== 1) {
      throw new Error("Quiz state changed during reset. Please retry.");
    }

    return {
      success: true,
      status: "NOT_STARTED",
      deletedResponses: deletedResponses.count,
      removedRosterEntries: deletedRoster.count,
    };
  });

  if ("error" in result) {
    return json(
      { error: result.error },
      typeof result.status === "number" ? result.status : 500,
    );
  }

  return json(result);
}







// import { NextResponse } from "next/server";
// import { requireAdmin } from "@/lib/auth-helper";
// import { prisma } from "@/lib/db";
// import { computeClock } from "@/lib/quiz-clock";

// function json(body: Record<string, unknown>, status = 200) {
//   return NextResponse.json(body, {
//     status,
//     headers: { "Cache-Control": "no-store" },
//   });
// }

// export async function POST() {
//   try {
//     await requireAdmin();

//     const result = await prisma.$transaction(async (tx) => {
//       const run = await tx.quizRun.findUnique({
//         where: { id: "main" },
//         include: {
//           questions: { orderBy: { position: "asc" } },
//         },
//       });

//       if (!run) {
//         return { error: "No quiz run exists to reset.", status: 404 };
//       }

//       // A running quiz whose complete timeline has elapsed is
//       // considered finished, even if its status update was missed.
//       const clock =
//         run.status === "RUNNING"
//           ? computeClock(
//               {
//                 status: run.status,
//                 startedAt: run.startedAt,
//                 pausedAt: run.pausedAt,
//                 pausedMs: run.pausedMs,
//                 skipMs: run.skipMs,
//               },
//               run.questions,
//               Date.now(),
//             )
//           : null;

//       const naturallyEnded =
//         run.status === "RUNNING" && clock?.phase === "ENDED";

//         console.log("[reset-practice] state check", {
//   databaseStatus: run.status,
//   clockPhase: clock?.phase,
//   slotCount: run.questions.length,
//   startedAt: run.startedAt,
//   pausedMs: run.pausedMs,
//   skipMs: run.skipMs,
//   now: new Date().toISOString(),
//   naturallyEnded,
// });

//       if (
//         (run.status === "RUNNING" && !naturallyEnded) ||
//         run.status === "PAUSED"
//       ) {
//         return {
//           error: "End the quiz before resetting practice.",
//           status: 409,
//         };
//       }

//       const deletedResponses = await tx.response.deleteMany();
//       const deletedRoster = await tx.quizRoster.deleteMany();

//       await tx.team.updateMany({
//         data: {
//           quizStatus: "ACTIVE",
//           warningCount: 0,
//           eliminatedAt: null,
//           isFinalist: false,
//         },
//       });

//       const updated = await tx.quizRun.updateMany({
//         where: {
//           id: "main",
//           status: run.status,
//         },
//         data: {
//           status: "NOT_STARTED",
//           startedAt: null,
//           pausedAt: null,
//           pausedMs: 0,
//           skipMs: 0,
//           endedAt: null,
//         },
//       });

//       if (updated.count !== 1) {
//         throw new Error(
//           "Quiz state changed during reset. Refresh and try again.",
//         );
//       }

//       return {
//         success: true,
//         status: "NOT_STARTED",
//         deletedResponses: deletedResponses.count,
//         removedRosterEntries: deletedRoster.count,
//       };
//     });

//     if ("error" in result) {
//       return json(
//         { error: result.error },
//         typeof result.status === "number" ? result.status : 500,
//       );
//     }

//     return json(result);
//   } catch (error) {
//     console.error("Reset practice error:", error);

//     return json(
//       {
//         error:
//           error instanceof Error
//             ? error.message
//             : "Could not reset the practice run.",
//       },
//       500,
//     );
//   }
// }

