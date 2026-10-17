"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "./theme-provider";

export default function ThemeToggle({
  className = "",
}: {
  className?: string;
}) {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Before mounting, render a placeholder of matching size to prevent layout shift
  if (!mounted) {
    return (
      <div
        className={`size-9 rounded-xl border border-[#E7DCE4] dark:border-[#292929] bg-white/70 dark:bg-[#171717] backdrop-blur-md ${className}`}
        aria-hidden="true"
      />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`group relative flex size-9 items-center justify-center rounded-xl border border-[#E7DCE4] dark:border-[#292929] bg-white/75 dark:bg-[#171717] text-[#4E404C] dark:text-[#FAFAFA] shadow-2xs backdrop-blur-md transition-all duration-150 hover:border-[#D9468D]/40 dark:hover:border-[#8B5CF6]/50 hover:bg-white dark:hover:bg-[#202020] hover:text-[#BE3477] dark:hover:text-[#8B5CF6] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9468D] dark:focus-visible:ring-[#8B5CF6] cursor-pointer ${className}`}
    >
      {isDark ? (
        <Sun className="size-4 transition-transform duration-200 group-hover:rotate-45 text-amber-400" />
      ) : (
        <Moon className="size-4 transition-transform duration-200 group-hover:-rotate-12 text-[#BE3477]" />
      )}
      <span className="sr-only">
        {isDark ? "Switch to light mode" : "Switch to dark mode"}
      </span>
    </button>
  );
}

export { ThemeToggle };
