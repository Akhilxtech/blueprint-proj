
"use client";

import { useCallback, useEffect, useState } from "react";
import Papa from "papaparse";

type Hint = {
  title: string;
  content: string;
};

type Statement = {
  id: string;
  title: string;
  domain: string;
  difficulty: string;
  shortDescription: string;
  description: string;
  constraints: string;
  deliverables: string;
  maxTeams: number | null;
  enabled: boolean;
  displayOrder: number;
  hints: Hint[];
  _count?: { selections: number };
};

type StatementForm = Omit<Statement, "id" | "_count">;

const emptyForm: StatementForm = {
  title: "",
  domain: "",
  difficulty: "Medium",
  shortDescription: "",
  description: "",
  constraints: "",
  deliverables: "",
  maxTeams: null,
  enabled: true,
  displayOrder: 0,
  hints: [],
};

const csvFields = [
  "title",
  "domain",
  "difficulty",
  "shortDescription",
  "description",
  "constraints",
  "deliverables",
  "maxTeams",
  "enabled",
  "displayOrder",
  "hints",
];

const sampleRow = {
  title: "Smart Campus Assistant",
  domain: "Education",
  difficulty: "Medium",
  shortDescription: "Build a helpful campus information application.",
  description:
    "Create an application that helps students find campus information and services.",
  constraints: "The application must be usable on mobile devices.",
  deliverables:
    "Working application; README; deployment URL",
  maxTeams: "",
  enabled: "true",
  displayOrder: "1",
  hints: JSON.stringify([
    {
      title: "Hint 1",
      content: "Identify the most important user journeys first.",
    },
  ]),
};

const inputClass =
  "w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-500";
const buttonClass =
  "rounded-lg border border-white/10 px-4 py-2 text-sm hover:bg-white/5 disabled:opacity-50";

function downloadCsvTemplate() {
  const csv = Papa.unparse({
    fields: csvFields,
    data: [sampleRow],
  });

  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8;" }),
  );

  const link = document.createElement("a");
  link.href = url;
  link.download = "round3-problem-statements-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function validateCsvRows(rows: Record<string, unknown>[]) {
  const errors: string[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;

    for (const field of [
      "title",
      "domain",
      "difficulty",
      "shortDescription",
      "description",
      "constraints",
      "deliverables",
    ]) {
      if (
        typeof row[field] !== "string" ||
        !String(row[field]).trim()
      ) {
        errors.push(`Row ${rowNumber}: ${field} is required.`);
      }
    }

    if (
      row.maxTeams !== undefined &&
      String(row.maxTeams).trim() !== "" &&
      (!Number.isInteger(Number(row.maxTeams)) ||
        Number(row.maxTeams) < 1)
    ) {
      errors.push(
        `Row ${rowNumber}: maxTeams must be a positive integer or empty.`,
      );
    }

    if (
      row.displayOrder !== undefined &&
      String(row.displayOrder).trim() !== "" &&
      (!Number.isInteger(Number(row.displayOrder)) ||
        Number(row.displayOrder) < 0)
    ) {
      errors.push(
        `Row ${rowNumber}: displayOrder must be a non-negative integer.`,
      );
    }

    if (
      row.enabled !== undefined &&
      !["true", "false", ""].includes(
        String(row.enabled).trim().toLowerCase(),
      )
    ) {
      errors.push(
        `Row ${rowNumber}: enabled must be true or false.`,
      );
    }

    if (row.hints !== undefined && String(row.hints).trim()) {
      try {
        const hints: unknown = JSON.parse(String(row.hints));

        if (
          !Array.isArray(hints) ||
          !hints.every(
            (hint) =>
              hint &&
              typeof hint.title === "string" &&
              hint.title.trim() &&
              typeof hint.content === "string" &&
              hint.content.trim(),
          )
        ) {
          errors.push(
            `Row ${rowNumber}: hints must be a JSON array of objects containing title and content.`,
          );
        }
      } catch {
        errors.push(
          `Row ${rowNumber}: hints contains invalid JSON.`,
        );
      }
    }
  });

  return errors;
}

