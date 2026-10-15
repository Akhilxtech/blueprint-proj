"use client";

import { useRef, useState, useTransition } from "react";
import Papa from "papaparse";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  importQuestionsFromCsv,
  type CsvQuestionRow,
} from "./question-import-actions";
import { useRouter } from "next/navigation";

const headers = [
  "external_id",
  "question_text",
  "code_language",
  "code",
  "option_a",
  "option_b",
  "option_c",
  "option_d",
  "option_e",
  "option_f",
  "correct_option",
  "marks",
  "question_type",
  "time_seconds",
];

const template = [
  headers,
  [
    "Q-001",
    "Which data structure follows FIFO?",
    "",
    "",
    "Stack",
    "Queue",
    "Tree",
    "Graph",
    "",
    "",
    "B",
    "1",
    "THEORY",
    "",
  ],
  [
    "Q-002",
    "What does this JavaScript expression return?",
    "javascript",
    "console.log(2 + 3);",
    "2",
    "3",
    "5",
    "23",
    "",
    "",
    "C",
    "2",
    "CODE",
    "90",
  ],
];

function downloadTemplate() {
  const csv = Papa.unparse(template);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "questions-template.csv";
  link.click();

  URL.revokeObjectURL(url);
}

function validateRow(
  row: Record<string, string>,
  index: number,
): string[] {
  const errors: string[] = [];
  const line = index + 2;

  if (!row.external_id?.trim()) errors.push(`Row ${line}: external_id is required.`);
  if (!row.question_text?.trim()) errors.push(`Row ${line}: question_text is required.`);

  const options = ["a", "b", "c", "d", "e", "f"]
    .map((key) => row[`option_${key}`]?.trim())
    .filter(Boolean);

  if (options.length < 2) errors.push(`Row ${line}: provide at least two options.`);

  const correct = row.correct_option?.trim().toUpperCase();
  if (!["A", "B", "C", "D", "E", "F"].includes(correct)) {
    errors.push(`Row ${line}: correct_option must be A through F.`);
  } else if (!row[`option_${correct.toLowerCase()}`]?.trim()) {
    errors.push(`Row ${line}: the correct option has no content.`);
  }

  if (row.code?.trim() && !row.code_language?.trim()) {
    errors.push(`Row ${line}: code_language is required when code is present.`);
  }

  if (
    row.code_language &&
    !["c", "cpp", "java", "python", "javascript"].includes(row.code_language)
  ) {
    errors.push(`Row ${line}: unsupported code_language.`);
  }

  if (
    row.question_type &&
    !["THEORY", "CODE"].includes(row.question_type.toUpperCase())
  ) {
    errors.push(`Row ${line}: question_type must be THEORY or CODE.`);
  }

  if (row.marks && (!/^\d+$/.test(row.marks) || +row.marks < 1 || +row.marks > 100)) {
    errors.push(`Row ${line}: marks must be an integer from 1 to 100.`);
  }

  if (
    row.time_seconds &&
    (!/^\d+$/.test(row.time_seconds) || +row.time_seconds < 1 || +row.time_seconds > 3600)
  ) {
    errors.push(`Row ${line}: time_seconds must be 1 to 3600, or blank.`);
  }

  return errors;
}

