
// import { Suspense } from "react";
// import Link from "next/link";
// import { requireParticipant } from "@/lib/auth-helper";
// import { prisma } from "@/lib/db";
// import SignOutButton from "@/components/sign-out-button";
// import ParticipantQuiz from "./participant-quiz";

// function PlayPageFallback() {
//   return (
//     <main className="min-h-screen bg-zinc-950 px-6 py-12 text-white">
//       <div className="mx-auto max-w-3xl">
//         <p className="text-sm text-violet-400">Blueprint to Live</p>
//         <h1 className="mt-1 text-3xl font-bold">
//           Participant Dashboard
//         </h1>
//         <p className="mt-8 text-zinc-400">Loading your dashboard...</p>
//       </div>
//     </main>
//   );
// }

// async function ParticipantDashboard() {
//   const { session, participant, team } = await requireParticipant();

//   const teamMembers = await prisma.participant.findMany({
//     where: { teamId: participant.teamId },
//     select: { name: true, email: true },
//     orderBy: { name: "asc" },
//   });

//   return (
//     <main className="min-h-screen bg-zinc-950 px-6 py-12 text-white">
//       <div className="mx-auto max-w-3xl">
//         <header className="flex items-center justify-between gap-4">
//           <div>
//             <p className="text-sm text-violet-400">Blueprint to Live</p>
//             <h1 className="mt-1 text-3xl font-bold">
//               Participant Dashboard
//             </h1>
//           </div>
//           <SignOutButton />
//         </header>

//         <section className="mt-10 rounded-2xl border border-white/10 bg-zinc-900 p-6">
//           <p className="text-sm text-zinc-400">Welcome</p>
//           <h2 className="mt-2 text-2xl font-semibold">
//             {participant.name}
//           </h2>
//           <p className="mt-1 text-zinc-400">{session.user.email}</p>
//         </section>

//         <section className="mt-6 rounded-2xl border border-white/10 bg-zinc-900 p-6">
//           <p className="text-sm text-zinc-400">Your team</p>
//           <h2 className="mt-2 text-xl font-semibold">{team.name}</h2>

//           <ul className="mt-5 divide-y divide-white/10">
//             {teamMembers.map((member) => (
//               <li
//                 key={member.email}
//                 className="py-3 first:pt-0 last:pb-0"
//               >
//                 <p className="font-medium">{member.name}</p>
//                 <p className="mt-1 text-sm text-zinc-400">
//                   {member.email}
//                 </p>
//               </li>
//             ))}
//           </ul>
//         </section>

//         <ParticipantQuiz initialRulesAccepted={team.rulesAcceptedAt !== null} />

//         <p className="mt-8 text-sm text-zinc-500">
//           Event information and activities will appear here when they
//           are available.
//         </p>

//         <Link
//           href="/"
//           className="mt-4 inline-block text-sm text-violet-400 hover:text-violet-300"
//         >
//           Back to home
//         </Link>
//       </div>
//     </main>
//   );
// }

// export default function PlayPage() {
//   return (
//     <Suspense fallback={<PlayPageFallback />}>
//       <ParticipantDashboard />
//     </Suspense>
//   );
// }


import { Suspense } from "react";
import Link from "next/link";
import { requireParticipant } from "@/lib/auth-helper";
import SignOutButton from "@/components/sign-out-button";

export const instant = false;

function ParticipantHubFallback() {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold">Participant Dashboard</h1>
        <p className="mt-4 text-zinc-400">
          Loading your participant dashboard...
        </p>
      </div>
    </main>
  );
}

async function ParticipantHub() {
  const { session, participant, team } = await requireParticipant();

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-violet-400">Blueprint to Live</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              Participant Dashboard
            </h1>
            <p className="mt-2 text-zinc-400">
              Welcome, {participant.name}
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              {session.user.email}
            </p>
          </div>

          <SignOutButton />
        </header>

        <section className="mb-8 rounded-xl border border-white/10 bg-zinc-900 p-6">
          <p className="text-sm text-zinc-400">Your Team</p>
          <h2 className="mt-2 text-xl font-semibold">{team.name}</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Choose a round below to continue your event.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">Available Rounds</h2>

          <div className="grid gap-6 md:grid-cols-2">
            <Link
              href="/play/round1"
              className="rounded-xl border border-white/10 bg-zinc-900 p-6 transition hover:border-violet-400/50"
            >
              <p className="text-sm font-medium text-violet-400">ROUND 1</p>
              <h3 className="mt-2 text-xl font-bold">Warm-Up Rally</h3>
              <p className="mt-3 leading-6 text-zinc-400">
                Enter the quiz and answer the questions with your team.
              </p>
              <p className="mt-6 font-semibold">Enter Round 1 →</p>
            </Link>

            <Link
              href="/play/round3"
              className="rounded-xl border border-white/10 bg-zinc-900 p-6 transition hover:border-violet-400/50"
            >
              <p className="text-sm font-medium text-violet-400">ROUND 3</p>
              <h3 className="mt-2 text-xl font-bold">Final Build-Off</h3>
              <p className="mt-3 leading-6 text-zinc-400">
                Access your problem statement and work on your solution.
              </p>
              <p className="mt-6 font-semibold">Enter Round 3 →</p>
            </Link>
          </div>
        </section>

        <footer className="mt-10 border-t border-white/10 pt-6">
          <Link
            href="/"
            className="text-sm text-violet-400 hover:text-violet-300"
          >
            Back to home
          </Link>
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
