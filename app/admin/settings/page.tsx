import { requireAdmin } from "@/lib/auth-helper";
import { getSettings } from "@/lib/settings";
import SettingsForm from "./settings-form";

export const instant = false;

export default async function SettingsPage() {
  await requireAdmin();

  const settings = await getSettings();

  return (
    <section className="space-y-6 animate-fade-in-up">
      <div className="mb-2">
        <p className="text-xs font-bold uppercase tracking-wider text-[#BE3477]">
          Administration
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-[#302630] sm:text-3xl">
          Quiz Settings
        </h1>
        <p className="mt-1 text-sm text-[#4E404C]">
          Configure default question durations and quiz timing parameters.
        </p>
      </div>

      <SettingsForm initialSettings={settings} />
    </section>
  );
}