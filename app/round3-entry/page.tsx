
import { redirect } from "next/navigation";
import { getSession, requireAdmin, requireParticipant } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";
import GoogleSignInButton from "@/components/google-sign-in-button";

export const instant = false;

export default async function Round3EntryPage() {
  const session = await getSession();

  if (session?.user) {
    const email = session.user.email.trim().toLowerCase();

    const adminEmails = new Set(
      (process.env.ADMIN_EMAILS ?? "")
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
    );

    if (adminEmails.has(email)) {
      await requireAdmin();
      redirect("/admin");
    }

    const participant = await prisma.participant.findFirst({
      where: {
        email: { equals: email, mode: "insensitive" },
      },
      select: { id: true },
    });

    if (participant) {
      await requireParticipant();
      redirect("/play/round3");
    }

    redirect("/not-registered");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 py-12 text-white">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-8">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-violet-400">
          Blueprint to Live
        </p>

        <h1 className="mt-4 text-3xl font-bold">Round 3 Access</h1>

        <p className="mt-4 leading-7 text-zinc-300">
          Sign in with the Google account associated with your event
          registration to continue to Round 3.
        </p>

        <div className="mt-7">
          <GoogleSignInButton callbackURL="/play/round3" />
        </div>

        <p className="mt-5 text-sm text-zinc-500">
          Only registered participants and authorized administrators can access
          protected event features.
        </p>

        <a
          href="/"
          className="mt-5 inline-block text-sm text-violet-400 hover:text-violet-300"
        >
          Back to home
        </a>
      </section>
    </main>
  );
}
