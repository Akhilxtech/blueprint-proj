import Link from "next/link";
import { requireParticipant } from "@/lib/auth-helper";

import SignOutButton from "@/components/sign-out-button";

export default async function PlayPage() {
  const { session, participant, team } = await requireParticipant();

  const teamMembers = await import("@/lib/db").then(({ prisma }) =>
    prisma.participant.findMany({
      where: { teamId: participant.teamId },
      select: { name: true, email: true },
      orderBy: { name: "asc" },
    }),
  );

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-violet-400">Blueprint to Live</p>
            <h1 className="mt-1 text-3xl font-bold">Participant Dashboard</h1>
          </div>
          <SignOutButton />
        </header>

        <section className="mt-10 rounded-2xl border border-white/10 bg-zinc-900 p-6">
          <p className="text-sm text-zinc-400">Welcome</p>
          <h2 className="mt-2 text-2xl font-semibold">
            {participant.name}
          </h2>
          <p className="mt-1 text-zinc-400">{session.user.email}</p>
        </section>

        <section className="mt-6 rounded-2xl border border-white/10 bg-zinc-900 p-6">
          <p className="text-sm text-zinc-400">Your team</p>
          <h2 className="mt-2 text-xl font-semibold">{team.name}</h2>

          <ul className="mt-5 divide-y divide-white/10">
            {teamMembers.map((member) => (
              <li
                key={member.email}
                className="py-3 first:pt-0 last:pb-0"
              >
                <p className="font-medium">{member.name}</p>
                <p className="mt-1 text-sm text-zinc-400">{member.email}</p>
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-8 text-sm text-zinc-500">
          Event information and activities will appear here when they are
          available.
        </p>

        <Link
          href="/"
          className="mt-4 inline-block text-sm text-violet-400 hover:text-violet-300"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
