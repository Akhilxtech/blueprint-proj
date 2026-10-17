import Link from "next/link";
import { Users, Radio, Trophy, Activity, Sparkles, Code2, ArrowRight } from "lucide-react";

export default function AdminDashboardPage() {
  const cards = [
    {
      title: "Teams & Participants",
      description: "Review registered teams, add members, or import roster CSVs.",
      href: "/admin/teams",
      icon: Users,
    },
    {
      title: "Quiz Control Room",
      description: "Manage prestart countdowns, pause/resume, and synchronized question flow.",
      href: "/admin/quiz",
      icon: Radio,
    },
    {
      title: "Live Monitor",
      description: "Track real-time team connections, quiz participation, and tab-switch warnings.",
      href: "/admin/monitor",
      icon: Activity,
    },
    {
      title: "Official Results",
      description: "Inspect Round 1 scores, ties, and export CSV reports.",
      href: "/admin/results",
      icon: Trophy,
    },
    {
      title: "Round 2 Evaluations",
      description: "Assign Round 2 marks, break ties, and select finalists.",
      href: "/admin/round-2",
      icon: Sparkles,
    },
    {
      title: "Round 3 Build-Off",
      description: "Configure problem statements, selection windows, and review EC2 submissions.",
      href: "/admin/round-3",
      icon: Code2,
    },
  ];

  return (
    <section className="animate-fade-in-up">
      <div className="border-b border-[#E7DCE4] dark:border-[#292929] pb-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D9468D] dark:text-[#8B5CF6]">
          Administration Portal
        </p>

        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[#302630] dark:text-[#FAFAFA]">
          Console Dashboard
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#4E404C] dark:text-[#A3A3A3]">
          Welcome to the Blueprint to Live administrator control center. Select any module below or use the sidebar navigation.
        </p>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.title}
              href={item.href}
              className="glass-panel-interactive group flex flex-col justify-between rounded-3xl p-6 border border-white/80 dark:border-[#292929] dark:bg-[#111111] shadow-xs"
            >
              <div>
                <div className="flex size-11 items-center justify-center rounded-2xl bg-[#FCE7F1] dark:bg-[#8B5CF6]/15 text-[#BE3477] dark:text-[#A78BFA] transition-transform duration-200 group-hover:scale-105">
                  <Icon className="size-5" />
                </div>
                <h2 className="mt-4 text-base font-bold text-[#302630] dark:text-[#FAFAFA] transition-colors group-hover:text-[#BE3477] dark:group-hover:text-[#A78BFA]">
                  {item.title}
                </h2>
                <p className="mt-1.5 text-xs leading-5 text-[#4E404C] dark:text-[#A3A3A3]">
                  {item.description}
                </p>
              </div>

              <div className="mt-6 flex items-center gap-1.5 text-xs font-bold text-[#BE3477] dark:text-[#8B5CF6]">
                <span>Manage</span>
                <ArrowRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-1" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
