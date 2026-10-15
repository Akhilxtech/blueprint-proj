import { Suspense } from "react";
import Link from "next/link";
import { requireParticipant } from "@/lib/auth-helper";
import SignOutButton from "@/components/sign-out-button";
import { ArrowRight, Trophy, Code2, Users } from "lucide-react";

export const instant = false;

function ParticipantHubFallback() {
  return (
    <main className="min-h-screen bg-[#F7F2F5] px-6 py-12 text-[#302630]">
      <div className="mx-auto max-w-5xl animate-fade-in">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D9468D]">
          Blueprint to Live
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-[#302630]">
          Participant Dashboard
        </h1>
        <p className="mt-4 text-sm text-[#746873]">
          Loading your participant dashboard...
        </p>
      </div>
    </main>
  );
}

async function ParticipantHub() {
  const { session, participant, team } = await requireParticipant();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#F7F2F5] px-6 py-10 text-[#302630]">
      {/* Decorative ambient glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 right-1/4 -z-10 h-[450px] w-[600px] rounded-full bg-[radial-gradient(circle,rgba(217,70,141,0.12)_0%,rgba(247,242,245,0)_70%)] blur-3xl"
      />

      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-[#E7DCE4] pb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D9468D]">
              Blueprint to Live
            </p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[#302630]">
              Participant Dashboard
            </h1>
            <p className="mt-1 text-sm text-[#746873]">
              Welcome back, <strong className="font-semibold text-[#302630]">{participant.name}</strong>
              {" · "}
              <span className="text-xs text-[#746873]/80">{session.user.email}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/leaderboard"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#E7DCE4] bg-white/70 px-3.5 py-2 text-xs font-semibold text-[#746873] shadow-xs backdrop-blur-md transition hover:border-[#D9468D]/40 hover:bg-white hover:text-[#BE3477]"
            >
              <Trophy className="size-3.5 text-[#BE3477]" />
              Leaderboard
            </Link>
            <SignOutButton />
          </div>
        </header>

        {/* Team Information Card */}
        <section className="glass-panel mb-8 rounded-3xl p-6 sm:p-7 shadow-xs border border-white/80 animate-fade-in-up">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#746873]">
                Your Registered Team
              </p>
              <h2 className="mt-1 text-2xl font-bold text-[#302630]">
                {team.name}
              </h2>
            </div>
            <span className="flex size-10 items-center justify-center rounded-2xl bg-[#FCE7F1] text-[#BE3477]">
              <Users className="size-5" />
            </span>
          </div>
          <p className="mt-2 text-sm text-[#746873]">
            Select an active competition round below to continue your event participation.
          </p>
        </section>

        {/* Available Rounds Section */}
        <section className="animate-fade-in-up animation-delay-75">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-[#302630]">
              Available Rounds
            </h2>
            <span className="text-xs font-semibold text-[#746873]">
              Select a round to enter
            </span>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Link
              href="/play/round1"
              className="glass-panel-interactive group relative flex flex-col justify-between rounded-3xl p-7 shadow-xs border border-white/80"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-[#FCE7F1] px-3 py-1 text-xs font-bold tracking-wider text-[#BE3477]">
                    ROUND 1
                  </span>
                  <span className="text-xs font-semibold text-[#746873]">
                    Synchronized Quiz
                  </span>
                </div>
                <h3 className="mt-4 text-xl font-bold text-[#302630] transition-colors group-hover:text-[#BE3477]">
                  Warm-Up Rally
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#746873]">
                  Enter the live synchronous quiz and submit your team&apos;s answers before the countdown expires.
                </p>
              </div>

              <div className="mt-8 flex items-center gap-2 text-sm font-bold text-[#BE3477]">
                <span>Enter Round 1</span>
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
              </div>
            </Link>

            <Link
              href="/play/round3"
              className="glass-panel-interactive group relative flex flex-col justify-between rounded-3xl p-7 shadow-xs border border-white/80"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-[#FCE7F1] px-3 py-1 text-xs font-bold tracking-wider text-[#BE3477]">
                    ROUND 3
                  </span>
                  <span className="text-xs font-semibold text-[#746873]">
                    Finalist Build
                  </span>
                </div>
                <h3 className="mt-4 text-xl font-bold text-[#302630] transition-colors group-hover:text-[#BE3477]">
                  Final Build-Off
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#746873]">
                  Select your problem statement, access hints, develop your solution, and submit deployment deliverables.
                </p>
              </div>

              <div className="mt-8 flex items-center gap-2 text-sm font-bold text-[#BE3477]">
                <span>Enter Round 3</span>
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
              </div>
            </Link>
          </div>
        </section>

        <footer className="mt-12 border-t border-[#E7DCE4] pt-6 flex items-center justify-between text-xs text-[#746873]">
          <Link
            href="/"
            className="font-semibold text-[#746873] hover:text-[#BE3477] transition-colors"
          >
            ← Back to home
          </Link>
          <span>Blueprint to Live · Participant Portal</span>
        </footer>
      </div>
    </main>
  );
}

export default function ParticipantHubPage() {
  return (
    <Suspense fallback={<ParticipantHubFallback />}>
      <ParticipantHub />
    </Suspense>
  );
}
