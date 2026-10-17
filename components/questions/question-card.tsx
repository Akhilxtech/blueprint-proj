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
    <article className="space-y-5 rounded-3xl border border-[#E7DCE4] dark:border-[#292929] bg-white dark:bg-[#111111] p-6 sm:p-7 text-[#302630] dark:text-[#FAFAFA] shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E7DCE4] dark:border-[#292929] pb-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#4E404C] dark:text-[#A3A3A3]">
          {question.position !== undefined && (
            <span className="font-bold text-[#302630] dark:text-[#FAFAFA]">Question {question.position}</span>
          )}
          <span className="rounded-lg bg-[#FCE7F1] dark:bg-[#8B5CF6]/15 border border-transparent dark:border-[#8B5CF6]/30 px-2.5 py-1 text-xs font-bold text-[#BE3477] dark:text-[#8B5CF6]">
            {question.type}
          </span>
        </div>

        <span className="rounded-full border border-[#E7DCE4] dark:border-[#292929] bg-[#F1E9EF] dark:bg-[#171717] px-3 py-1 text-xs font-semibold text-[#4E404C] dark:text-[#A3A3A3]">
          {question.marks} {question.marks === 1 ? "mark" : "marks"}
        </span>
      </header>

      <div className="whitespace-pre-wrap break-words text-base leading-7 font-medium text-[#302630] dark:text-[#FAFAFA]">
        {question.text}
      </div>

      {question.code && question.codeLanguage && (
        question.highlightedCode ? (
          <CodeBlock
            html={question.highlightedCode}
            language={question.codeLanguage}
          />
        ) : (
          <pre className="overflow-x-auto rounded-xl border border-[#E7DCE4] dark:border-[#292929] bg-[#F1E9EF]/50 dark:bg-[#090909] p-4 font-mono text-sm text-[#302630] dark:text-[#FAFAFA]">
            <code>{question.code}</code>
          </pre>
        )
      )}

      <div className="grid gap-3 pt-2">
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