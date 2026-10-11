
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
    "w-full rounded-xl border p-4 text-left transition",
    selected
      ? "border-violet-400 bg-violet-400/10"
      : "border-white/10 bg-zinc-900 hover:border-white/20",
  ].join(" ");

  const content = (
    <>
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/15 text-sm font-semibold">
          {option.label}
        </span>
        <div className="min-w-0 flex-1">
          {option.isCode && option.highlightedCode ? (
            <CodeBlock
              html={option.highlightedCode}
              language={option.codeLanguage ?? "Code"}
            />
          ) : (
            <div className="whitespace-pre-wrap break-words text-sm leading-6 text-zinc-200">
              {option.content}
            </div>
          )}
        </div>
      </div>
    </>
  );

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={className}
      >
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}
