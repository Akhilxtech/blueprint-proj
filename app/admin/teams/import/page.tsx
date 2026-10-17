
import CsvImportWizard from "./csv-import-wizard";

export default function ImportTeamsPage() {
  return (
    <section className="mx-auto max-w-5xl animate-fade-in-up">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-wider text-[#BE3477] dark:text-[#8B5CF6]">
          Administration
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-[#302630] dark:text-[#FAFAFA] sm:text-3xl">
          Import teams from CSV
        </h1>
        <p className="mt-1 text-sm text-[#4E404C] dark:text-[#A3A3A3]">
          Upload participant records, map the columns, validate the data, and
          review everything before importing it into the database.
        </p>
      </div>

      <div>
        <CsvImportWizard />
      </div>
    </section>
  );
}
