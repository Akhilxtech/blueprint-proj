
"use client";

import { useMemo, useState, useTransition } from "react";
import Papa from "papaparse";
import Link from "next/link";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  importCsvParticipants,
  validateCsvImport,
} from "./import-actions";

const FIELDS = [
  { key: "teamName", label: "Team name", required: true },
  { key: "name", label: "Participant name", required: true },
  { key: "email", label: "Email address", required: true },
  { key: "usn", label: "USN", required: false },
  { key: "phone", label: "Phone", required: false },
  { key: "semester", label: "Semester", required: false },
  { key: "branch", label: "Branch", required: false },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];
type Mapping = Record<FieldKey, string>;
type CsvRow = Record<string, string>;

type ValidationIssue = {
  severity: "error" | "warning";
  message: string;
};

type ValidatedRow = {
  rowNumber: number;
  teamName: string;
  name: string;
  email: string;
  usn: string;
  phone: string;
  semester: string;
  branch: string;
  issues: ValidationIssue[];
};

const EMPTY_MAPPING: Mapping = {
  teamName: "",
  name: "",
  email: "",
  usn: "",
  phone: "",
  semester: "",
  branch: "",
};

const inputClass =
  "mt-2 w-full rounded-xl border border-[#E7DCE4] dark:border-[#292929] bg-white/90 dark:bg-[#171717] px-3.5 py-2 text-xs text-[#302630] dark:text-[#FAFAFA] outline-none placeholder:text-[#4E404C]/60 dark:placeholder-[#A3A3A3]/50 focus:border-[#D9468D] dark:focus:border-[#8B5CF6] focus:ring-2 focus:ring-[#D9468D]/20 dark:focus:ring-[#8B5CF6]/20 transition-all";

const TEMPLATE = [
  "team_name,name,email,usn,phone,semester,branch",
  "Team Alpha,Rahul K,rahul@gmail.com,1DB23CS054,9876543210,3,ISE",
  "Team Alpha,Priya S,priya@gmail.com,1DB23CS055,9876543211,3,ISE",
  "Team Beta,Aman R,aman@gmail.com,1DB23CS060,9876543212,5,ISE",
  "Team Beta,Neha P,neha@gmail.com,1DB23CS061,9876543213,5,ISE",
].join("\n");

const HEADER_ALIASES: Record<FieldKey, string[]> = {
  teamName: ["teamname", "team", "group", "groupname"],
  name: ["name", "participantname", "fullname", "studentname"],
  email: ["email", "emailaddress", "gmail", "mail"],
  usn: ["usn", "universityseatnumber", "studentusn"],
  phone: ["phone", "phonenumber", "mobile", "mobilenumber"],
  semester: ["semester", "sem"],
  branch: ["branch", "department", "course"],
};

