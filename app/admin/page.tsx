
export default function AdminDashboardPage() {
  return (
    <section>
      <p className="text-sm font-medium uppercase tracking-widest text-violet-400">
        Administration
      </p>

      <h1 className="mt-3 text-3xl font-bold">Dashboard</h1>

      <p className="mt-3 max-w-2xl leading-7 text-zinc-400">
        Welcome to the Blueprint to Live admin console. Manage teams and
        prepare event rounds from the navigation menu.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[
          {
            title: "Teams",
            description: "Review registered teams and their members.",
          },
          {
            title: "Quiz Control",
            description: "A placeholder for future event controls.",
          },
          {
            title: "Results",
            description: "A placeholder for future results and reporting.",
          },
        ].map((item) => (
          <article
            key={item.title}
            className="rounded-xl border border-white/10 bg-zinc-900 p-5"
          >
            <h2 className="font-semibold">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              {item.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
