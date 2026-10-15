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
      ? "border-[#D9468D] bg-[#FCE7F1]/70 ring-1 ring-[#D9468D]"
      : "border-[#E7DCE4] bg-white hover:border-[#D9468D]/40 hover:bg-[#FAF6F8] hover:shadow-sm",
  ].join(" ");

  const content = (
    <div className="flex items-start gap-3.5">
      <span
        className={`flex size-8 shrink-0 items-center justify-center rounded-xl text-sm font-bold transition-colors ${
          selected
            ? "bg-[#BE3477] text-white"
            : "border border-[#E7DCE4] bg-[#F1E9EF] text-[#4E404C]"
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
          <div className="whitespace-pre-wrap break-words text-sm leading-6 text-[#302630]">
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
        className={`${className} active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9468D]`}
      >
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}
