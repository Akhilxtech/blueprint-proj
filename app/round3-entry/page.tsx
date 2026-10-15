import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession, requireAdmin, requireParticipant } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";
import GoogleSignInButton from "@/components/google-sign-in-button";
import { Code2 } from "lucide-react";

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
    <main className="flex min-h-screen items-center justify-center bg-[#F7F2F5] px-6 py-12 text-[#302630]">
      <section className="glass-panel w-full max-w-md rounded-3xl p-8 shadow-[0_24px_80px_rgba(78,40,62,0.12)] border border-white/80 animate-fade-in-up">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-[#FCE7F1] text-[#BE3477]">
            <Code2 className="size-5" />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#D9468D]">
              Blueprint to Live
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-[#302630]">
              Round 3 Access
            </h1>
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-[#746873]">
          Sign in with the Google account associated with your finalist team registration to enter the Final Build-Off.
        </p>

        <div className="mt-6">
          <GoogleSignInButton callbackURL="/play/round3" />
        </div>

        <p className="mt-5 text-center text-xs leading-5 text-[#746873]/80">
          Only registered participants and authorized administrators can access protected event features.
        </p>

        <div className="mt-6 border-t border-[#E7DCE4] pt-4 text-center">
          <Link
            href="/"
            className="text-xs font-semibold text-[#746873] hover:text-[#BE3477] transition-colors"
          >
            ← Back to home
          </Link>
        </div>
      </section>
    </main>
  );
}
