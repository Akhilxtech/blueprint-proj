
import "server-only";

import { createHighlighter, type BundledLanguage } from "shiki";

const supportedLanguages = [
  "c",
  "cpp",
  "java",
  "python",
  "javascript",
] as const;

export type CodeLanguage = (typeof supportedLanguages)[number];

const languageAliases: Record<string, CodeLanguage> = {
  c: "c",
  cpp: "cpp",
  "c++": "cpp",
  java: "java",
  python: "python",
  py: "python",
  javascript: "javascript",
  js: "javascript",
};

let highlighterPromise: ReturnType<typeof createHighlighter> | undefined;

const htmlCache = new Map<string, string>();
const MAX_CACHE_ENTRIES = 200;

function getHighlighter() {
  highlighterPromise ??= createHighlighter({
    themes: ["rose-pine-dawn"],
    langs: [...supportedLanguages] as BundledLanguage[],
  });

  return highlighterPromise;
}

export function normalizeCodeLanguage(
  language: string,
): CodeLanguage | null {
  return languageAliases[language.trim().toLowerCase()] ?? null;
}

export async function highlightCode(
  code: string,
  lang: string,
): Promise<string> {
  const normalizedLanguage = normalizeCodeLanguage(lang);

  if (!normalizedLanguage) {
    throw new Error(`Unsupported code language: ${lang}`);
  }

  const cacheKey = `${normalizedLanguage}\0${code}`;
  const cached = htmlCache.get(cacheKey);

  if (cached !== undefined) {
    return cached;
  }

  const highlighter = await getHighlighter();

  const html = highlighter.codeToHtml(code, {
    lang: normalizedLanguage,
    theme: "rose-pine-dawn",
    transformers: [
      {
        pre(node) {
          node.properties.style =
            `${node.properties.style ?? ""};margin:0;background:transparent;`;
        },
      },
    ],
  });

  // Keep the cache bounded so repeated edits cannot grow it indefinitely.
  if (htmlCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = htmlCache.keys().next().value;
    if (oldestKey !== undefined) htmlCache.delete(oldestKey);
  }

  htmlCache.set(cacheKey, html);
  return html;
}
