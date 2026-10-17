import CodeBlock from "./code-block";

export type QuestionOptionView = {
  id?: string;
  label: string;
  content: string;
  isCode?: boolean;
  codeLanguage?: string;
  highlightedCode?: string;
};

export default function OptionCard({
  option,
  selected = false,
  onSelect,
}: {
  option: QuestionOptionView;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const className = [
    "w-full rounded-2xl border p-4 text-left transition-all duration-150 shadow-xs",
    selected
      ? "border-[#D9468D] dark:border-[#8B5CF6] bg-[#FCE7F1]/70 dark:bg-[#8B5CF6]/15 ring-1 ring-[#D9468D] dark:ring-[#8B5CF6]"
      : "border-[#E7DCE4] dark:border-[#292929] bg-white dark:bg-[#111111] hover:border-[#D9468D]/40 dark:hover:border-[#8B5CF6]/50 hover:bg-[#FAF6F8] dark:hover:bg-[#171717] hover:shadow-sm",
  ].join(" ");

  const content = (
    <div className="flex items-start gap-3.5">
      <span
        className={`flex size-8 shrink-0 items-center justify-center rounded-xl text-sm font-bold transition-colors ${
          selected
            ? "bg-[#BE3477] dark:bg-[#8B5CF6] text-white"
            : "border border-[#E7DCE4] dark:border-[#292929] bg-[#F1E9EF] dark:bg-[#171717] text-[#4E404C] dark:text-[#A3A3A3]"
        }`}
      >
        {option.label}
      </span>
      <div className="min-w-0 flex-1">
        {option.isCode && option.highlightedCode ? (
          <CodeBlock
            html={option.highlightedCode}
            language={option.codeLanguage ?? "Code"}
          />
        ) : (
          <div className="whitespace-pre-wrap break-words text-sm leading-6 text-[#302630] dark:text-[#FAFAFA]">
            {option.content}
          </div>
        )}
      </div>
    </div>
  );

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={`${className} active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9468D] dark:focus-visible:ring-[#8B5CF6]`}
      >
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}
