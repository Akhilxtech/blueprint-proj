
"use client";

import { authClient } from "@/lib/auth-client";
import Link from "next/link";

export default function NotRegisteredPage() {
  async function handleSignOut() {
    await authClient.signOut();
    window.location.replace("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 py-12 text-white">
      <section className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-8 text-center shadow-2xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-amber-400/10 text-2xl text-amber-400">
          !
        </div>

        <h1 className="text-2xl font-bold">Registration Not Found</h1>

        <p className="mt-4 leading-7 text-zinc-300">
          This Google account is not associated with an event registration.
          Please use the email address you registered with or contact the event
          organizers for assistance.
        </p>

        <button
          type="button"
          onClick={handleSignOut}
          className="mt-7 w-full rounded-lg bg-white px-4 py-3 font-semibold text-zinc-950 transition hover:bg-zinc-200"
        >
          Sign out and try another account
        </button>

        <Link
  href="/"
  className="mt-5 inline-block text-sm text-violet-400 hover:text-violet-300"
>
  Back to home
</Link>
      </section>
    </main>
  );
}
