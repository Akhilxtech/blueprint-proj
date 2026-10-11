import { requireAdmin } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getQuizReadiness } from "@/lib/quiz-readiness";
import QuestionsTable from "./question-table";
import EstimatedEnd from "./estimated-end";

export const instant = false;

export default async function QuestionsPage() {
  await requireAdmin();

  const [questions, settings, readiness] = await Promise.all([
    prisma.question.findMany({
      include: {
        options: {
          orderBy: { label: "asc" },
        },
      },
      orderBy: [{ position: "asc" }, { id: "asc" }],
    }),
    
    getSettings(),
    getQuizReadiness(),
  ]);
const startTimestamp = new Date().getTime();
  const includedQuestions = questions.filter(
    (question) => question.included,
  );

  const questionDurations = includedQuestions.map((question) => {
    const typeDefault =
      question.type === "CODE"
        ? settings.codeSeconds
        : settings.theorySeconds;

    return (
      question.timeSeconds ??
      typeDefault ??
      settings.fallbackSeconds
    );
  });

  const totalDurationSeconds =
    questionDurations.reduce(
      (total, seconds) => total + seconds,
      0,
    ) +
    Math.max(0, includedQuestions.length - 1) *
      settings.gapSeconds +
    settings.prestartSeconds;

  const warnings = includedQuestions.flatMap(
    (question, index) =>
      questionDurations[index] < 5
        ? [
            `Question ${question.position} has less than 5 seconds allocated.`,
          ]
        : [],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Questions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage questions, timing, marks, and quiz inclusion.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total questions"
          value={questions.length}
        />

        <SummaryCard
          label="Included questions"
          value={includedQuestions.length}
        />

        <SummaryCard
          label="Quiz duration"
          value={formatDuration(totalDurationSeconds)}
        />

        <div className="rounded-xl border p-4">
  <p className="text-sm text-muted-foreground">
    Estimated end
  </p>

  <EstimatedEnd
    durationSeconds={totalDurationSeconds}
    startTimestamp={startTimestamp}
  />
</div>
      </section>

      <section className="rounded-xl border p-4">
        <h2 className="font-semibold">Quiz readiness</h2>

        {readiness.ready ? (
          <p className="mt-2 text-sm text-green-700">
            All included questions passed the current readiness
            checks.
          </p>
        ) : (
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-red-600">
            {readiness.problems.map((problem, index) => (
              <li key={`${index}-${JSON.stringify(problem)}`}>
                {typeof problem === "string"
                  ? problem
                  : JSON.stringify(problem)}
              </li>
            ))}
          </ul>
        )}

        {warnings.length > 0 && (
          <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-amber-700">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        )}

        <p className="mt-3 text-xs text-muted-foreground">
          Duration includes question times, gaps between included
          questions, and the pre-start countdown. The estimated
          end assumes the quiz starts now.
        </p>
      </section>

      <QuestionsTable questions={questions} />
    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  if (seconds === 0) {
    return `${minutes}m`;
  }

  return `${minutes}m ${seconds}s`;
}