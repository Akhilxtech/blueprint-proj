import { requireAdmin } from "@/lib/auth-helper";
import { getSettings } from "@/lib/settings";
import SettingsForm from "./settings-form";

export const instant = false;

export default async function SettingsPage() {
  await requireAdmin();

  const settings = await getSettings();

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-widest text-violet-400">
          Administration
        </p>
        <h1 className="mt-3 text-3xl font-bold">Quiz Settings</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Configure default question durations and quiz timing parameters.
        </p>
      </div>

      <SettingsForm initialSettings={settings} />
    </section>
  );
}