"use client";

import { useRef, useState, useTransition } from "react";
import Papa from "papaparse";
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

  function confirmImport() {
    if (!rows.length || errors.length || isPending) return;

    const confirmed = window.confirm(
      `Import ${rows.length} questions? Existing questions with matching external IDs will be updated.`,
    );
    if (!confirmed) return;

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
    <section className="space-y-4 rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">CSV question import</h2>
          <p className="text-sm text-muted-foreground">
            Upload a CSV, review validation, then import questions.
          </p>
        </div>
        <button
          type="button"
          onClick={downloadTemplate}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          Download template
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={(event) => handleFile(event.currentTarget.files?.[0])}
        className="block w-full text-sm"
      />

      {fileName && (
        <p className="text-sm text-muted-foreground">Selected: {fileName}</p>
      )}

      {rows.length > 0 && (
        <>
          <p className="text-sm">
            Preview: <strong>{rows.length}</strong> question rows
          </p>

          <div className="max-h-80 overflow-auto rounded-lg border">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="sticky top-0 bg-muted">
                <tr>
                  <th className="p-2">External ID</th>
                  <th className="p-2">Question</th>
                  <th className="p-2">Options</th>
                  <th className="p-2">Correct</th>
                  <th className="p-2">Type</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={`${row.external_id}-${index}`} className="border-t">
                    <td className="p-2 font-mono">{row.external_id}</td>
                    <td className="max-w-sm whitespace-pre-wrap p-2">
                      {row.question_text}
                    </td>
                    <td className="p-2">
                      {["a", "b", "c", "d", "e", "f"].filter(
                        (key) => row[`option_${key}`]?.trim(),
                      ).length}
                    </td>
                    <td className="p-2">{row.correct_option}</td>
                    <td className="p-2">
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
        <div className="rounded-lg border border-destructive/40 p-3">
          <p className="font-medium text-destructive">
            Fix these issues before importing:
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
            {errors.slice(0, 30).map((error, index) => (
              <li key={`${index}-${error}`}>{error}</li>
            ))}
          </ul>
          {errors.length > 30 && (
            <p className="mt-2 text-sm">And {errors.length - 30} more errors.</p>
          )}
        </div>
      )}

      {message && (
        <p role="status" className="text-sm">{message}</p>
      )}

      <button
        type="button"
        disabled={!rows.length || errors.length > 0 || isPending}
        onClick={confirmImport}
        className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Importing..." : `Import ${rows.length || ""} questions`}
      </button>
    </section>
  );
}
