import Papa from "papaparse";
import { isRealDate, MAX_PAISE, MONTH_SHORT, type FinanceKind } from "@/lib/finance/money";

// CSV import, the browser half (Stage 5b): read a bank statement export, map its columns
// and turn its rows into transactions to preview. Everything here runs in the browser —
// the raw file never leaves it; importCsv only ever receives the mapped rows. Nothing
// here reports errors anywhere: a row that can't be read is shown to the person, with why.

export const CSV_LIMITS = { maxBytes: 2 * 1024 * 1024, maxRows: 5000 } as const;

export const DATE_FORMATS = ["DD/MM/YYYY", "DD-MM-YYYY", "DD/MM/YY", "YYYY-MM-DD", "DD MMM YYYY"] as const;
export type DateFormat = (typeof DATE_FORMATS)[number];

export type ColumnRole = "ignore" | "date" | "note" | "amount" | "debit" | "credit";

// `split`: amounts come as separate Debit (expense) and Credit (income) columns instead
// of one signed Amount column (negative = expense).
export type CsvMapping = { dateFormat: DateFormat; split: boolean; roles: ColumnRole[] };

export type CsvRow = {
  line: number; // the row's line in the file, the header being line 1
  occurredOn: string;
  kind: FinanceKind;
  amountPaise: number;
  note: string | null;
};

export type UnreadableRow = { line: number; reason: string };

export type ParsedCsv = { fileName: string; headers: string[]; rows: string[][] };

const NOTE_MAX = 500;

function isoDate(year: number, month: number, day: number): string | null {
  const value = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return isRealDate(value) ? value : null;
}

// One statement date in the chosen format to "YYYY-MM-DD", or null. Two-digit years are
// this century (a statement from 1999 is not a thing people import).
export function parseCsvDate(value: string, format: DateFormat): string | null {
  const text = value.trim();
  let match: RegExpExecArray | null;
  switch (format) {
    case "DD/MM/YYYY":
      match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
      return match ? isoDate(Number(match[3]), Number(match[2]), Number(match[1])) : null;
    case "DD-MM-YYYY":
      match = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(text);
      return match ? isoDate(Number(match[3]), Number(match[2]), Number(match[1])) : null;
    case "DD/MM/YY":
      match = /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/.exec(text);
      return match ? isoDate(2000 + Number(match[3]), Number(match[2]), Number(match[1])) : null;
    case "YYYY-MM-DD":
      match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
      return match ? isoDate(Number(match[1]), Number(match[2]), Number(match[3])) : null;
    case "DD MMM YYYY": {
      match = /^(\d{1,2})[ -]([A-Za-z]{3})[ -](\d{4})$/.exec(text);
      if (!match) return null;
      const month = MONTH_SHORT.findIndex((name) => name.toLowerCase() === match![2].toLowerCase());
      return month === -1 ? null : isoDate(Number(match[3]), month + 1, Number(match[1]));
    }
  }
}

// A statement amount to signed paise, or null when it can't be read. Commas (Indian or
// Western grouping), a ₹ or "INR" and spaces are stripped; a leading minus or brackets
// make it negative. At most two decimals, done on the digits as text — no float maths.
export function parseCsvAmount(value: string): number | null {
  let text = value.trim().replace(/₹|INR|Rs\.?/gi, "").replace(/[,\s]/g, "");
  let negative = false;
  if (/^\(.*\)$/.test(text)) {
    negative = true;
    text = text.slice(1, -1);
  }
  if (text.startsWith("-")) {
    negative = !negative;
    text = text.slice(1);
  } else if (text.startsWith("+")) {
    text = text.slice(1);
  }
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(text) ?? /^()\.(\d{1,2})$/.exec(text);
  if (!match) return null;
  const paise = Number(match[1] || "0") * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  if (!Number.isSafeInteger(paise)) return null;
  return negative ? -paise : paise;
}

// Which roles a mapping still needs before rows can be read, as one sentence — or null.
export function mappingProblem(mapping: CsvMapping): string | null {
  const count = (role: ColumnRole) => mapping.roles.filter((r) => r === role).length;
  if (count("date") !== 1) return "Map exactly one column to Date.";
  if (mapping.split) {
    if (count("debit") !== 1 || count("credit") !== 1) return "Map one column to Debit and one to Credit.";
  } else if (count("amount") !== 1) {
    return "Map exactly one column to Amount.";
  }
  if (count("note") > 1) return "Map at most one column to Note.";
  return null;
}

