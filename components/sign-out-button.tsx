
"use client";

import { authClient } from "@/lib/auth-client";

export default function SignOutButton() {
  async function handleSignOut() {
    await authClient.signOut();
    window.location.replace("/");
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium transition hover:bg-white/10"
    >
      Sign out
    </button>
  );
}
