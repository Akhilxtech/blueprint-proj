
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
    <section className="mx-auto max-w-3xl">
      <p className="text-sm font-medium uppercase tracking-widest text-violet-400">
        Administration
      </p>

      <h1 className="mt-3 text-3xl font-bold">
        Add participant
      </h1>

      <p className="mt-2 text-sm text-zinc-400">
        Register a participant and assign them to a team.
      </p>

      <div className="mt-8 rounded-2xl border border-white/10 bg-zinc-900 p-6 sm:p-8">
        <AddParticipantForm teams={teams} />
      </div>
    </section>
  );
}
