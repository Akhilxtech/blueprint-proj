"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { QuizSettings } from "@/lib/settings";
import { saveSettings } from "./settings-actions";

const fields: {
  key: keyof QuizSettings;
  label: string;
  description: string;
  min: number;
  max: number;
  step: number;
  suffix: string;
}[] = [
  {
    key: "theorySeconds",
    label: "Theory question duration",
    description: "Default time for theory questions.",
    min: 1, max: 3600, step: 1, suffix: "seconds",
  },
  {
    key: "codeSeconds",
    label: "Code question duration",
    description: "Default time for code questions.",
    min: 1, max: 3600, step: 1, suffix: "seconds",
  },
  {
    key: "fallbackSeconds",
    label: "Fallback duration",
    description: "Used when neither the question nor its type provides a duration.",
    min: 1, max: 3600, step: 1, suffix: "seconds",
  },
  {
    key: "gapSeconds",
    label: "Gap between questions",
    description: "Pause between consecutive questions.",
    min: 0, max: 3600, step: 1, suffix: "seconds",
  },
  {
    key: "prestartSeconds",
    label: "Pre-start countdown",
    description: "Countdown before the quiz begins.",
    min: 0, max: 3600, step: 1, suffix: "seconds",
  },
  {
    key: "graceMs",
    label: "Grace period",
    description: "Grace interval in milliseconds.",
    min: 0, max: 60000, step: 100, suffix: "ms",
  },
  {
    key: "maxWarnings",
    label: "Maximum warnings",
    description: "Warning limit configured for the quiz.",
    min: 0, max: 100, step: 1, suffix: "warnings",
  },
  {
    key: "minAwaySeconds",
    label: "Minimum away duration",
    description: "Minimum away duration in seconds.",
    min: 0, max: 3600, step: 1, suffix: "seconds",
  },
  {
    key: "verdictBannerSeconds",
    label: "Verdict banner duration",
    description: "How long the verdict banner is displayed.",
    min: 0, max: 3600, step: 1, suffix: "seconds",
  },
];

export default function SettingsForm({
  initialSettings,
}: {
  initialSettings: QuizSettings;
}) {
  const [values, setValues] = useState<QuizSettings>(initialSettings);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function updateValue(key: keyof QuizSettings, rawValue: string) {
    setValues((current) => ({
      ...current,
      [key]: rawValue === "" ? 0 : Number(rawValue),
    }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    startTransition(async () => {
      const result = await saveSettings(values);
      setMessage(result.message);
      setIsSuccess(result.success);

      if (result.success) {
        router.refresh();
      }
    });
  }

  function resetDefaults() {
    setValues({
      theorySeconds: 20,
      codeSeconds: 90,
      fallbackSeconds: 30,
      gapSeconds: 3,
      prestartSeconds: 10,
      graceMs: 1500,
      maxWarnings: 3,
      minAwaySeconds: 1,
      verdictBannerSeconds: 6,
    });
    setMessage("");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {fields.map((field) => (
          <label
            key={field.key}
            className="block rounded-2xl border border-white/70 bg-white/70 p-5 shadow-sm backdrop-blur-md dark:border-[#292929] dark:bg-[#111111]"
          >
            <span className="text-sm font-bold text-[#302630] dark:text-[#FAFAFA]">{field.label}</span>
            <span className="mt-1 block text-xs text-[#4E404C] dark:text-[#A3A3A3]">
              {field.description}
            </span>

            <span className="mt-3 flex items-center gap-3">
              <input
                type="number"
                required
                min={field.min}
                max={field.max}
                step={field.step}
                value={values[field.key]}
                onChange={(event) =>
                  updateValue(field.key, event.target.value)
                }
                className="w-full rounded-xl border border-[#E7DCE4] bg-white/90 px-3.5 py-2 text-xs font-bold text-[#302630] outline-none focus:border-[#D9468D] focus:ring-2 focus:ring-[#D9468D]/20 transition-all dark:border-[#292929] dark:bg-[#171717] dark:text-[#FAFAFA] dark:focus:border-[#8B5CF6] dark:focus:ring-[#8B5CF6]/20"
              />
              <span className="shrink-0 rounded-lg bg-[#F1E9EF] px-2.5 py-1 text-xs font-semibold text-[#4E404C] dark:bg-[#171717] dark:text-[#A3A3A3]">
                {field.suffix}
              </span>
            </span>
          </label>
        ))}
      </div>

      {message && (
        <p
          role="status"
          className={`rounded-xl border p-3 text-xs font-semibold ${
            isSuccess
              ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300"
          }`}
        >
          {message}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-[#BE3477] px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#a82a67] active:scale-[0.98] transition-all disabled:opacity-50 dark:bg-[#8B5CF6] dark:hover:bg-[#A78BFA] dark:text-[#FAFAFA]"
        >
          {pending ? "Saving..." : "Save settings"}
        </button>

        <button
          type="button"
          onClick={resetDefaults}
          disabled={pending}
          className="rounded-xl border border-[#E7DCE4] bg-white/80 px-5 py-2.5 text-xs font-semibold text-[#4E404C] hover:bg-white hover:text-[#302630] transition-colors disabled:opacity-50 dark:border-[#292929] dark:bg-[#171717] dark:text-[#FAFAFA] dark:hover:bg-[#202020]"
        >
          Reset form to defaults
        </button>
      </div>
    </form>
  );
}