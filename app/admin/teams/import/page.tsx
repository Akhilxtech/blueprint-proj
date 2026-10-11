
import CsvImportWizard from "./csv-import-wizard";

export default function ImportTeamsPage() {
  return (
    <section className="mx-auto max-w-5xl">
      <p className="text-sm font-medium uppercase tracking-widest text-violet-400">
        Administration
      </p>

      <h1 className="mt-3 text-3xl font-bold">Import teams from CSV</h1>

      <p className="mt-2 text-sm text-zinc-400">
        Upload participant records, map the columns, validate the data, and
        review everything before importing it into the database.
      </p>

      <div className="mt-8">
        <CsvImportWizard />
      </div>
    </section>
  );
}
