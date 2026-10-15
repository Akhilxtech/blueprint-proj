import { prisma } from "@/lib/db";
import TeamsTable from "./teams-table";
import { connection } from "next/server";
import DeleteAllParticipantsButton from "@/components/admin/delete-all-participants-button";
import { getSettings } from "@/lib/settings";
import Link from "next/link";
import { Users, UserPlus, Upload, ShieldAlert } from "lucide-react";

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
    <section className="animate-fade-in-up">
      <div className="flex flex-col gap-4 border-b border-[#E7DCE4] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D9468D]">
            Administration
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[#302630]">
            Teams & Participants
          </h1>
          <p className="mt-1 text-sm text-[#4E404C]">
            Search teams, inspect roster details, manage warnings, and organize participants.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/admin/teams/import"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E7DCE4] bg-white/80 px-4 py-2 text-xs font-bold text-[#302630] shadow-xs backdrop-blur-sm transition hover:border-[#D9468D]/40 hover:bg-[#FAF6F8] hover:text-[#BE3477] active:scale-[0.98]"
          >
            <Upload className="size-3.5 text-[#BE3477]" />
            Import CSV
          </Link>
          <Link
            href="/admin/teams/new"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#BE3477] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#a62a66] active:scale-[0.98]"
          >
            <UserPlus className="size-3.5" />
            Add participant
          </Link>
          <DeleteAllParticipantsButton participantCount={participantCount} />
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="glass-panel rounded-3xl p-5 border border-white/80 shadow-xs">
          <p className="text-xs font-bold uppercase tracking-wider text-[#4E404C]">Total teams</p>
          <p className="mt-2 text-3xl font-extrabold text-[#302630]">{teams.length}</p>
        </div>

        <div className="glass-panel rounded-3xl p-5 border border-white/80 shadow-xs">
          <p className="text-xs font-bold uppercase tracking-wider text-[#4E404C]">Participants</p>
          <p className="mt-2 text-3xl font-extrabold text-[#302630]">{participantCount}</p>
        </div>

        <div className="glass-panel rounded-3xl p-5 border border-white/80 shadow-xs">
          <p className="text-xs font-bold uppercase tracking-wider text-[#4E404C]">Empty teams</p>
          <p className="mt-2 text-3xl font-extrabold text-[#BE3477]">
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
