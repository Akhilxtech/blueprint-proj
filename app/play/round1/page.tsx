import { Suspense } from "react";
import Link from "next/link";
import { requireParticipant } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";
import SignOutButton from "@/components/sign-out-button";
import ThemeToggle from "@/components/theme-toggle";
import ParticipantQuiz from "../participant-quiz";
import { connection } from "next/server";
import { Users, Sparkles } from "lucide-react";

export const instant = false;

function PlayPageFallback() {
  return (
    <main className="min-h-screen bg-[#F7F2F5] dark:bg-[#050505] px-6 py-12 text-[#302630] dark:text-[#FAFAFA]">
      <div className="mx-auto max-w-3xl animate-fade-in">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D9468D] dark:text-[#A78BFA]">
          Blueprint to Live · Round 1
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-[#302630] dark:text-[#FAFAFA]">
          Warm-Up Rally
        </h1>
        <p className="mt-6 text-sm text-[#746873] dark:text-[#A3A3A3]">Loading your quiz dashboard...</p>
      </div>
    </main>
  );
}

async function ParticipantDashboard() {
  await connection();
  const { session, participant, team } = await requireParticipant();

  const teamMembers = await prisma.participant.findMany({
    where: { teamId: participant.teamId },
    select: { name: true, email: true },
    orderBy: { name: "asc" },
  });

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#F7F2F5] dark:bg-[#050505] px-4 py-8 sm:px-6 sm:py-10 text-[#302630] dark:text-[#FAFAFA]">
      {/* Decorative ambient glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 right-1/3 -z-10 h-[400px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(217,70,141,0.1)_0%,rgba(247,242,245,0)_70%)] dark:bg-[radial-gradient(circle,rgba(139,92,246,0.12)_0%,rgba(5,5,5,0)_70%)] blur-3xl"
      />

      <div className="mx-auto max-w-3xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E7DCE4] dark:border-[#292929] pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#FCE7F1] dark:bg-[#8B5CF6]/15 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-[#BE3477] dark:text-[#A78BFA] border border-[#FCE7F1] dark:border-[#8B5CF6]/30">
                Round 1
              </span>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#D9468D] dark:text-[#A78BFA]">
                Warm-Up Rally
              </p>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#302630] dark:text-[#FAFAFA]">
              Participant Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/play"
              className="rounded-xl border border-[#E7DCE4] dark:border-[#292929] bg-white/70 dark:bg-[#171717] px-3.5 py-2 text-xs font-semibold text-[#746873] dark:text-[#A3A3A3] backdrop-blur-md transition hover:border-[#D9468D]/40 dark:hover:border-[#383838] hover:bg-white dark:hover:bg-[#202020] hover:text-[#BE3477] dark:hover:text-[#FAFAFA]"
            >
              ← Round Hub
            </Link>
            <ThemeToggle />
            <SignOutButton />
          </div>
        </header>

        {/* Welcome & Team Summary */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 animate-fade-in-up">
          <section className="glass-panel rounded-3xl p-5 sm:p-6 border border-white/80 dark:border-[#292929] dark:bg-[#111111] shadow-xs">
            <p className="text-xs font-bold uppercase tracking-wider text-[#746873] dark:text-[#A3A3A3]">
              Participant
            </p>
            <h2 className="mt-1 text-xl font-bold text-[#302630] dark:text-[#FAFAFA]">
              {participant.name}
            </h2>
            <p className="mt-1 truncate text-xs text-[#746873] dark:text-[#A3A3A3]">
              {session.user.email}
            </p>
          </section>

          <section className="glass-panel rounded-3xl p-5 sm:p-6 border border-white/80 dark:border-[#292929] dark:bg-[#111111] shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-[#746873] dark:text-[#A3A3A3]">
                Team
              </p>
              <Users className="size-4 text-[#BE3477] dark:text-[#8B5CF6]" />
            </div>
            <h2 className="mt-1 text-xl font-bold text-[#302630] dark:text-[#FAFAFA]">
              {team.name}
            </h2>
            <p className="mt-1 text-xs text-[#746873] dark:text-[#A3A3A3]">
              {teamMembers.length} registered {teamMembers.length === 1 ? "member" : "members"}
            </p>
          </section>
        </div>

        {/* Team Members List (Collapsible / Compact) */}
        <section className="glass-panel mt-4 rounded-3xl p-5 sm:p-6 border border-white/80 dark:border-[#292929] dark:bg-[#111111] shadow-xs animate-fade-in-up animation-delay-75">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#746873] dark:text-[#A3A3A3]">
            Roster Members
          </h3>
          <ul className="mt-3 divide-y divide-[#E7DCE4]/70 dark:divide-[#292929]">
            {teamMembers.map((member) => (
              <li
                key={member.email}
                className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 text-sm"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex size-6 items-center justify-center rounded-full bg-[#FCE7F1] dark:bg-[#8B5CF6]/15 text-[11px] font-bold text-[#BE3477] dark:text-[#A78BFA] border border-[#FCE7F1] dark:border-[#8B5CF6]/30">
                    {member.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="font-semibold text-[#302630] dark:text-[#FAFAFA]">{member.name}</span>
                </div>
                <span className="text-xs text-[#746873] dark:text-[#A3A3A3]">{member.email}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Synchronized Quiz Component */}
        <ParticipantQuiz initialRulesAccepted={team.rulesAcceptedAt !== null} />

        <footer className="mt-12 border-t border-[#E7DCE4] dark:border-[#292929] pt-6 flex items-center justify-between text-xs text-[#746873] dark:text-[#A3A3A3]">
          <Link
            href="/play"
            className="font-semibold text-[#746873] dark:text-[#A3A3A3] hover:text-[#BE3477] dark:hover:text-[#A78BFA] transition-colors"
          >
            ← Back to Round Selection
          </Link>
          <span>Blueprint to Live · Round 1</span>
        </footer>
      </div>
    </main>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={<PlayPageFallback />}>
      <ParticipantDashboard />
    </Suspense>
  );
}
