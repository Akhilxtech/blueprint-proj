import { Suspense } from "react";
import Link from "next/link";
import { requireParticipant } from "@/lib/auth-helper";
import Round3Client from "./round3-client";

function Round3Fallback() {
  return (
    <main className="min-h-screen bg-[#F7F2F5] px-6 py-12 text-[#302630]">
      <div className="mx-auto max-w-6xl animate-fade-in">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D9468D]">
          Blueprint to Live
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-[#302630]">
          Round 3: Final Build-Off
        </h1>
        <p className="mt-6 text-sm text-[#746873]">
          Loading your team information...
        </p>
      </div>
    </main>
  );
}

async function Round3Content() {
  const { participant, team } = await requireParticipant();

  if (!team.isFinalist) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F2F5] px-6 py-16 text-[#302630]">
        <div className="glass-panel mx-auto max-w-md w-full rounded-3xl p-8 text-center shadow-[0_20px_60px_rgba(78,40,62,0.08)] border border-white/80 animate-fade-in-up">
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#FCE7F1] text-[#BE3477] text-xl">
            🏆
          </span>
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.2em] text-[#D9468D]">
            Blueprint to Live
          </p>
          <h1 className="mt-2 text-2xl font-bold text-[#302630]">
            Thank you for participating!
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#746873]">
            Round 3 is available exclusively to finalist teams. Thank you for
            bringing your energy and skills to Blueprint to Live.
          </p>
          <Link
            href="/play"
            className="mt-6 inline-block w-full rounded-xl bg-[#BE3477] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#a62a66] active:scale-[0.98]"
          >
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <Round3Client
      participantName={participant.name}
      teamName={team.name}
    />
  );
}

export default function Round3Page() {
  return (
    <Suspense fallback={<Round3Fallback />}>
      <Round3Content />
    </Suspense>
  );
}
