type CodeBlockProps = {
  html: string;
  language: string;
};

export default function CodeBlock({
  html,
  language,
}: CodeBlockProps) {
  return (
    <div className="my-3 overflow-hidden rounded-lg border bg-muted/30">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-xs font-medium text-muted-foreground">
          {language}
        </span>
        <span className="text-xs text-muted-foreground">Code</span>
      </div>

      <div
        className="overflow-x-auto p-4 text-sm [&_pre]:m-0 [&_pre]:min-w-max [&_pre]:bg-transparent [&_pre]:whitespace-pre [&_code]:font-mono"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}