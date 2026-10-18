"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export default function DemoLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSigningIn(true);

    try {
      const result = await authClient.signIn.email({
        email: email.trim().toLowerCase(),
        password,
        callbackURL: "/admin/teams",
      });

      if (result.error) {
        setError("Sign-in failed. Check your demo credentials and try again.");
        return;
      }

      router.replace("/admin/teams");
      router.refresh();
    } catch {
      setError("Unable to sign in right now. Please try again.");
    } finally {
      setIsSigningIn(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <section className="w-full max-w-md rounded-3xl border border-[#E7DCE4] bg-white p-8 shadow-xl dark:border-[#292929] dark:bg-[#111111]">
        <Link
          href="/"
          className="text-sm font-medium text-[#BE3477] hover:underline dark:text-[#A78BFA]"
        >
          ← Back to home
        </Link>

        <div className="mt-8">
          <div className="mb-4 inline-flex rounded-xl bg-[#FCE7F1] px-3 py-2 text-sm font-semibold text-[#BE3477] dark:bg-[#8B5CF6]/15 dark:text-[#A78BFA]">
            Recruiter Preview
          </div>

          <h1 className="text-3xl font-bold tracking-tight">
            Demo account
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#746873] dark:text-[#A3A3A3]">
            Sign in to explore the Blueprint to Live admin dashboard using
            sample event data. Changes in this demo are separate from the live
            event database.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="demo-email" className="mb-2 block text-sm font-semibold">
              Email address
            </label>
            <input
              id="demo-email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-[#E7DCE4] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#D9468D] focus:ring-2 focus:ring-[#D9468D]/15 dark:border-[#292929] dark:bg-[#090909] dark:focus:border-[#8B5CF6]"
              placeholder="recruiter@example.com"
            />
          </div>

          <div>
            <label htmlFor="demo-password" className="mb-2 block text-sm font-semibold">
              Password
            </label>
            <input
              id="demo-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-[#E7DCE4] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#D9468D] focus:ring-2 focus:ring-[#D9468D]/15 dark:border-[#292929] dark:bg-[#090909] dark:focus:border-[#8B5CF6]"
              placeholder="Enter demo password"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSigningIn}
            className="flex w-full items-center justify-center rounded-xl bg-[#BE3477] px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#A92B68] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D9468D] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#7C3AED] dark:hover:bg-[#6D28D9] dark:focus-visible:ring-[#8B5CF6]"
          >
            {isSigningIn ? "Signing in..." : "Sign in to demo"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs leading-5 text-[#746873] dark:text-[#A3A3A3]">
          Demo access only. Account creation is disabled.
        </p>
      </section>
    </main>
  );
}
