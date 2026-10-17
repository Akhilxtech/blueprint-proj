"use client";

import { useCallback, useEffect, useState } from "react";
import Papa from "papaparse";
import ConfirmDialog from "@/components/confirm-dialog";

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

type DialogState = {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
};

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
  deliverables: "Working application; README; deployment URL",
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
  "w-full rounded-xl border border-neutral-light bg-white px-3.5 py-2 text-sm text-foreground placeholder:text-muted outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-[#292929] dark:bg-[#171717] dark:text-[#FAFAFA] dark:placeholder:text-[#A3A3A3] dark:focus:border-[#8B5CF6] dark:focus:ring-[#8B5CF6]/20";
const buttonClass =
  "rounded-xl border border-neutral-light bg-white px-4 py-2 text-sm font-semibold text-foreground shadow-2xs transition hover:bg-neutral-50 active:scale-[0.98] disabled:opacity-50 dark:border-[#292929] dark:bg-[#171717] dark:text-[#FAFAFA] dark:hover:bg-[#202020]";

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
      if (typeof row[field] !== "string" || !String(row[field]).trim()) {
        errors.push(`Row ${rowNumber}: ${field} is required.`);
      }
    }

    if (
      row.maxTeams !== undefined &&
      String(row.maxTeams).trim() !== "" &&
      (!Number.isInteger(Number(row.maxTeams)) || Number(row.maxTeams) < 1)
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
      !["true", "false", ""].includes(String(row.enabled).trim().toLowerCase())
    ) {
      errors.push(`Row ${rowNumber}: enabled must be true or false.`);
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
        errors.push(`Row ${rowNumber}: hints contains invalid JSON.`);
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
      row.displayOrder === undefined || String(row.displayOrder).trim() === ""
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

  // Modal dialog states
  const [confirmState, setConfirmState] = useState<DialogState>({
    open: false,
    title: "",
    description: null,
    confirmLabel: "Confirm",
    onConfirm: () => {},
  });

  const [deleteAllModalOpen, setDeleteAllModalOpen] = useState(false);
  const [typedConfirmation, setTypedConfirmation] = useState("");
  const [deletingAll, setDeletingAll] = useState(false);

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

  function handleDeleteStatement(statement: Statement) {
    if (statement._count?.selections) {
      setError(
        "This statement has selected teams. Reset or reassign those selections before deleting it.",
      );
      return;
    }

    setConfirmState({
      open: true,
      title: `Delete "${statement.title}"`,
      description: `Delete "${statement.title}" permanently? Its deliverable progress will also be cleared.`,
      confirmLabel: "Delete Statement",
      destructive: true,
      onConfirm: () => {
        setConfirmState((prev) => ({ ...prev, open: false }));
        void executeDeleteStatement(statement.id);
      },
    });
  }

  async function executeDeleteStatement(statementId: string) {
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/round3/statements/${statementId}`,
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

  function openDeleteAllModal() {
    if (!statements.length) {
      setError("There are no problem statements to delete.");
      return;
    }
    setTypedConfirmation("");
    setDeleteAllModalOpen(true);
  }

  async function executeDeleteAllStatements() {
    if (typedConfirmation !== "DELETE ALL") return;

    setDeletingAll(true);
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
      setDeleteAllModalOpen(false);
      setMessage(
        `Deleted ${data.statementsDeleted} statements, ${data.selectionsDeleted} selections, and ${data.progressDeleted} progress records.`,
      );

      await loadStatements();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Bulk deletion failed.",
      );
    } finally {
      setDeletingAll(false);
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
          (item) => `CSV line ${(item.row ?? 0) + 2}: ${item.message}`,
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

  function handleImportCsv() {
    if (csvErrors.length || !csvRows.length) return;

    setConfirmState({
      open: true,
      title: "Import Problem Statements",
      description: `Import ${csvRows.length} problem statements? These will be added to existing statements. Existing statements will not be replaced.`,
      confirmLabel: `Import ${csvRows.length} Statements`,
      destructive: false,
      onConfirm: () => {
        setConfirmState((prev) => ({ ...prev, open: false }));
        void executeImportCsv();
      },
    });
  }

  async function executeImportCsv() {
    setImporting(true);
    setError("");
    setMessage("");

    try {
      const statementsToImport = csvRows.map(convertCsvRow);

      const response = await fetch("/api/admin/round3/statements/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statements: statementsToImport }),
      });

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

  function updateHint(index: number, field: keyof Hint, value: string) {
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
    <div className="mt-8 space-y-8">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Problem Statements
        </h2>
        <p className="mt-1 text-sm text-muted">
          Create, edit, import, and manage Round 3 problem statements, constraints, deliverables, and hints.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-center justify-between dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300"
        >
          <span>{error}</span>
          <button
            type="button"
            className="text-xs font-semibold text-red-700 underline hover:no-underline ml-3 dark:text-red-400"
            onClick={() => setError("")}
          >
            Dismiss
          </button>
        </div>
      )}

      {message && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          {message}
        </div>
      )}

      {/* Statement Form */}
      <section id="round3-statement-form" className="glass-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-light dark:border-[#292929] pb-4">
          <h3 className="text-lg font-bold tracking-tight text-foreground">
            {editingId ? "Edit Problem Statement" : "Create Problem Statement"}
          </h3>

          {editingId && (
            <button type="button" className={buttonClass} onClick={resetForm}>
              Cancel editing
            </button>
          )}
        </div>

        <form onSubmit={saveStatement} className="mt-5 space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5 text-sm">
              <span className="font-semibold text-foreground">Title *</span>
              <input
                required
                className={inputClass}
                value={form.title}
                onChange={(event) => updateForm("title", event.target.value)}
              />
            </label>

            <label className="space-y-1.5 text-sm">
              <span className="font-semibold text-foreground">Domain *</span>
              <input
                required
                className={inputClass}
                placeholder="Education, Healthcare, Finance..."
                value={form.domain}
                onChange={(event) => updateForm("domain", event.target.value)}
              />
            </label>

            <label className="space-y-1.5 text-sm">
              <span className="font-semibold text-foreground">Difficulty *</span>
              <select
                required
                className={inputClass}
                value={form.difficulty}
                onChange={(event) => updateForm("difficulty", event.target.value)}
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Hard">Hard</option>
              </select>
            </label>

            <label className="space-y-1.5 text-sm">
              <span className="font-semibold text-foreground">
                Maximum Teams (blank = unlimited)
              </span>
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

            <label className="space-y-1.5 text-sm">
              <span className="font-semibold text-foreground">Display Order</span>
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

            <label className="flex items-center gap-3 text-sm pt-6 cursor-pointer">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(event) => updateForm("enabled", event.target.checked)}
                className="h-4 w-4 rounded border-neutral-light text-primary focus:ring-primary dark:border-[#383838] dark:bg-[#171717] dark:text-[#8B5CF6]"
              />
              <span className="font-semibold text-foreground">
                Statement enabled for selection
              </span>
            </label>
          </div>

          <label className="block space-y-1.5 text-sm">
            <span className="font-semibold text-foreground">Short Description *</span>
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

          <label className="block space-y-1.5 text-sm">
            <span className="font-semibold text-foreground">Full Description *</span>
            <textarea
              required
              rows={5}
              className={inputClass}
              value={form.description}
              onChange={(event) => updateForm("description", event.target.value)}
            />
          </label>

          <label className="block space-y-1.5 text-sm">
            <span className="font-semibold text-foreground">Constraints *</span>
            <textarea
              required
              rows={3}
              className={inputClass}
              value={form.constraints}
              onChange={(event) => updateForm("constraints", event.target.value)}
            />
          </label>

          <label className="block space-y-1.5 text-sm">
            <span className="font-semibold text-foreground">Deliverables *</span>
            <textarea
              required
              rows={3}
              className={inputClass}
              value={form.deliverables}
              onChange={(event) => updateForm("deliverables", event.target.value)}
            />
          </label>

          <div className="space-y-4 rounded-xl border border-neutral-light bg-[#FAF7F9] p-5 dark:border-[#292929] dark:bg-[#0C0C0C]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-foreground">Hints</h4>
                <p className="text-xs text-muted dark:text-[#A3A3A3]">
                  Add progressive hints released to participants during Round 3.
                </p>
              </div>
              <button type="button" className={buttonClass} onClick={addHint}>
                + Add hint
              </button>
            </div>

            {form.hints.map((hint, index) => (
              <div
                key={index}
                className="space-y-3 rounded-xl border border-neutral-light bg-white p-4 shadow-2xs dark:border-[#292929] dark:bg-[#111111]"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-bold text-foreground">
                    Hint {index + 1}
                  </span>
                  <button
                    type="button"
                    className="text-xs font-semibold text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
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

            {form.hints.length === 0 && (
              <p className="text-xs text-muted dark:text-[#A3A3A3] italic">No hints added yet.</p>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover active:scale-[0.98] disabled:opacity-50 dark:bg-[#8B5CF6] dark:hover:bg-[#A78BFA] dark:text-[#FAFAFA]"
          >
            {saving
              ? "Saving..."
              : editingId
                ? "Save changes"
                : "Create statement"}
          </button>
        </form>
      </section>

      {/* CSV Import */}
      <section className="glass-card p-6">
        <h3 className="text-lg font-bold tracking-tight text-foreground">
          CSV Import
        </h3>
        <p className="mt-1 text-sm text-muted">
          Download the template, fill in your statements, and preview validation before importing. Imports are additive.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            className={buttonClass}
            onClick={downloadCsvTemplate}
          >
            Download CSV template
          </button>

          <label className="cursor-pointer rounded-xl border border-neutral-light bg-white px-4 py-2 text-sm font-semibold text-foreground shadow-2xs transition hover:bg-neutral-50 active:scale-[0.98] dark:border-[#292929] dark:bg-[#171717] dark:text-[#FAFAFA] dark:hover:bg-[#202020]">
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
          <div className="mt-5 space-y-4">
            <p className="text-sm font-semibold text-foreground">
              Preview: {csvRows.length} statement(s)
            </p>

            {csvErrors.length > 0 ? (
              <div className="max-h-64 space-y-1.5 overflow-auto rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-950/40">
                <p className="font-bold text-red-800 dark:text-red-300">
                  Fix these problems before importing:
                </p>
                {csvErrors.map((item, index) => (
                  <p key={index} className="text-xs text-red-700 dark:text-red-400">
                    {item}
                  </p>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-neutral-light bg-white shadow-xs dark:border-[#292929] dark:bg-[#111111]">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="border-b border-neutral-light bg-[#FBF7FA] text-xs font-semibold uppercase tracking-wider text-muted dark:border-[#292929] dark:bg-[#171717] dark:text-[#A3A3A3]">
                    <tr>
                      <th className="p-3">Title</th>
                      <th className="p-3">Domain</th>
                      <th className="p-3">Difficulty</th>
                      <th className="p-3">Max Teams</th>
                      <th className="p-3">Hints</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-light dark:divide-[#292929]">
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
                        <tr key={index} className="hover:bg-neutral-50/60 dark:hover:bg-[#171717] transition-colors">
                          <td className="p-3 font-semibold text-foreground">{String(row.title ?? "")}</td>
                          <td className="p-3 text-muted dark:text-[#A3A3A3]">{String(row.domain ?? "")}</td>
                          <td className="p-3 text-foreground">{String(row.difficulty ?? "")}</td>
                          <td className="p-3 text-muted dark:text-[#A3A3A3]">
                            {String(row.maxTeams ?? "") || "Unlimited"}
                          </td>
                          <td className="p-3 font-medium text-foreground">{hintCount}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {csvRows.length > 10 && (
                  <p className="p-3 text-xs text-muted dark:text-[#A3A3A3] border-t border-neutral-light dark:border-[#292929] bg-[#FAF7F9] dark:bg-[#171717]">
                    Showing first 10 rows of {csvRows.length}.
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={importing || csvErrors.length > 0}
                onClick={handleImportCsv}
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover active:scale-[0.98] disabled:opacity-50 dark:bg-[#8B5CF6] dark:hover:bg-[#A78BFA] dark:text-[#FAFAFA]"
              >
                {importing ? "Importing..." : `Import ${csvRows.length} statement(s)`}
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

      {/* Existing Statements List */}
      <section className="glass-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-light dark:border-[#292929] pb-4">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-foreground">
              Existing Statements
            </h3>
            <p className="text-sm text-muted dark:text-[#A3A3A3]">
              {statements.length} statement{statements.length === 1 ? "" : "s"} configured
            </p>
          </div>

          <button
            type="button"
            className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 shadow-2xs transition hover:bg-red-50 active:scale-[0.98] disabled:opacity-50 dark:border-red-900/40 dark:bg-[#171717] dark:text-red-400 dark:hover:bg-red-950/40"
            disabled={!statements.length}
            onClick={openDeleteAllModal}
          >
            Delete all problem statements
          </button>
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-muted dark:text-[#A3A3A3]">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mb-2 dark:border-[#8B5CF6]" />
            <p>Loading statements...</p>
          </div>
        ) : statements.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted dark:text-[#A3A3A3]">
            No problem statements have been created yet.
          </p>
        ) : (
          <div className="mt-5 space-y-3.5">
            {statements.map((statement) => (
              <article
                key={statement.id}
                className="rounded-xl border border-neutral-light bg-white p-4.5 shadow-2xs hover:shadow-soft transition space-y-3 dark:border-[#292929] dark:bg-[#111111]"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-foreground text-base">
                      {statement.title}
                    </h4>
                    <p className="mt-0.5 text-xs font-medium text-muted dark:text-[#A3A3A3]">
                      {statement.domain} · <span className="text-primary dark:text-[#8B5CF6] font-semibold">{statement.difficulty}</span>
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/80 leading-relaxed">
                      {statement.shortDescription}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-pink-50 border border-pink-200/60 px-2.5 py-0.5 font-semibold text-primary dark:border-[#8B5CF6]/30 dark:bg-[#8B5CF6]/15 dark:text-[#A78BFA]">
                        {statement._count?.selections ?? 0} selected team(s)
                      </span>
                      <span className="rounded-full bg-neutral-100 border border-neutral-light px-2.5 py-0.5 text-muted font-medium dark:border-[#292929] dark:bg-[#171717] dark:text-[#A3A3A3]">
                        {statement.hints.length} hint(s)
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 font-medium ${
                          statement.enabled
                            ? "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-400"
                            : "border border-neutral-light bg-neutral-100 text-muted dark:border-[#292929] dark:bg-[#171717] dark:text-[#A3A3A3]"
                        }`}
                      >
                        {statement.enabled ? "● Enabled" : "○ Disabled"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
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
                      className="rounded-xl border border-red-200 bg-white px-3.5 py-2 text-sm font-semibold text-red-700 shadow-2xs transition hover:bg-red-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-900/40 dark:bg-[#171717] dark:text-red-400 dark:hover:bg-red-950/40"
                      onClick={() => handleDeleteStatement(statement)}
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

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        confirmLabel={confirmState.confirmLabel}
        destructive={confirmState.destructive}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((prev) => ({ ...prev, open: false }))}
      />

      {/* Typed Delete All Modal */}
      {deleteAllModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-all-title"
            className="w-full max-w-md rounded-2xl border border-white/80 bg-white/95 p-6 shadow-2xl backdrop-blur-md dark:border-[#292929] dark:bg-[#111111]"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">
              High Risk Administrative Action
            </p>
            <h3 id="delete-all-title" className="mt-1 text-xl font-bold text-foreground">
              Delete All Problem Statements
            </h3>
            <p className="mt-2 text-sm text-muted dark:text-[#A3A3A3] leading-relaxed">
              This permanently deletes every problem statement, every team&apos;s Round 3 selection, and all deliverable progress. Team records, participants, and deployment submissions will remain intact. This cannot be undone.
            </p>

            <div className="mt-4 space-y-2">
              <label htmlFor="delete-all-input" className="block text-xs font-semibold text-foreground">
                Type <span className="text-red-600 dark:text-red-400 font-mono">DELETE ALL</span> to confirm:
              </label>
              <input
                id="delete-all-input"
                className="w-full rounded-xl border border-red-200 bg-white px-3.5 py-2 text-sm font-mono text-foreground outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-red-900/50 dark:bg-[#171717] dark:text-[#FAFAFA] dark:focus:ring-red-950"
                value={typedConfirmation}
                onChange={(e) => setTypedConfirmation(e.target.value)}
                placeholder="DELETE ALL"
              />
            </div>

            <div className="mt-6 flex flex-col-reverse justify-end gap-2.5 sm:flex-row">
              <button
                type="button"
                className={buttonClass}
                onClick={() => setDeleteAllModalOpen(false)}
                disabled={deletingAll}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                disabled={typedConfirmation !== "DELETE ALL" || deletingAll}
                onClick={() => void executeDeleteAllStatements()}
              >
                {deletingAll ? "Deleting..." : "Permanently Delete All"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
