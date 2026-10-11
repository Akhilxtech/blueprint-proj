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
            className="block rounded-xl border border-white/10 bg-zinc-900 p-4"
          >
            <span className="font-medium">{field.label}</span>
            <span className="mt-1 block text-sm text-zinc-400">
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
                className="w-full rounded-lg border border-white/15 bg-zinc-950 px-3 py-2 outline-none focus:border-violet-400"
              />
              <span className="shrink-0 text-sm text-zinc-400">
                {field.suffix}
              </span>
            </span>
          </label>
        ))}
      </div>

      {message && (
        <p
          role="status"
          className={isSuccess ? "text-sm text-green-400" : "text-sm text-red-400"}
        >
          {message}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-zinc-950 disabled:opacity-50"
        >
          {pending ? "Saving..." : "Save settings"}
        </button>

        <button
          type="button"
          onClick={resetDefaults}
          disabled={pending}
          className="rounded-lg border border-white/15 px-5 py-2.5 text-sm hover:bg-white/5 disabled:opacity-50"
        >
          Reset form to defaults
        </button>
      </div>
    </form>
  );
}