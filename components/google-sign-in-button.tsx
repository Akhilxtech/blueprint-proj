"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

type GoogleSignInButtonProps = {
  callbackURL?: string;
};

export default function GoogleSignInButton({
  callbackURL = "/",
}: GoogleSignInButtonProps) {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState("");

  async function handleGoogleSignIn() {
    setIsSigningIn(true);
    setError("");

    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL,
        errorCallbackURL: "/not-registered",
      });
    } catch {
      setError("Sign-in failed. Please try again.");
      setIsSigningIn(false);
    }
  }

  return (
    <div className="w-full">
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isSigningIn}
        className="group relative flex w-full items-center justify-center gap-3 rounded-xl border border-[#E7DCE4] bg-white px-5 py-3.5 font-semibold text-[#302630] shadow-sm transition-all duration-200 hover:border-[#D9468D]/40 hover:bg-[#FAF6F8] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9468D] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSigningIn ? (
          <span className="flex items-center gap-2 text-sm text-[#746873]">
            <span
              aria-hidden="true"
              className="size-4 animate-spin rounded-full border-2 border-[#BE3477] border-t-transparent"
            />
            Redirecting to Google...
          </span>
        ) : (
          <>
            <svg
              className="size-5 shrink-0 transition-transform duration-200 group-hover:scale-105"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                fill="#EA4335"
              />
            </svg>
            <span className="text-sm font-semibold tracking-tight text-[#302630]">
              Continue with Google
            </span>
          </>
        )}
      </button>
    </div>
  );
}