// Turns data rows into transactions using the mapping. Rows that can't be read come
// back with the reason; rows whose amount is zero (a balance-only line) are skipped.
export function mapRows(
  rows: string[][],
  mapping: CsvMapping
): { valid: CsvRow[]; unreadable: UnreadableRow[]; zero: number } {
  const col = (role: ColumnRole) => mapping.roles.indexOf(role);
  const [dateCol, noteCol, amountCol, debitCol, creditCol] = [
    col("date"),
    col("note"),
    col("amount"),
    col("debit"),
    col("credit"),
  ];
  const valid: CsvRow[] = [];
  const unreadable: UnreadableRow[] = [];
  let zero = 0;

  rows.forEach((row, index) => {
    const line = index + 2;
    const cell = (i: number) => (i >= 0 ? (row[i] ?? "").trim() : "");

    const occurredOn = parseCsvDate(cell(dateCol), mapping.dateFormat);
    if (!occurredOn) {
      unreadable.push({ line, reason: cell(dateCol) ? `Date isn’t ${mapping.dateFormat}` : "No date" });
      return;
    }

    let signed: number;
    if (mapping.split) {
      const debitText = cell(debitCol);
      const creditText = cell(creditCol);
      const debit = debitText ? parseCsvAmount(debitText) : 0;
      const credit = creditText ? parseCsvAmount(creditText) : 0;
      if (debit === null || credit === null) {
        unreadable.push({ line, reason: "Amount isn’t a number" });
        return;
      }
      if (debit !== 0 && credit !== 0) {
        unreadable.push({ line, reason: "Both Debit and Credit have an amount" });
        return;
      }
      // A debit is money out whatever its written sign; a credit is money in.
      signed = debit !== 0 ? -Math.abs(debit) : Math.abs(credit);
    } else {
      const text = cell(amountCol);
      if (!text) {
        unreadable.push({ line, reason: "No amount" });
        return;
      }
      const amount = parseCsvAmount(text);
      if (amount === null) {
        unreadable.push({ line, reason: "Amount isn’t a number" });
        return;
      }
      signed = amount;
    }

    if (signed === 0) {
      zero += 1;
      return;
    }
    const amountPaise = Math.abs(signed);
    if (amountPaise > MAX_PAISE) {
      unreadable.push({ line, reason: "Amount is too large" });
      return;
    }

    const note = cell(noteCol).replace(/\s+/g, " ").slice(0, NOTE_MAX);
    valid.push({ line, occurredOn, kind: signed < 0 ? "expense" : "income", amountPaise, note: note || null });
  });

  return { valid, unreadable, zero };
}

const HEADER_GUESSES: [ColumnRole, RegExp][] = [
  ["date", /date/i],
  ["debit", /debit|withdrawal|\bdr\b/i],
  ["credit", /credit|deposit|\bcr\b/i],
  ["amount", /amount|amt/i],
  ["note", /narration|description|note|details|particulars|remarks|memo/i],
];

// A first guess from the header names and the first date: each role goes to the first
// column whose header looks like it, and Debit/Credit is on when both are found and no
// Amount column is. The person can change all of it.
export function guessMapping(parsed: ParsedCsv): CsvMapping {
  const roles: ColumnRole[] = parsed.headers.map(() => "ignore");
  for (const [role, pattern] of HEADER_GUESSES) {
    const index = parsed.headers.findIndex((header, i) => roles[i] === "ignore" && pattern.test(header));
    if (index !== -1) roles[index] = role;
  }
  const split = roles.includes("debit") && roles.includes("credit") && !roles.includes("amount");
  if (!split) {
    for (let i = 0; i < roles.length; i++) if (roles[i] === "debit" || roles[i] === "credit") roles[i] = "ignore";
  }

  const dateCol = roles.indexOf("date");
  const sample = dateCol >= 0 ? parsed.rows.map((row) => (row[dateCol] ?? "").trim()).find(Boolean) : undefined;
  const dateFormat = (sample && DATE_FORMATS.find((format) => parseCsvDate(sample, format))) || "DD/MM/YYYY";

  return { dateFormat, split, roles };
}

// Up to two non-empty values from a column, for the Map columns step.
export function sampleValues(parsed: ParsedCsv, column: number): string[] {
  const values: string[] = [];
  for (const row of parsed.rows) {
    const value = (row[column] ?? "").trim();
    if (value) values.push(value);
    if (values.length === 2) break;
  }
  return values;
}

// Reads a picked file: UTF-8 only, at most 2 MB and 5,000 rows, the first row is the
// header. Returns the rows or a sentence saying why the file can't be used.
export async function readCsvFile(file: File): Promise<{ ok: true; csv: ParsedCsv } | { ok: false; error: string }> {
  if (file.size > CSV_LIMITS.maxBytes) return { ok: false, error: "That file is over 2 MB. Export a shorter date range." };

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
  } catch {
    return { ok: false, error: "That file isn’t UTF-8 text. Save it as a UTF-8 CSV and try again." };
  }
  return parseCsvText(file.name, text);
}

export function parseCsvText(fileName: string, text: string): { ok: true; csv: ParsedCsv } | { ok: false; error: string } {
  const result = Papa.parse<string[]>(text.replace(/^﻿/, ""), { skipEmptyLines: "greedy" });
  const [headerRow, ...rows] = result.data;
  if (!headerRow || headerRow.length < 2) {
    return { ok: false, error: "That doesn’t look like a CSV with columns. The first row should be the headers." };
  }
  if (rows.length === 0) return { ok: false, error: "That file has headers but no rows." };
  if (rows.length > CSV_LIMITS.maxRows) {
    return { ok: false, error: "That file has more than 5,000 rows. Export a shorter date range." };
  }
  const headers = headerRow.map((header, i) => header.trim() || `Column ${i + 1}`);
  return { ok: true, csv: { fileName, headers, rows } };
}
