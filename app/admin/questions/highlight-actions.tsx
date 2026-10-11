"use server";

import { requireAdmin } from "@/lib/auth-helper";
import { highlightCode, normalizeCodeLanguage } from "@/lib/highlight-code";

export async function getHighlightedCode(
  code: string,
  language: string,
): Promise<{ success: true; html: string } | { success: false; message: string }> {
  await requireAdmin();

  if (code.length > 20_000) {
    return {
      success: false,
      message: "Code is too long to preview.",
    };
  }

  const normalizedLanguage = normalizeCodeLanguage(language);

  if (!normalizedLanguage) {
    return {
      success: false,
      message: "Unsupported code language.",
    };
  }

  try {
    const html = await highlightCode(code, normalizedLanguage);

    return {
      success: true,
      html,
    };
  } catch {
    return {
      success: false,
      message: "Unable to highlight this code.",
    };
  }
}