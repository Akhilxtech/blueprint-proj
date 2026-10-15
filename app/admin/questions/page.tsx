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
    <div className="space-y-6 animate-fade-in-up">
      <div className="mb-2">
        <p className="text-xs font-bold uppercase tracking-wider text-[#BE3477]">
          Administration
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-[#302630] sm:text-3xl">
          Questions
        </h1>
        <p className="mt-1 text-sm text-[#4E404C]">
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

        <div className="rounded-2xl border border-white/70 bg-white/70 p-5 shadow-sm backdrop-blur-md">
          <p className="text-xs font-bold uppercase tracking-wider text-[#4E404C]">
            Estimated end
          </p>

          <EstimatedEnd
            durationSeconds={totalDurationSeconds}
            startTimestamp={startTimestamp}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-white/70 bg-white/70 p-5 shadow-sm backdrop-blur-md">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#302630]">Quiz readiness</h2>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
              readiness.ready
                ? "border border-emerald-300 bg-emerald-50 text-emerald-800"
                : "border border-rose-300 bg-rose-50 text-rose-800"
            }`}
          >
            {readiness.ready ? "Ready to Launch" : "Attention Needed"}
          </span>
        </div>

        {readiness.ready ? (
          <p className="mt-3 text-xs font-semibold text-emerald-700">
            ✓ All included questions passed the current readiness checks.
          </p>
        ) : (
          <ul className="mt-3 list-inside list-disc space-y-1 text-xs font-medium text-rose-700">
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
          <ul className="mt-3 list-inside list-disc space-y-1 text-xs font-medium text-amber-800">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        )}

        <p className="mt-3 text-xs text-[#4E404C]">
          Duration includes question times, gaps between included questions, and the pre-start countdown. The estimated end assumes the quiz starts now.
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
    <div className="rounded-2xl border border-white/70 bg-white/70 p-5 shadow-sm backdrop-blur-md">
      <p className="text-xs font-bold uppercase tracking-wider text-[#4E404C]">{label}</p>
      <p className="mt-2 text-2xl font-black text-[#BE3477]">{value}</p>
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