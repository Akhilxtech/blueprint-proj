
import { Suspense } from "react";
import Link from "next/link";
import { requireParticipant } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";
import SignOutButton from "@/components/sign-out-button";
import ThemeToggle from "@/components/theme-toggle";
import ParticipantQuiz from "../participant-quiz";
import { connection } from "next/server";

export const instant = false;

function PlayPageFallback() {
  return (
    <main className="min-h-screen bg-[#F7F2F5] dark:bg-[#050505] px-4 py-6 text-[#302630] dark:text-[#FAFAFA]">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D9468D] dark:text-[#A78BFA]">
          Blueprint to Live · Round 1
        </p>
        <h1 className="mt-2 text-2xl font-extrabold">
          Warm-Up Rally
        </h1>
        <p className="mt-3 text-sm text-[#746873] dark:text-[#A3A3A3]">
          Loading your quiz...
        </p>
      </div>
    </main>
  );
}

async function ParticipantDashboard() {
  await connection();
  const { team } = await requireParticipant();

  const teamRulesAccepted = team.rulesAcceptedAt !== null;

  return (
    <main className="min-h-screen bg-[#F7F2F5] dark:bg-[#050505] px-3 py-4 sm:px-6 sm:py-5 text-[#302630] dark:text-[#FAFAFA]">
      <div className="mx-auto max-w-5xl">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#E7DCE4] pb-3 dark:border-[#292929]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#D9468D] dark:text-[#A78BFA]">
              Blueprint to Live · Round 1
            </p>
            <h1 className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">
              Warm-Up Rally
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/play"
              className="rounded-xl border border-[#E7DCE4] bg-white/70 px-3 py-2 text-xs font-semibold text-[#746873] transition hover:text-[#BE3477] dark:border-[#292929] dark:bg-[#171717] dark:text-[#A3A3A3] dark:hover:text-white"
            >
              ← Round Hub
            </Link>
            <ThemeToggle />
            <SignOutButton />
          </div>
        </header>

        <ParticipantQuiz initialRulesAccepted={teamRulesAccepted} />
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
