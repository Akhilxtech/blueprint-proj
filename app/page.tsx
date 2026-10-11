
import { redirect } from "next/navigation";
import { getSession, requireAdmin, requireParticipant } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";
import GoogleSignInButton from "@/components/google-sign-in-button";

export const instant = false;

export default async function HomePage() {
  const session = await getSession();

  if (session?.user) {
    const adminEmails = new Set(
      (process.env.ADMIN_EMAILS ?? "")
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    );

    if (adminEmails.has(session.user.email.trim().toLowerCase())) {
      await requireAdmin();
      redirect("/admin");
    }

    const participant = await prisma.participant.findFirst({
      where: {
        email: {
          equals: session.user.email.trim().toLowerCase(),
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    if (participant) {
      await requireParticipant();
      redirect("/play");
    }

    redirect("/not-registered");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 py-12 text-white">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-8 shadow-2xl">
        <p className="mb-3 text-sm font-medium uppercase tracking-[0.25em] text-violet-400">
          ISE Department Presents
        </p>

        <h1 className="text-4xl font-bold tracking-tight">
          Blueprint to Live
        </h1>

        <p className="mt-4 leading-7 text-zinc-300">
          Think through the problem. Design the solution. Bring your blueprint
          to life.
        </p>

        <div className="my-7 rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="font-medium">Event Access</p>
          <p className="mt-1 text-sm text-zinc-400">
            Sign in with the Google account associated with your registration.
          </p>
        </div>

        <GoogleSignInButton />

        <p className="mt-5 text-center text-xs text-zinc-500">
          Access is restricted to registered participants and event admins.
        </p>
      </section>
    </main>
  );
}
