
// import { redirect } from "next/navigation";
// import { getSession, requireAdmin, requireParticipant } from "@/lib/auth-helper";
// import { prisma } from "@/lib/db";
// import GoogleSignInButton from "@/components/google-sign-in-button";

// export const instant = false;

// export default async function HomePage() {
//   const session = await getSession();

//   if (session?.user) {
//     const adminEmails = new Set(
//       (process.env.ADMIN_EMAILS ?? "")
//         .split(",")
//         .map((email) => email.trim().toLowerCase())
//         .filter(Boolean),
//     );

//     if (adminEmails.has(session.user.email.trim().toLowerCase())) {
//       await requireAdmin();
//       redirect("/admin");
//     }

//     const participant = await prisma.participant.findFirst({
//       where: {
//         email: {
//           equals: session.user.email.trim().toLowerCase(),
//           mode: "insensitive",
//         },
//       },
//       select: { id: true },
//     });

//     if (participant) {
//       await requireParticipant();
//       redirect("/play");
//     }

//     redirect("/not-registered");
//   }

//   return (
//     <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 py-12 text-white">
//       <section className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-8 shadow-2xl">
//         <p className="mb-3 text-sm font-medium uppercase tracking-[0.25em] text-violet-400">
//           ISE Department Presents
//         </p>

//         <h1 className="text-4xl font-bold tracking-tight">
//           Blueprint to Live
//         </h1>

//         <p className="mt-4 leading-7 text-zinc-300">
//           Think through the problem. Design the solution. Bring your blueprint
//           to life.
//         </p>

//         <div className="my-7 rounded-xl border border-white/10 bg-white/5 p-4">
//           <p className="font-medium">Event Access</p>
//           <p className="mt-1 text-sm text-zinc-400">
//             Sign in with the Google account associated with your registration.
//           </p>
//         </div>

//         <GoogleSignInButton />

//         <p className="mt-5 text-center text-xs text-zinc-500">
//           Access is restricted to registered participants and event admins.
//         </p>
//       </section>
//     </main>
//   );
// }




import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getSession,
  requireAdmin,
  requireParticipant,
} from "@/lib/auth-helper";
import { prisma } from "@/lib/db";
import GoogleSignInButton from "@/components/google-sign-in-button";

export const instant = false;

export default async function HomePage() {
  const session = await getSession();

  // Preserve existing authenticated-user routing.
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
      redirect("/admin/teams");
    }

    const participant = await prisma.participant.findFirst({
      where: {
        email: {
          equals: email,
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

  // Public landing page for signed-out visitors.
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <Link href="/" className="text-xl font-bold tracking-tight">
            Blueprint to Live
          </Link>

          <nav
            aria-label="Main navigation"
            className="flex flex-wrap items-center gap-4 text-sm"
          >
            <Link
              href="/leaderboard"
              className="text-zinc-300 transition hover:text-white"
            >
              Leaderboard
            </Link>

            <Link
              href="/admin"
              className="text-zinc-300 transition hover:text-white"
            >
              Admin Panel
            </Link>
          </nav>
        </header>

        <section className="mx-auto max-w-3xl py-20 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-violet-400">
            ISE Department Presents
          </p>

          <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-6xl">
            Blueprint to Live
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
            Think through the problem. Design the solution. Bring your
            blueprint to life.
          </p>

          <div className="mx-auto mt-10 max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-6 text-left">
            <h2 className="text-lg font-semibold">Participant Access</h2>

            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Sign in using the Google account associated with your event
              registration.
            </p>

            <div className="mt-6">
              <GoogleSignInButton />
            </div>

            <p className="mt-4 text-xs leading-5 text-zinc-500">
              Access is restricted to registered participants and authorized
              event administrators.
            </p>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/leaderboard"
            className="rounded-xl border border-white/10 bg-zinc-900 p-5 transition hover:border-violet-400/50"
          >
            <h2 className="font-semibold">Leaderboard</h2>
            <p className="mt-2 text-sm text-zinc-400">
              View the published competition rankings.
            </p>
          </Link>

          <Link
            href="/admin"
            className="rounded-xl border border-white/10 bg-zinc-900 p-5 transition hover:border-violet-400/50"
          >
            <h2 className="font-semibold">Admin Panel</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Access the administration dashboard if authorized.
            </p>
          </Link>
        </section>

        <footer className="mt-16 border-t border-white/10 pt-6 text-center text-sm text-zinc-500">
          Blueprint to Live · Information Science and Engineering
        </footer>
      </div>
    </main>
  );
}
