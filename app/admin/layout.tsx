
import { Suspense } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth-helper";
import SignOutButton from "@/components/sign-out-button";
import { connection } from "next/server";
export const instant=false;
const navigation = [
  { label: "Dashboard", href: "/admin" },
  { label: "Teams", href: "/admin/teams" },
  { label: "Questions", href: "/admin/questions" },
  { label: "Quiz Control", href: "/admin/quiz-control" },
  { label: "Monitor", href: "/admin/monitor" },
  { label: "Results", href: "/admin/results" },
  { label: "Round 2", href: "/admin/round-2" },
  { label: "Round 3", href: "/admin/round-3" },
];

async function AdminContent({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-zinc-950 text-white md:flex">
      <aside className="border-b border-white/10 bg-zinc-900 p-5 md:min-h-screen md:w-64 md:border-b-0 md:border-r">
        <Link href="/admin" className="text-xl font-bold">
          Blueprint to Live
        </Link>

        <p className="mt-2 text-sm text-zinc-400">Admin Console</p>

        <nav className="mt-8 grid grid-cols-2 gap-2 md:grid-cols-1">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/10 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-8">
          <SignOutButton />
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-6 md:p-10">
        {children}
      </main>
    </div>
  );
}

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await connection();
  await requireAdmin();
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <AdminContent>{children}</AdminContent>
    </Suspense>
  );
}


