"use client";

import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

export default function NotRegisteredPage() {
  async function handleSignOut() {
    await authClient.signOut();
    window.location.replace("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F2F5] px-6 py-12 text-[#302630]">
      <section className="glass-panel w-full max-w-md rounded-3xl p-8 text-center shadow-[0_24px_80px_rgba(78,40,62,0.12)] border border-white/80 animate-fade-in-up">
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600">
          <AlertCircle className="size-8" />
        </div>

        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D9468D]">
          Notice
        </p>

        <h1 className="mt-2 text-2xl font-bold text-[#302630]">
          Registration Not Found
        </h1>

        <p className="mt-3 text-sm leading-6 text-[#746873]">
          This Google account is not associated with an event registration.
          Please sign in with the email address your team registered with or contact the ISE event organizers for assistance.
        </p>

        <button
          type="button"
          onClick={handleSignOut}
          className="mt-6 w-full rounded-xl bg-[#BE3477] px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-[#a62a66] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9468D]"
        >
          Sign out and try another account
        </button>

        <Link
          href="/"
          className="mt-5 inline-block text-xs font-semibold text-[#746873] hover:text-[#BE3477] transition-colors"
        >
          ← Back to home
        </Link>
      </section>
    </main>
  );
}
