
import { Suspense } from "react";
import { requireParticipant } from "@/lib/auth-helper";
import Round3Client from "./round3-client";

function Round3Fallback() {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm text-violet-400">Blueprint to Live</p>
        <h1 className="mt-2 text-3xl font-bold">
          Round 3: Final Build-Off
        </h1>
        <p className="mt-6 text-zinc-400">
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
      <main className="min-h-screen bg-zinc-950 px-6 py-16 text-white">
        <div className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-zinc-900 p-8">
          <p className="text-sm text-violet-400">Blueprint to Live</p>
          <h1 className="mt-4 text-3xl font-bold">
            Thank you for participating!
          </h1>
          <p className="mt-4 leading-7 text-zinc-400">
            Round 3 is available only to finalist teams. Thank you for
            being part of the event.
          </p>
          <a
            href="/play"
            className="mt-6 inline-block rounded-lg bg-violet-600 px-5 py-3 font-medium hover:bg-violet-500"
          >
            Back to dashboard
          </a>
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
