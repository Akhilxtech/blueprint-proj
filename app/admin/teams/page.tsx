
import { prisma } from "@/lib/db";
import TeamsTable from "./teams-table";
import { connection } from "next/server"
import DeleteAllParticipantsButton from "@/components/admin/delete-all-participants-button";
import { getSettings } from "@/lib/settings";
export const instant = false;

export default async function TeamsPage() {
      await connection();
  const teams = await prisma.team.findMany({
    orderBy: { name: "asc" },
    include: {
      participants: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
          usn: true,
          phone: true,
          semester: true,
          branch: true,
        },
      },
    },
  });

  const settings = await getSettings();

const serializedTeams = teams.map((team) => ({
  id: team.id,
  name: team.name,
  members: team.participants,
  quizStatus: team.quizStatus,
  warningCount: team.warningCount,
  eliminatedAt: team.eliminatedAt?.toISOString() ?? null,
}));
  const participantCount = teams.reduce(
  (sum, team) => sum + team.participants.length,
  0,
);

  return (
    <section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between" >
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-violet-400">
            Administration
          </p>
          <h1 className="mt-3 text-3xl font-bold">Teams & Participants</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Search teams, review members, and manage empty teams.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <a
            href="/admin/teams/import"
            className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium hover:bg-white/10"
          >
            Import CSV
          </a>
          <a
            href="/admin/teams/new"
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-zinc-200"
          >
            Add participant
          </a>
                  <DeleteAllParticipantsButton participantCount={participantCount} />

        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-zinc-900 p-5">
          <p className="text-sm text-zinc-400">Total teams</p>
          <p className="mt-2 text-3xl font-bold">{teams.length}</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-zinc-900 p-5">
          <p className="text-sm text-zinc-400">Participants</p>
          <p className="mt-2 text-3xl font-bold">
            {teams.reduce((sum, team) => sum + team.participants.length, 0)}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-zinc-900 p-5">
          <p className="text-sm text-zinc-400">Empty teams</p>
          <p className="mt-2 text-3xl font-bold">
            {teams.filter((team) => team.participants.length === 0).length}
          </p>
        </div>
      </div>

      <div className="mt-8">
       <TeamsTable
  initialTeams={serializedTeams}
  maxWarnings={settings.maxWarnings}
/>
      </div>
    </section>
  );
}
