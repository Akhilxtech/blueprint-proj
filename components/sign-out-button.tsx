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
      className="inline-flex items-center justify-center rounded-xl border border-[#E7DCE4] dark:border-[#292929] bg-white/70 dark:bg-[#171717] px-4 py-2 text-xs font-semibold text-[#4E404C] dark:text-[#FAFAFA] shadow-sm backdrop-blur-md transition-all duration-150 hover:border-[#D9468D]/40 dark:hover:border-[#8B5CF6]/50 hover:bg-white dark:hover:bg-[#202020] hover:text-[#BE3477] dark:hover:text-[#8B5CF6] hover:shadow active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9468D] dark:focus-visible:ring-[#8B5CF6]"
    >
      Sign out
    </button>
  );
}