function normalizeHeader(header: string) {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function guessMapping(headers: string[]): Mapping {
  const result = { ...EMPTY_MAPPING };
  const usedHeaders = new Set<string>();

  for (const field of FIELDS) {
    const match = headers.find(
      (header) =>
        !usedHeaders.has(header) &&
        HEADER_ALIASES[field.key].includes(normalizeHeader(header)),
    );

    if (match) {
      result[field.key] = match;
      usedHeaders.add(match);
    }
  }

  return result;
}

function downloadTemplate() {
  const blob = new Blob([TEMPLATE], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = "blueprint-team-template.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

function downloadErrorCsv(rows: ValidatedRow[]) {
  const rejectedRows = rows.filter((row) =>
    row.issues.some((issue) => issue.severity === "error"),
  );

  const csv = Papa.unparse(
    rejectedRows.map((row) => ({
      row_number: row.rowNumber,
      team_name: row.teamName,
      name: row.name,
      email: row.email,
      usn: row.usn,
      phone: row.phone,
      semester: row.semester,
      branch: row.branch,
      errors: row.issues
        .filter((issue) => issue.severity === "error")
        .map((issue) => issue.message)
        .join("; "),
      warnings: row.issues
        .filter((issue) => issue.severity === "warning")
        .map((issue) => issue.message)
        .join("; "),
    })),
  );

  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8;" }),
  );
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = "blueprint-import-errors.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

function getMappedRows(rows: CsvRow[], mapping: Mapping) {
  return rows.map((row) => {
    const value = (field: FieldKey) =>
      mapping[field] ? (row[mapping[field]] ?? "").trim() : "";

    return {
      teamName: value("teamName"),
      name: value("name"),
      email: value("email").toLowerCase(),
      usn: value("usn"),
      phone: value("phone"),
      semester: value("semester"),
      branch: value("branch"),
    };
  });
}

function getClientValidation(
  rows: CsvRow[],
  mapping: Mapping,
): ValidatedRow[] {
  const seenEmails = new Set<string>();

  return getMappedRows(rows, mapping).map((row, index) => {
    const issues: ValidationIssue[] = [];

    if (!row.teamName) {
      issues.push({ severity: "error", message: "Team name is required." });
    }
    if (!row.name) {
      issues.push({ severity: "error", message: "Participant name is required." });
    }
    if (!row.email) {
      issues.push({ severity: "error", message: "Email is required." });
    } else if (
      !/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@gmail\.com$/i.test(row.email)
    ) {
      issues.push({
        severity: "error",
        message: "Enter a valid Gmail address.",
      });
    }

    if (row.email) {
      if (seenEmails.has(row.email)) {
        issues.push({
          severity: "error",
          message: "Duplicate email within this CSV.",
        });
      }
      seenEmails.add(row.email);
    }

    if (row.branch && row.branch.toLowerCase() !== "ise") {
      issues.push({ severity: "warning", message: "Branch is not ISE." });
    }

    return { ...row, rowNumber: index + 2, issues };
  });
}

export default function CsvImportWizard() {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [mapping, setMapping] = useState<Mapping>(EMPTY_MAPPING);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [validatedRows, setValidatedRows] = useState<ValidatedRow[] | null>(
    null,
  );
  const [overrideTeamLimit, setOverrideTeamLimit] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    teamsCreated: number;
    message: string;
  } | null>(null);

  const previewRows = useMemo(() => rows.slice(0, 5), [rows]);

  const missingRequiredMappings = FIELDS.filter(
    (field) => field.required && !mapping[field.key],
  );

  const selectedColumns = FIELDS.map((field) => mapping[field.key]).filter(
    Boolean,
  );
  const duplicateMappings =
    new Set(selectedColumns).size !== selectedColumns.length;

  const displayedRows = validatedRows ?? getClientValidation(rows, mapping);
  const errorCount = displayedRows.filter((row) =>
    row.issues.some((issue) => issue.severity === "error"),
  ).length;
  const warningCount = displayedRows.filter((row) =>
    row.issues.some((issue) => issue.severity === "warning"),
  ).length;

  function handleFile(file?: File) {
    setError("");
    setHeaders([]);
    setRows([]);
    setMapping(EMPTY_MAPPING);
    setFileName("");
    setValidatedRows(null);
    setImportResult(null);
    setOverrideTeamLimit(false);

    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please select a CSV file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be 5 MB or smaller.");
      return;
    }

    setIsParsing(true);
    setFileName(file.name);

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (header) => header.trim(),
      transform: (value) => value.trim(),
      complete: (result) => {
        setIsParsing(false);

        if (result.errors.length > 0) {
          setFileName("");
          setError(`CSV parsing issue: ${result.errors[0].message}`);
          return;
        }

        const parsedHeaders = result.meta.fields ?? [];

        if (!parsedHeaders.length || !result.data.length) {
          setFileName("");
          setError("The CSV must contain headers and at least one data row.");
          return;
        }

        if (parsedHeaders.some((header) => !header)) {
          setFileName("");
          setError("Every CSV column must have a non-empty header.");
          return;
        }

        if (new Set(parsedHeaders).size !== parsedHeaders.length) {
          setFileName("");
          setError("CSV headers must be unique. Rename duplicate columns.");
          return;
        }

        if (result.data.length > 500) {
          setFileName("");
          setError("A maximum of 500 participant rows can be imported at once.");
          return;
        }

        setHeaders(parsedHeaders);
        setRows(result.data);
        setMapping(guessMapping(parsedHeaders));
      },
      error: (parseError) => {
        setIsParsing(false);
        setFileName("");
        setError(parseError.message || "Unable to read this CSV file.");
      },
    });
  }

  function updateMapping(field: FieldKey, value: string) {
    setMapping((current) => ({ ...current, [field]: value }));
    setValidatedRows(null);
    setImportResult(null);
    setError("");
  }

  function validateAgainstDatabase() {
    setError("");
    setImportResult(null);
    setValidatedRows(null);

    const mappedRows = getMappedRows(rows, mapping);

    startTransition(async () => {
      const result = await validateCsvImport({
        rows: mappedRows,
        overrideTeamLimit,
      });

      if (!result.success) {
        setError(result.message);
        return;
      }

      setValidatedRows(result.rows);
    });
  }

  function requestImport() {
    if (!validatedRows || errorCount > 0) return;
    setShowImportConfirm(true);
  }

  function handleConfirmImport() {
    setShowImportConfirm(false);
    if (!validatedRows || errorCount > 0) return;

    setError("");
    setImportResult(null);

    startTransition(async () => {
      const result = await importCsvParticipants({
        rows: getMappedRows(rows, mapping),
        overrideTeamLimit,
      });

      if (!result.success) {
        setError(result.message);
        return;
      }

      setImportResult({
        imported: result.imported,
        skipped: result.skipped,
        teamsCreated: result.teamsCreated,
        message: result.message,
      });

      setValidatedRows(null);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wider text-[#BE3477] dark:text-[#8B5CF6]">
          Step 1 of 3: Upload and map columns
        </p>
        <button
          type="button"
          onClick={downloadTemplate}
          className="rounded-xl border border-[#E7DCE4] dark:border-[#292929] bg-white/80 dark:bg-[#171717] px-4 py-2 text-xs font-semibold text-[#4E404C] dark:text-[#D4D4D4] hover:bg-white dark:hover:bg-[#202020] hover:text-[#302630] dark:hover:text-[#FAFAFA] transition-colors shadow-2xs"
        >
          Download sample CSV
        </button>
      </div>

      <section className="rounded-2xl border border-white/70 dark:border-[#292929] bg-white/70 dark:bg-[#111111] p-5 shadow-sm backdrop-blur-md sm:p-6">
        <h2 className="text-base font-bold text-[#302630] dark:text-[#FAFAFA]">1. Upload CSV</h2>
        <p className="mt-1 text-xs text-[#4E404C] dark:text-[#A3A3A3]">
          Upload one row per participant. Each row needs a team name.
        </p>

        <label className="mt-4 block rounded-2xl border-2 border-dashed border-[#D9468D]/30 dark:border-[#8B5CF6]/30 bg-white/50 dark:bg-[#171717]/50 p-6 text-center hover:border-[#D9468D] dark:hover:border-[#8B5CF6] hover:bg-[#FCE7F1]/30 dark:hover:bg-[#8B5CF6]/10 transition-all cursor-pointer">
          <span className="block text-sm font-bold text-[#302630] dark:text-[#FAFAFA]">
            {isParsing ? "Reading CSV..." : "Choose a CSV file"}
          </span>
          <span className="mt-1 block text-xs text-[#4E404C] dark:text-[#A3A3A3]">
            CSV files only, maximum 5 MB and 500 rows
          </span>
          <input
            className="mt-4 block w-full text-xs text-[#4E404C] dark:text-[#A3A3A3] file:mr-4 file:rounded-xl file:border-0 file:bg-[#BE3477] dark:file:bg-[#8B5CF6] file:px-4 file:py-2 file:text-xs file:font-bold file:text-white hover:file:bg-[#a82a67] dark:hover:file:bg-[#7C3AED] file:cursor-pointer cursor-pointer"
            type="file"
            accept=".csv,text/csv"
            disabled={isParsing || isPending}
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
        </label>

        {fileName && (
          <p className="mt-3 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            ✓ Loaded {fileName}: {rows.length} data rows.
          </p>
        )}
      </section>

      {error && (
        <p role="alert" className="rounded-xl border border-rose-300 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/20 p-4 text-xs font-semibold text-rose-800 dark:text-rose-300">
          {error}
        </p>
      )}

      {headers.length > 0 && !importResult && (
        <>
          <section className="rounded-2xl border border-white/70 dark:border-[#292929] bg-white/70 dark:bg-[#111111] p-5 shadow-sm backdrop-blur-md sm:p-6">
            <h2 className="text-base font-bold text-[#302630] dark:text-[#FAFAFA]">2. Map your columns</h2>
            <p className="mt-1 text-xs text-[#4E404C] dark:text-[#A3A3A3]">
              Review the detected mappings. Required fields are marked with *.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {FIELDS.map((field) => (
                <label key={field.key} className="text-xs font-bold uppercase tracking-wider text-[#4E404C] dark:text-[#A3A3A3]">
                  {field.label}{field.required ? " *" : " (optional)"}
                  <select
                    className={inputClass}
                    value={mapping[field.key]}
                    disabled={isPending}
                    onChange={(event) =>
                      updateMapping(field.key, event.target.value)
                    }
                  >
                    <option value="">Do not map</option>
                    {headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>

            {missingRequiredMappings.length > 0 && (
              <p className="mt-3 text-xs font-semibold text-amber-800 dark:text-amber-300">
                Map required fields:{" "}
                {missingRequiredMappings.map((field) => field.label).join(", ")}.
              </p>
            )}
            {duplicateMappings && (
              <p className="mt-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
                A column cannot be assigned to multiple fields.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-white/70 dark:border-[#292929] bg-white/70 dark:bg-[#111111] p-5 shadow-sm backdrop-blur-md sm:p-6">
            <h2 className="text-base font-bold text-[#302630] dark:text-[#FAFAFA]">3. Preview your data</h2>
            <p className="mt-1 text-xs text-[#4E404C] dark:text-[#A3A3A3]">
              Showing up to five of {rows.length} rows.
            </p>

            <div className="mt-4 overflow-x-auto rounded-xl border border-[#E7DCE4] dark:border-[#292929] bg-white/80 dark:bg-[#111111]">
              <table className="w-full min-w-[650px] text-left text-xs">
                <thead className="border-b border-[#E7DCE4] dark:border-[#292929] bg-[#F1E9EF]/80 dark:bg-[#171717] text-[#4E404C] dark:text-[#A3A3A3]">
                  <tr>
                    {FIELDS.map((field) => (
                      <th key={field.key} className="px-3 py-2.5 font-bold uppercase tracking-wider">
                        {field.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7DCE4] dark:divide-[#292929]">
                  {previewRows.map((row, index) => (
                    <tr key={index} className="hover:bg-[#FCE7F1]/20 dark:hover:bg-[#202020]">
                      {FIELDS.map((field) => (
                        <td key={field.key} className="px-3 py-2.5 text-[#302630] dark:text-[#FAFAFA]">
                          {mapping[field.key]
                            ? row[mapping[field.key]] || "—"
                            : "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={
                isPending ||
                missingRequiredMappings.length > 0 ||
                duplicateMappings
              }
              onClick={validateAgainstDatabase}
              className="rounded-xl bg-[#BE3477] dark:bg-[#8B5CF6] px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#a82a67] dark:hover:bg-[#7C3AED] active:scale-[0.98] transition-all disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isPending ? "Working..." : "Validate against database"}
            </button>
            <Link
              href="/admin/teams"
              className="rounded-xl border border-[#E7DCE4] dark:border-[#292929] bg-white/80 dark:bg-[#171717] px-5 py-2.5 text-xs font-semibold text-[#4E404C] dark:text-[#D4D4D4] hover:bg-white dark:hover:bg-[#202020] hover:text-[#302630] dark:hover:text-[#FAFAFA] transition-colors"
            >
              Cancel
            </Link>
          </div>
        </>
      )}

      {validatedRows && (
        <section className="rounded-2xl border border-white/70 dark:border-[#292929] bg-white/70 dark:bg-[#111111] p-5 shadow-sm backdrop-blur-md sm:p-6">
          <h2 className="text-base font-bold text-[#302630] dark:text-[#FAFAFA]">Database validation report</h2>
          <p className="mt-1 text-xs text-[#4E404C] dark:text-[#A3A3A3]">
            These checks include existing participant emails and current team sizes.
          </p>

          <div className="mt-4 flex flex-wrap gap-2.5 text-xs font-bold">
            <span className="rounded-full border border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-1.5 text-emerald-800 dark:text-emerald-300">
              Rows without errors: {validatedRows.length - errorCount}
            </span>
            <span className="rounded-full border border-rose-300 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/20 px-3 py-1.5 text-rose-800 dark:text-rose-300">
              Errors: {errorCount}
            </span>
            <span className="rounded-full border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 px-3 py-1.5 text-amber-800 dark:text-amber-300">
              Warnings: {warningCount}
            </span>
          </div>

          {errorCount > 0 && (
            <button
              type="button"
              onClick={() => downloadErrorCsv(validatedRows)}
              className="mt-4 rounded-xl border border-rose-300 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/20 px-4 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors"
            >
              Download error report CSV
            </button>
          )}

          <div className="mt-5 space-y-2.5">
            {validatedRows.map((row) => {
              const hasErrors = row.issues.some(
                (issue) => issue.severity === "error",
              );
              const hasWarnings = row.issues.some(
                (issue) => issue.severity === "warning",
              );

              return (
                <article
                  key={row.rowNumber}
                  className="rounded-xl border border-[#E7DCE4] dark:border-[#292929] bg-white/80 dark:bg-[#171717] p-3.5 shadow-2xs"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-[#302630] dark:text-[#FAFAFA]">
                        Row {row.rowNumber}: {row.name || "Unnamed participant"}
                      </p>
                      <p className="mt-0.5 text-xs text-[#4E404C] dark:text-[#A3A3A3]">
                        {row.teamName || "No team"} · {row.email || "No email"}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        hasErrors
                          ? "border border-rose-300 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300"
                          : hasWarnings
                            ? "border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300"
                            : "border border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300"
                      }`}
                    >
                      {hasErrors ? "Error" : hasWarnings ? "Warning" : "Valid"}
                    </span>
                  </div>

                  {row.issues.length === 0 ? (
                    <p className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      ✓ No issues detected.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-1">
                      {row.issues.map((issue, index) => (
                        <li
                          key={index}
                          className={`text-xs ${
                            issue.severity === "error"
                              ? "font-semibold text-rose-700 dark:text-rose-400"
                              : "text-amber-800 dark:text-amber-300"
                          }`}
                        >
                          {issue.severity === "error" ? "• Error" : "• Warning"}:{" "}
                          {issue.message}
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              );
            })}
          </div>

          <div className="mt-6 rounded-xl border border-[#E7DCE4] dark:border-[#292929] bg-white/60 dark:bg-[#171717] p-4">
            <label className="flex items-start gap-3 text-xs text-[#302630] dark:text-[#FAFAFA]">
              <input
                type="checkbox"
                className="mt-0.5 accent-[#BE3477] dark:accent-[#8B5CF6]"
                checked={overrideTeamLimit}
                disabled={isPending}
                onChange={(event) => {
                  setOverrideTeamLimit(event.target.checked);
                  setValidatedRows(null);
                }}
              />
              <span>
                <span className="font-bold text-[#302630] dark:text-[#FAFAFA]">
                  Override team-size restrictions
                </span>
                <span className="mt-0.5 block text-xs text-[#4E404C] dark:text-[#A3A3A3]">
                  Allow teams to finish with fewer than 2 or more than 3 members.
                  Use only if this is intentional.
                </span>
              </span>
            </label>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={isPending || errorCount > 0}
              onClick={requestImport}
              className="rounded-xl bg-[#BE3477] dark:bg-[#8B5CF6] px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#a82a67] dark:hover:bg-[#7C3AED] active:scale-[0.98] transition-all disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isPending ? "Importing..." : "Import participants"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={validateAgainstDatabase}
              className="rounded-xl border border-[#E7DCE4] dark:border-[#292929] bg-white/80 dark:bg-[#171717] px-5 py-2.5 text-xs font-semibold text-[#4E404C] dark:text-[#D4D4D4] hover:bg-white dark:hover:bg-[#202020] hover:text-[#302630] dark:hover:text-[#FAFAFA] transition-colors disabled:opacity-40"
            >
              Revalidate
            </button>
          </div>
        </section>
      )}

      {importResult && (
        <section className="rounded-2xl border border-emerald-300 dark:border-emerald-500/30 bg-white/80 dark:bg-[#111111] p-5 shadow-sm backdrop-blur-md sm:p-6">
          <h2 className="text-base font-bold text-emerald-800 dark:text-emerald-300">
            Import completed
          </h2>
          <p className="mt-1 text-xs text-[#302630] dark:text-[#D4D4D4]">{importResult.message}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[#E7DCE4] dark:border-[#292929] bg-white dark:bg-[#171717] p-4 shadow-2xs">
              <p className="text-xs font-semibold text-[#4E404C] dark:text-[#A3A3A3]">Participants imported</p>
              <p className="mt-1 text-2xl font-black text-[#BE3477] dark:text-[#8B5CF6]">{importResult.imported}</p>
            </div>
            <div className="rounded-xl border border-[#E7DCE4] dark:border-[#292929] bg-white dark:bg-[#171717] p-4 shadow-2xs">
              <p className="text-xs font-semibold text-[#4E404C] dark:text-[#A3A3A3]">Existing emails skipped</p>
              <p className="mt-1 text-2xl font-black text-[#4E404C] dark:text-[#D4D4D4]">{importResult.skipped}</p>
            </div>
            <div className="rounded-xl border border-[#E7DCE4] dark:border-[#292929] bg-white dark:bg-[#171717] p-4 shadow-2xs">
              <p className="text-xs font-semibold text-[#4E404C] dark:text-[#A3A3A3]">Teams created</p>
              <p className="mt-1 text-2xl font-black text-[#302630] dark:text-[#FAFAFA]">{importResult.teamsCreated}</p>
            </div>
          </div>
          <Link
            href="/admin/teams"
            className="mt-5 inline-block rounded-xl bg-[#BE3477] dark:bg-[#8B5CF6] px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#a82a67] dark:hover:bg-[#7C3AED] transition-all"
          >
            View teams
          </Link>
        </section>
      )}

      <ConfirmDialog
        isOpen={showImportConfirm}
        title="Confirm CSV Import"
        description={`Import ${validatedRows?.length ?? 0} CSV rows? Existing emails will be skipped.`}
        confirmLabel="Import Now"
        cancelLabel="Cancel"
        onConfirm={handleConfirmImport}
        onCancel={() => setShowImportConfirm(false)}
      />
    </div>
  );
}
