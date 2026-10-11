
import CodeBlock from "./code-block";
import OptionCard, { type QuestionOptionView } from "./option-card";

export type QuestionCardView = {
  position?: number;
  text: string;
  type: "THEORY" | "CODE";
  marks: number;
  code?: string | null;
  codeLanguage?: string | null;
  highlightedCode?: string;
  options: QuestionOptionView[];
};

export default function QuestionCard({
  question,
  selectedOption,
  onSelectOption,
}: {
  question: QuestionCardView;
  selectedOption?: string;
  onSelectOption?: (label: string) => void;
}) {
  return (
    <article className="space-y-5 rounded-2xl border border-white/10 bg-zinc-950 p-5 text-white">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-400">
          {question.position !== undefined && (
            <span>Question {question.position}</span>
          )}
          <span className="rounded-md bg-white/10 px-2 py-1">
            {question.type}
          </span>
        </div>

        <span className="text-sm text-zinc-400">
          {question.marks} {question.marks === 1 ? "mark" : "marks"}
        </span>
      </header>

      <div className="whitespace-pre-wrap break-words text-base leading-7">
        {question.text}
      </div>

      {question.code && question.codeLanguage && (
        question.highlightedCode ? (
          <CodeBlock
            html={question.highlightedCode}
            language={question.codeLanguage}
          />
        ) : (
          <pre className="overflow-x-auto rounded-lg border border-white/10 bg-zinc-900 p-4 text-sm">
            <code>{question.code}</code>
          </pre>
        )
      )}

      <div className="grid gap-3">
        {question.options.map((option) => (
          <OptionCard
            key={option.id ?? option.label}
            option={option}
            selected={selectedOption === option.label}
            onSelect={
              onSelectOption
                ? () => onSelectOption(option.label)
                : undefined
            }
          />
        ))}
      </div>
    </article>
  );
}