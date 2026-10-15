import { Suspense } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth-helper";
import SignOutButton from "@/components/sign-out-button";
import { connection } from "next/server";
import AdminQuizBanner from "@/components/admin-quiz-banner";
import {
  Users,
  CircleHelp,
  Radio,
  Settings as SettingsIcon,
  Activity,
  Trophy,
  Sparkles,
  Code2,
  ChevronRight,
} from "lucide-react";

export const instant = false;

const navigation = [
  { label: "Teams", href: "/admin/teams", icon: Users },
  { label: "Questions", href: "/admin/questions", icon: CircleHelp },
  { label: "Quiz Control", href: "/admin/quiz", icon: Radio },
  { label: "Settings", href: "/admin/settings", icon: SettingsIcon },
  { label: "Monitor", href: "/admin/monitor", icon: Activity },
  { label: "Results", href: "/admin/results", icon: Trophy },
  { label: "Round 2", href: "/admin/round-2", icon: Sparkles },
  { label: "Round 3", href: "/admin/round-3", icon: Code2 },
];

async function AdminContent({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-[#F7F2F5] text-[#302630] md:flex md:h-screen md:overflow-hidden">
      <aside className="border-b border-[#E7DCE4] bg-white/70 backdrop-blur-xl p-6 md:h-screen md:w-64 md:shrink-0 md:border-b-0 md:border-r md:flex md:flex-col md:justify-between shadow-xs z-20">
        <div className="flex flex-col md:min-h-0 md:flex-1">
          <div className="pb-6 border-b border-[#E7DCE4] shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#D9468D]">
              ISE Department
            </p>
            <Link
              href="/admin"
              className="mt-1 block text-xl font-bold tracking-tight text-[#302630] hover:text-[#BE3477] transition-colors"
            >
              Blueprint to Live
            </Link>
            <span className="mt-2 inline-flex items-center rounded-full bg-[#FCE7F1] px-2.5 py-0.5 text-xs font-semibold text-[#BE3477]">
              Admin Console
            </span>
          </div>

          <nav className="mt-6 grid grid-cols-2 gap-1.5 md:grid-cols-1 md:overflow-y-auto md:min-h-0 md:flex-1 md:pr-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#4E404C] transition-all duration-150 hover:bg-[#FCE7F1]/80 hover:text-[#BE3477] active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="size-4 shrink-0 text-[#4E404C] transition-colors group-hover:text-[#BE3477]" />
                    <span>{item.label}</span>
                  </div>
                  <ChevronRight className="size-3.5 text-[#E7DCE4] opacity-0 transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:text-[#BE3477]" />
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-6 border-t border-[#E7DCE4] pt-5 flex items-center justify-between shrink-0">
          <Link
            href="/"
            className="text-xs font-semibold text-[#4E404C] hover:text-[#BE3477] transition-colors"
          >
            ← Public Site
          </Link>
          <SignOutButton />
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-6 md:p-10 md:h-screen md:overflow-y-auto">
        <AdminQuizBanner />
        {children}
      </main>
    </div>
  );
}

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await connection();
  await requireAdmin();
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F7F2F5]" />}>
      <AdminContent>{children}</AdminContent>
    </Suspense>
  );
}