function convertCsvRow(row: Record<string, unknown>, index: number) {
  let hints: Hint[] = [];

  if (row.hints && String(row.hints).trim()) {
    hints = JSON.parse(String(row.hints)) as Hint[];
  }

  return {
    title: String(row.title ?? "").trim(),
    domain: String(row.domain ?? "").trim(),
    difficulty: String(row.difficulty ?? "").trim(),
    shortDescription: String(row.shortDescription ?? "").trim(),
    description: String(row.description ?? "").trim(),
    constraints: String(row.constraints ?? "").trim(),
    deliverables: String(row.deliverables ?? "").trim(),
    maxTeams:
      row.maxTeams === undefined || String(row.maxTeams).trim() === ""
        ? null
        : Number(row.maxTeams),
    enabled:
      row.enabled === undefined || String(row.enabled).trim() === ""
        ? true
        : String(row.enabled).trim().toLowerCase() === "true",
    displayOrder:
      row.displayOrder === undefined ||
      String(row.displayOrder).trim() === ""
        ? index
        : Number(row.displayOrder),
    hints,
  };
}

export default function StatementsManager() {
  const [statements, setStatements] = useState<Statement[]>([]);
  const [form, setForm] = useState<StatementForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [csvRows, setCsvRows] = useState<Record<string, unknown>[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);

  const loadStatements = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/round3/statements", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Could not load statements.");
      }

      setStatements(data.statements);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load statements.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
  const initial = window.setTimeout(() => {
    void loadStatements();
  }, 0);

  const interval = window.setInterval(() => {
    void loadStatements();
  }, 5000);

  return () => {
    window.clearTimeout(initial);
    window.clearInterval(interval);
  };
}, [loadStatements]);

  function updateForm<K extends keyof StatementForm>(
    key: K,
    value: StatementForm[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setForm({ ...emptyForm, hints: [] });
    setEditingId(null);
  }

  function editStatement(statement: Statement) {
    setEditingId(statement.id);
    setForm({
      title: statement.title,
      domain: statement.domain,
      difficulty: statement.difficulty,
      shortDescription: statement.shortDescription,
      description: statement.description,
      constraints: statement.constraints,
      deliverables: statement.deliverables,
      maxTeams: statement.maxTeams,
      enabled: statement.enabled,
      displayOrder: statement.displayOrder,
      hints: statement.hints.map((hint) => ({
        title: hint.title,
        content: hint.content,
      })),
    });

    document
      .getElementById("round3-statement-form")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function saveStatement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        editingId
          ? `/api/admin/round3/statements/${editingId}`
          : "/api/admin/round3/statements",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Could not save statement.");
      }

      setMessage(
        editingId
          ? "Problem statement updated."
          : "Problem statement created.",
      );

      resetForm();
      await loadStatements();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save statement.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteStatement(statement: Statement) {
    if (statement._count?.selections) {
      setError(
        "This statement has selected teams. Reset or reassign those selections before deleting it.",
      );
      return;
    }

    if (
      !window.confirm(
        `Delete "${statement.title}" permanently? Its deliverable progress will also be deleted.`,
      )
    ) {
      return;
    }

    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/round3/statements/${statement.id}`,
        { method: "DELETE" },
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Could not delete statement.");
      }

      setMessage("Problem statement deleted.");
      await loadStatements();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not delete statement.",
      );
    }
  }

  async function deleteAllStatements() {
    if (!statements.length) {
      setError("There are no problem statements to delete.");
      return;
    }

    const confirmed = window.confirm(
      "Delete ALL problem statements? This also deletes every team's Round 3 selection and all deliverable progress. Teams, participants, and deployment submissions will remain. This cannot be undone.",
    );

    if (!confirmed) return;

    const typedConfirmation = window.prompt(
      'Type DELETE ALL to confirm deletion of all problem statements and Round 3 selections.',
    );

    if (typedConfirmation !== "DELETE ALL") return;

    setError("");
    setMessage("");

    try {
      const response = await fetch(
        "/api/admin/round3/statements?confirm=delete-all",
        { method: "DELETE" },
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Bulk deletion failed.");
      }

      resetForm();
      setMessage(
        `Deleted ${data.statementsDeleted} statements, ${data.selectionsDeleted} selections, and ${data.progressDeleted} progress records.`,
      );

      await loadStatements();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Bulk deletion failed.",
      );
    }
  }

  async function handleCsvFile(file?: File) {
    setCsvRows([]);
    setCsvErrors([]);
    setError("");
    setMessage("");

    if (!file) return;

    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      complete(results) {
        const parsedRows = results.data;
const parseErrors = results.errors.map(
  (item) =>
    `CSV line ${(item.row ?? 0) + 2}: ${item.message}`,
);

        const fields = results.meta.fields ?? [];
        const missingFields = csvFields.filter(
          (field) => !fields.includes(field),
        );

        if (missingFields.length) {
          parseErrors.push(
            `Missing CSV columns: ${missingFields.join(", ")}.`,
          );
        }

        if (parsedRows.length > 5000) {
          parseErrors.push("A maximum of 5,000 rows can be imported at once.");
        }

        if (!parsedRows.length) {
          parseErrors.push("The CSV file contains no data rows.");
        }

        parseErrors.push(...validateCsvRows(parsedRows));

        setCsvRows(parsedRows);
        setCsvErrors(parseErrors);
      },
      error(parseError) {
        setCsvErrors([parseError.message]);
      },
    });
  }

  async function importCsv() {
    if (csvErrors.length || !csvRows.length) return;

    if (
      !window.confirm(
        `Import ${csvRows.length} problem statements? These will be added to the existing statements; existing statements will not be replaced.`,
      )
    ) {
      return;
    }

    setImporting(true);
    setError("");
    setMessage("");

    try {
      const statementsToImport = csvRows.map(convertCsvRow);

      const response = await fetch(
        "/api/admin/round3/statements/import",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ statements: statementsToImport }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "CSV import failed.");
      }

      setMessage(`Successfully imported ${data.imported} statements.`);
      setCsvRows([]);
      setCsvErrors([]);
      await loadStatements();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "CSV import failed.",
      );
    } finally {
      setImporting(false);
    }
  }

  function addHint() {
    updateForm("hints", [
      ...form.hints,
      { title: `Hint ${form.hints.length + 1}`, content: "" },
    ]);
  }

  function updateHint(
    index: number,
    field: keyof Hint,
    value: string,
  ) {
    updateForm(
      "hints",
      form.hints.map((hint, hintIndex) =>
        hintIndex === index ? { ...hint, [field]: value } : hint,
      ),
    );
  }

  function removeHint(index: number) {
    updateForm(
      "hints",
      form.hints.filter((_, hintIndex) => hintIndex !== index),
    );
  }

  return (
    <div className="mt-10 space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Problem Statements</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Create, edit, import, and manage Round 3 problem statements and hints.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
        >
          {error}
          <button
            type="button"
            className="ml-3 underline"
            onClick={() => setError("")}
          >
            Dismiss
          </button>
        </div>
      )}

      {message && (
        <p role="status" className="text-sm text-emerald-400">
          {message}
        </p>
      )}

      <section
        id="round3-statement-form"
        className="rounded-2xl border border-white/10 bg-zinc-900 p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">
            {editingId ? "Edit problem statement" : "Create problem statement"}
          </h3>

          {editingId && (
            <button type="button" className={buttonClass} onClick={resetForm}>
              Cancel editing
            </button>
          )}
        </div>

        <form onSubmit={saveStatement} className="mt-5 space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span>Title *</span>
              <input
                required
                className={inputClass}
                value={form.title}
                onChange={(event) => updateForm("title", event.target.value)}
              />
            </label>

            <label className="space-y-2 text-sm">
              <span>Domain *</span>
              <input
                required
                className={inputClass}
                placeholder="Education, Healthcare, Finance..."
                value={form.domain}
                onChange={(event) => updateForm("domain", event.target.value)}
              />
            </label>

            <label className="space-y-2 text-sm">
              <span>Difficulty *</span>
              <select
                required
                className={inputClass}
                value={form.difficulty}
                onChange={(event) =>
                  updateForm("difficulty", event.target.value)
                }
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Hard">Hard</option>
              </select>
            </label>

            <label className="space-y-2 text-sm">
              <span>Maximum teams (blank = unlimited)</span>
              <input
                type="number"
                min={1}
                className={inputClass}
                value={form.maxTeams ?? ""}
                onChange={(event) =>
                  updateForm(
                    "maxTeams",
                    event.target.value ? Number(event.target.value) : null,
                  )
                }
              />
            </label>

            <label className="space-y-2 text-sm">
              <span>Display order</span>
              <input
                type="number"
                min={0}
                className={inputClass}
                value={form.displayOrder}
                onChange={(event) =>
                  updateForm("displayOrder", Number(event.target.value))
                }
              />
            </label>

            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(event) =>
                  updateForm("enabled", event.target.checked)
                }
              />
              Statement enabled for selection
            </label>
          </div>

          <label className="block space-y-2 text-sm">
            <span>Short description *</span>
            <textarea
              required
              rows={2}
              className={inputClass}
              value={form.shortDescription}
              onChange={(event) =>
                updateForm("shortDescription", event.target.value)
              }
            />
          </label>

          <label className="block space-y-2 text-sm">
            <span>Full description *</span>
            <textarea
              required
              rows={5}
              className={inputClass}
              value={form.description}
              onChange={(event) =>
                updateForm("description", event.target.value)
              }
            />
          </label>

          <label className="block space-y-2 text-sm">
            <span>Constraints *</span>
            <textarea
              required
              rows={3}
              className={inputClass}
              value={form.constraints}
              onChange={(event) =>
                updateForm("constraints", event.target.value)
              }
            />
          </label>

          <label className="block space-y-2 text-sm">
            <span>Deliverables *</span>
            <textarea
              required
              rows={3}
              className={inputClass}
              value={form.deliverables}
              onChange={(event) =>
                updateForm("deliverables", event.target.value)
              }
            />
          </label>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h4 className="font-semibold">Hints</h4>
              <button type="button" className={buttonClass} onClick={addHint}>
                Add hint
              </button>
            </div>

            {form.hints.map((hint, index) => (
              <div
                key={index}
                className="space-y-3 rounded-xl border border-white/10 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">Hint {index + 1}</span>
                  <button
                    type="button"
                    className="text-sm text-red-300 hover:text-red-200"
                    onClick={() => removeHint(index)}
                  >
                    Remove
                  </button>
                </div>

                <input
                  className={inputClass}
                  required
                  placeholder="Hint title"
                  value={hint.title}
                  onChange={(event) =>
                    updateHint(index, "title", event.target.value)
                  }
                />

                <textarea
                  className={inputClass}
                  required
                  rows={2}
                  placeholder="Hint content"
                  value={hint.content}
                  onChange={(event) =>
                    updateHint(index, "content", event.target.value)
                  }
                />
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold hover:bg-violet-500 disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : editingId
                ? "Save changes"
                : "Create statement"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-zinc-900 p-6">
        <h3 className="text-lg font-semibold">CSV import</h3>
        <p className="mt-2 text-sm text-zinc-400">
          Download the template, fill in your statements, then preview and
          validate the CSV before importing. The import is additive.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            className={buttonClass}
            onClick={downloadCsvTemplate}
          >
            Download CSV template
          </button>

          <label className="cursor-pointer rounded-lg border border-white/10 px-4 py-2 text-sm hover:bg-white/5">
            Choose CSV file
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(event) => {
                void handleCsvFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </label>
        </div>

        {csvRows.length > 0 && (
          <div className="mt-5 space-y-3">
            <p className="text-sm">
              Preview: {csvRows.length} statement(s)
            </p>

            {csvErrors.length > 0 ? (
              <div className="max-h-64 space-y-2 overflow-auto rounded-xl border border-red-500/30 bg-red-500/5 p-4">
                <p className="font-semibold text-red-300">
                  Fix these problems before importing:
                </p>
                {csvErrors.map((item, index) => (
                  <p key={index} className="text-sm text-red-200">
                    {item}
                  </p>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="bg-zinc-950 text-zinc-400">
                    <tr>
                      <th className="p-3">Title</th>
                      <th className="p-3">Domain</th>
                      <th className="p-3">Difficulty</th>
                      <th className="p-3">Max teams</th>
                      <th className="p-3">Hints</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvRows.slice(0, 10).map((row, index) => {
                      let hintCount = 0;

                      try {
                        hintCount = row.hints
                          ? JSON.parse(String(row.hints)).length
                          : 0;
                      } catch {
                        hintCount = 0;
                      }

                      return (
                        <tr
                          key={index}
                          className="border-t border-white/10"
                        >
                          <td className="p-3">{String(row.title ?? "")}</td>
                          <td className="p-3">{String(row.domain ?? "")}</td>
                          <td className="p-3">
                            {String(row.difficulty ?? "")}
                          </td>
                          <td className="p-3">
                            {String(row.maxTeams ?? "") || "Unlimited"}
                          </td>
                          <td className="p-3">{hintCount}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {csvRows.length > 10 && (
                  <p className="p-3 text-xs text-zinc-400">
                    Showing first 10 rows of {csvRows.length}.
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={importing || csvErrors.length > 0}
                onClick={() => void importCsv()}
                className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold hover:bg-violet-500 disabled:opacity-50"
              >
                {importing
                  ? "Importing..."
                  : `Import ${csvRows.length} statement(s)`}
              </button>

              <button
                type="button"
                className={buttonClass}
                disabled={importing}
                onClick={() => {
                  setCsvRows([]);
                  setCsvErrors([]);
                }}
              >
                Clear preview
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-zinc-900 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Existing statements</h3>
            <p className="mt-1 text-sm text-zinc-400">
              {statements.length} statement(s)
            </p>
          </div>

          <button
            type="button"
            className="rounded-lg border border-red-500/30 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-50"
            disabled={!statements.length}
            onClick={() => void deleteAllStatements()}
          >
            Delete all problem statements
          </button>
        </div>

        {loading ? (
          <p className="mt-5 text-sm text-zinc-400">Loading statements...</p>
        ) : statements.length === 0 ? (
          <p className="mt-5 text-sm text-zinc-400">
            No problem statements have been created.
          </p>
        ) : (
          <div className="mt-5 space-y-3">
            {statements.map((statement) => (
              <article
                key={statement.id}
                className="rounded-xl border border-white/10 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold">{statement.title}</h4>
                    <p className="mt-1 text-sm text-zinc-400">
                      {statement.domain} · {statement.difficulty}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">
                      {statement.shortDescription}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-zinc-800 px-2.5 py-1">
                        {statement._count?.selections ?? 0} selected team(s)
                      </span>
                      <span className="rounded-full bg-zinc-800 px-2.5 py-1">
                        {statement.hints.length} hint(s)
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 ${
                          statement.enabled
                            ? "bg-emerald-500/10 text-emerald-300"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {statement.enabled ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={buttonClass}
                      onClick={() => editStatement(statement)}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      disabled={(statement._count?.selections ?? 0) > 0}
                      title={
                        (statement._count?.selections ?? 0) > 0
                          ? "Reset or reassign its teams first."
                          : "Delete statement"
                      }
                      className="rounded-lg border border-red-500/30 px-3 py-2 text-sm text-red-300 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={() => void deleteStatement(statement)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
