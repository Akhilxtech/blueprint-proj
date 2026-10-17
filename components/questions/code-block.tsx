type CodeBlockProps = {
  html: string;
  language: string;
};

export default function CodeBlock({
  html,
  language,
}: CodeBlockProps) {
  return (
    <div className="my-3 overflow-hidden rounded-xl border border-[#E7DCE4] dark:border-[#292929] bg-white/80 dark:bg-[#090909] shadow-xs backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-[#E7DCE4] dark:border-[#292929] bg-[#F1E9EF]/60 dark:bg-[#111111] px-3.5 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#BE3477] dark:text-[#8B5CF6]">
          {language}
        </span>
        <span className="text-xs font-semibold text-[#4E404C] dark:text-[#A3A3A3]">Code snippet</span>
      </div>

      <div
        className="overflow-x-auto p-4 text-sm [&_pre]:m-0 [&_pre]:min-w-max [&_pre]:bg-transparent [&_pre]:whitespace-pre [&_code]:font-mono text-[#302630] dark:text-[#FAFAFA]"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}