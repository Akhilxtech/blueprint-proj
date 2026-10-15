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
      className="inline-flex items-center justify-center rounded-xl border border-[#E7DCE4] bg-white/70 px-4 py-2 text-xs font-semibold text-[#4E404C] shadow-sm backdrop-blur-md transition-all duration-150 hover:border-[#D9468D]/40 hover:bg-white hover:text-[#BE3477] hover:shadow active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9468D]"
    >
      Sign out
    </button>
  );
}