export default function QuestionCsvImport() {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState("");
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleFile(file?: File) {
    if (!file) return;

    setRows([]);
    setErrors([]);
    setMessage("");
    setFileName(file.name);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (header) => header.trim().toLowerCase(),
      complete: (result) => {
        const parsedRows = result.data.map((row) =>
          Object.fromEntries(
            Object.entries(row).map(([key, value]) => [
              key,
              String(value ?? "").trim(),
            ]),
          ),
        );

        const parseErrors = result.errors.map(
          (error) => `CSV line ${error.row == null ? "?" : error.row + 2}: ${error.message}`,
        );

        const missingHeaders = headers.filter(
          (header) => !result.meta.fields?.includes(header),
        );

        if (missingHeaders.length) {
          parseErrors.push(`Missing columns: ${missingHeaders.join(", ")}`);
        }

        if (parsedRows.length === 0) {
          parseErrors.push("The CSV has no question rows.");
        }

        if (parsedRows.length > 500) {
          parseErrors.push("Import is limited to 500 rows per file.");
        }

        const seen = new Set<string>();
        parsedRows.forEach((row, index) => {
          const id = row.external_id?.trim();
          if (id && seen.has(id)) {
            parseErrors.push(`Row ${index + 2}: duplicate external_id "${id}".`);
          }
          if (id) seen.add(id);
          parseErrors.push(...validateRow(row, index));
        });

        setRows(parsedRows);
        setErrors(parseErrors);
      },
      error: (error) => setErrors([error.message]),
    });
  }

  function requestImport() {
    if (!rows.length || errors.length || isPending) return;
    setShowImportConfirm(true);
  }

  function handleConfirmImport() {
    setShowImportConfirm(false);
    if (!rows.length || errors.length || isPending) return;

    startTransition(async () => {
      const result = await importQuestionsFromCsv(
        rows as unknown as CsvQuestionRow[],
      );

      setMessage(result.message);

      if (result.success) {
        setRows([]);
        setFileName("");
        if (inputRef.current) inputRef.current.value = "";
        router.refresh();
      }
    });
  }

  return (
    <section className="space-y-4 rounded-2xl border border-white/70 bg-white/70 p-5 shadow-sm backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#302630]">CSV question import</h2>
          <p className="mt-0.5 text-xs text-[#4E404C]">
            Upload a CSV, review validation, then import questions.
          </p>
        </div>
        <button
          type="button"
          onClick={downloadTemplate}
          className="rounded-xl border border-[#E7DCE4] bg-white/80 px-4 py-2 text-xs font-semibold text-[#4E404C] hover:bg-white hover:text-[#302630] transition-colors shadow-2xs"
        >
          Download template
        </button>
      </div>

      <div className="rounded-xl border border-dashed border-[#D9468D]/30 bg-white/40 p-4">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => handleFile(event.currentTarget.files?.[0])}
          className="block w-full text-xs text-[#4E404C] file:mr-4 file:rounded-xl file:border-0 file:bg-[#BE3477] file:px-4 file:py-2 file:text-xs file:font-bold file:text-white hover:file:bg-[#a82a67] file:cursor-pointer cursor-pointer"
        />
      </div>

      {fileName && (
        <p className="text-xs font-semibold text-emerald-700">✓ Selected file: {fileName}</p>
      )}

      {rows.length > 0 && (
        <>
          <p className="text-xs font-bold text-[#302630]">
            Preview: <span className="text-[#BE3477]">{rows.length}</span> question rows detected
          </p>

          <div className="max-h-80 overflow-auto rounded-xl border border-[#E7DCE4] bg-white/90">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="sticky top-0 border-b border-[#E7DCE4] bg-[#F1E9EF]/90 text-[#4E404C] backdrop-blur-xs">
                <tr>
                  <th className="px-3 py-2.5 font-bold uppercase tracking-wider">External ID</th>
                  <th className="px-3 py-2.5 font-bold uppercase tracking-wider">Question</th>
                  <th className="px-3 py-2.5 font-bold uppercase tracking-wider">Options</th>
                  <th className="px-3 py-2.5 font-bold uppercase tracking-wider">Correct</th>
                  <th className="px-3 py-2.5 font-bold uppercase tracking-wider">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7DCE4]">
                {rows.map((row, index) => (
                  <tr key={`${row.external_id}-${index}`} className="hover:bg-[#FCE7F1]/20">
                    <td className="px-3 py-2 font-mono font-semibold text-[#BE3477]">{row.external_id}</td>
                    <td className="max-w-sm truncate px-3 py-2 text-[#302630]">
                      {row.question_text}
                    </td>
                    <td className="px-3 py-2 text-[#4E404C]">
                      {["a", "b", "c", "d", "e", "f"].filter(
                        (key) => row[`option_${key}`]?.trim(),
                      ).length}
                    </td>
                    <td className="px-3 py-2 font-bold text-emerald-700">{row.correct_option}</td>
                    <td className="px-3 py-2 text-[#4E404C]">
                      {row.question_type || (row.code ? "CODE" : "THEORY")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {errors.length > 0 && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-4">
          <p className="text-xs font-bold text-rose-800">
            Fix these issues before importing:
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-rose-700">
            {errors.slice(0, 30).map((error, index) => (
              <li key={`${index}-${error}`}>{error}</li>
            ))}
          </ul>
          {errors.length > 30 && (
            <p className="mt-2 text-xs font-semibold text-rose-800">And {errors.length - 30} more errors.</p>
          )}
        </div>
      )}

      {message && (
        <p role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
          {message}
        </p>
      )}

      <button
        type="button"
        disabled={!rows.length || errors.length > 0 || isPending}
        onClick={requestImport}
        className="rounded-xl bg-[#BE3477] px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#a82a67] active:scale-[0.98] transition-all disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isPending ? "Importing..." : `Import ${rows.length || ""} questions`}
      </button>

      <ConfirmDialog
        isOpen={showImportConfirm}
        title="Confirm Question Import"
        description={`Import ${rows.length} questions? Existing questions with matching external IDs will be updated.`}
        confirmLabel="Import Questions"
        cancelLabel="Cancel"
        onConfirm={handleConfirmImport}
        onCancel={() => setShowImportConfirm(false)}
      />
    </section>
  );
}
