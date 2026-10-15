
import { prisma } from "@/lib/db";
import AddParticipantForm from "./add-participant-form";

export default async function NewParticipantPage() {
  const teams = await prisma.team.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      _count: {
        select: { participants: true },
      },
    },
  });

  return (
    <section className="mx-auto max-w-3xl animate-fade-in-up">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-wider text-[#BE3477]">
          Administration
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-[#302630] sm:text-3xl">
          Add participant
        </h1>
        <p className="mt-1 text-sm text-[#4E404C]">
          Register a participant and assign them to a team.
        </p>
      </div>

      <div className="rounded-2xl border border-white/70 bg-white/70 p-6 shadow-sm backdrop-blur-md sm:p-8">
        <AddParticipantForm teams={teams} />
      </div>
    </section>
  );
}
