import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getSession,
  requireAdmin,
  requireParticipant,
} from "@/lib/auth-helper";
import { prisma } from "@/lib/db";
import GoogleSignInButton from "@/components/google-sign-in-button";
import ThemeToggle from "@/components/theme-toggle";
import { Trophy, ShieldCheck, ArrowRight, Sparkles } from "lucide-react";

export const instant = false;

export default async function HomePage() {
  const session = await getSession();

  // Preserve existing authenticated-user routing.
  if (session?.user) {
    const email = session.user.email.trim().toLowerCase();

    const adminEmails = new Set(
      (process.env.ADMIN_EMAILS ?? "")
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
    );

    if (adminEmails.has(email)) {
      await requireAdmin();
      redirect("/admin/teams");
    }

    const participant = await prisma.participant.findFirst({
      where: {
        email: {
          equals: email,
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    if (participant) {
      await requireParticipant();
      redirect("/play");
    }

    redirect("/not-registered");
  }

  // Public landing page for signed-out visitors.
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#F7F2F5] dark:bg-[#050505] px-6 py-10 text-[#302630] dark:text-[#FAFAFA]">
      {/* Decorative soft blush / premium purple background glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(217,70,141,0.14)_0%,rgba(247,242,245,0)_70%)] dark:bg-[radial-gradient(circle,rgba(139,92,246,0.12)_0%,rgba(5,5,5,0)_70%)] blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 -right-40 -z-10 h-[400px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(190,52,119,0.08)_0%,rgba(247,242,245,0)_70%)] dark:bg-[radial-gradient(circle,rgba(96,165,250,0.06)_0%,rgba(5,5,5,0)_70%)] blur-2xl"
      />

      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/70 dark:border-[#292929] bg-white/60 dark:bg-[#090909]/80 px-5 py-3.5 shadow-xs backdrop-blur-md transition-all">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-[#302630] dark:text-[#FAFAFA] transition hover:text-[#BE3477] dark:hover:text-[#A78BFA]"
          >
            <span className="flex size-7 items-center justify-center rounded-lg bg-[#FCE7F1] dark:bg-[#8B5CF6]/15 text-xs font-black text-[#BE3477] dark:text-[#A78BFA] border border-[#FCE7F1] dark:border-[#8B5CF6]/30">
              B
            </span>
            Blueprint to Live
          </Link>

          <nav
            aria-label="Main navigation"
            className="flex flex-wrap items-center gap-2 text-sm"
          >
            <Link
              href="/leaderboard"
              className="rounded-full px-4 py-1.5 font-medium text-[#746873] dark:text-[#A3A3A3] transition-all hover:bg-[#FCE7F1]/60 dark:hover:bg-[#171717] hover:text-[#BE3477] dark:hover:text-[#FAFAFA]"
            >
              Leaderboard
            </Link>

            <Link
              href="/admin"
              className="rounded-full px-4 py-1.5 font-medium text-[#746873] dark:text-[#A3A3A3] transition-all hover:bg-[#FCE7F1]/60 dark:hover:bg-[#171717] hover:text-[#BE3477] dark:hover:text-[#FAFAFA]"
            >
              Admin Panel
            </Link>

            <ThemeToggle />
          </nav>
        </header>

        <section className="mx-auto max-w-3xl py-16 sm:py-24 text-center">
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#D9468D]/25 dark:border-[#8B5CF6]/30 bg-[#FCE7F1]/80 dark:bg-[#8B5CF6]/15 px-4 py-1 text-xs font-bold uppercase tracking-[0.2em] text-[#BE3477] dark:text-[#A78BFA] shadow-xs">
              <Sparkles className="size-3.5 text-[#D9468D] dark:text-[#8B5CF6]" />
              ISE Department Presents
            </div>

            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-[#302630] dark:text-[#FAFAFA] sm:text-6xl sm:leading-[1.15]">
              Blueprint to Live
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[#746873] dark:text-[#D4D4D4] sm:text-lg">
              Think through the problem. Design the solution. Bring your
              blueprint to life in this signature technical competition.
            </p>
          </div>

          <div className="glass-panel mx-auto mt-10 max-w-md rounded-3xl p-7 text-left shadow-[0_20px_60px_rgba(78,40,62,0.08)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.8)] border border-white/80 dark:border-[#292929] dark:bg-[#111111] animate-fade-in-up animation-delay-75">
            <div className="flex items-center justify-between border-b border-[#E7DCE4]/80 dark:border-[#292929] pb-4">
              <div>
                <h2 className="text-base font-bold text-[#302630] dark:text-[#FAFAFA]">
                  Participant Access
                </h2>
                <p className="mt-0.5 text-xs text-[#746873] dark:text-[#A3A3A3]">
                  Enter the competition platform
                </p>
              </div>
              <span className="flex size-8 items-center justify-center rounded-xl bg-[#FCE7F1] dark:bg-[#8B5CF6]/15 text-[#BE3477] dark:text-[#A78BFA] border border-[#FCE7F1] dark:border-[#8B5CF6]/30">
                🔐
              </span>
            </div>

            <p className="mt-4 text-xs leading-5 text-[#746873] dark:text-[#A3A3A3]">
              Sign in using the Google account associated with your event
              registration.
            </p>

            <div className="mt-5">
              <GoogleSignInButton />
            </div>

            <p className="mt-4 text-center text-[11px] leading-4 text-[#746873]/80 dark:text-[#A3A3A3]/80">
              Access is restricted to registered participants and authorized
              event administrators.
            </p>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 animate-fade-in-up animation-delay-150">
          <Link
            href="/leaderboard"
            className="glass-panel-interactive group flex flex-col justify-between rounded-2xl p-6 shadow-xs border border-white/80 dark:border-[#292929] dark:bg-[#111111] dark:hover:bg-[#171717] dark:hover:border-[#383838]"
          >
            <div>
              <div className="flex size-10 items-center justify-center rounded-xl bg-[#FCE7F1] dark:bg-[#8B5CF6]/15 text-[#BE3477] dark:text-[#A78BFA] border border-[#FCE7F1] dark:border-[#8B5CF6]/30 transition-transform duration-200 group-hover:scale-105">
                <Trophy className="size-5" />
              </div>
              <h2 className="mt-4 font-bold text-[#302630] dark:text-[#FAFAFA] group-hover:text-[#BE3477] dark:group-hover:text-[#A78BFA] transition-colors">
                Public Leaderboard
              </h2>
              <p className="mt-1 text-sm text-[#746873] dark:text-[#A3A3A3]">
                View live rankings and team performance across completed rounds.
              </p>
            </div>
            <div className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-[#BE3477] dark:text-[#8B5CF6] dark:group-hover:text-[#A78BFA]">
              <span>View standings</span>
              <ArrowRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-1" />
            </div>
          </Link>

          <Link
            href="/admin"
            className="glass-panel-interactive group flex flex-col justify-between rounded-2xl p-6 shadow-xs border border-white/80 dark:border-[#292929] dark:bg-[#111111] dark:hover:bg-[#171717] dark:hover:border-[#383838]"
          >
            <div>
              <div className="flex size-10 items-center justify-center rounded-xl bg-[#FCE7F1] dark:bg-[#8B5CF6]/15 text-[#BE3477] dark:text-[#A78BFA] border border-[#FCE7F1] dark:border-[#8B5CF6]/30 transition-transform duration-200 group-hover:scale-105">
                <ShieldCheck className="size-5" />
              </div>
              <h2 className="mt-4 font-bold text-[#302630] dark:text-[#FAFAFA] group-hover:text-[#BE3477] dark:group-hover:text-[#A78BFA] transition-colors">
                Administration Portal
              </h2>
              <p className="mt-1 text-sm text-[#746873] dark:text-[#A3A3A3]">
                Access the control room, monitor active quizzes, and manage teams.
              </p>
            </div>
            <div className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-[#BE3477] dark:text-[#8B5CF6] dark:group-hover:text-[#A78BFA]">
              <span>Go to admin</span>
              <ArrowRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-1" />
            </div>
          </Link>
        </section>

        <footer className="mt-16 border-t border-[#E7DCE4] dark:border-[#292929] pt-8 text-center text-xs font-medium text-[#746873] dark:text-[#A3A3A3]">
          Blueprint to Live · Department of Information Science and Engineering
        </footer>
      </div>
    </main>
  );
}
