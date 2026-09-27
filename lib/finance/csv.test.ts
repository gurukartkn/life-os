import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { flagDuplicates } from "./duplicates";
import {
  guessMapping,
  mappingProblem,
  mapRows,
  parseCsvAmount,
  parseCsvDate,
  parseCsvText,
  readCsvFile,
  sampleValues,
  type CsvMapping,
} from "./csv";

function fixture(name: string) {
  const text = readFileSync(path.join(__dirname, "../../e2e/fixtures", name), "utf8");
  const parsed = parseCsvText(name, text);
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.csv;
}

describe("parseCsvDate", () => {
  it.each([
    ["23/09/2026", "DD/MM/YYYY", "2026-09-23"],
    ["3/9/2026", "DD/MM/YYYY", "2026-09-03"],
    ["23-09-2026", "DD-MM-YYYY", "2026-09-23"],
    ["23/09/26", "DD/MM/YY", "2026-09-23"],
    ["2026-09-23", "YYYY-MM-DD", "2026-09-23"],
    ["23 Sep 2026", "DD MMM YYYY", "2026-09-23"],
    ["23 SEP 2026", "DD MMM YYYY", "2026-09-23"],
    ["23-Sep-2026", "DD MMM YYYY", "2026-09-23"],
    ["29/02/2028", "DD/MM/YYYY", "2028-02-29"],
  ] as const)("%s as %s → %s", (value, format, expected) => {
    expect(parseCsvDate(value, format)).toBe(expected);
  });

  it.each([
    ["31/02/2026", "DD/MM/YYYY"],
    ["29/02/2026", "DD/MM/YYYY"],
    ["2026-09-23", "DD/MM/YYYY"],
    ["23/09/2026", "DD-MM-YYYY"],
    ["23/09/2026", "DD/MM/YY"],
    ["23 Sept 2026", "DD MMM YYYY"],
    ["23 Foo 2026", "DD MMM YYYY"],
    ["", "YYYY-MM-DD"],
  ] as const)("refuses %j as %s", (value, format) => {
    expect(parseCsvDate(value, format)).toBeNull();
  });
});

describe("parseCsvAmount", () => {
  it.each([
    ["-640.00", -64000],
    ["-2,150.00", -215000],
    ["1,24,530.10", 12453010],
    ["1,112,000.5", 111200050],
    ["(640.00)", -64000],
    ["₹ 99", 9900],
    ["+12.5", 1250],
    [".50", 50],
    ["0.00", 0],
  ])("%s → %d", (value, paise) => {
    expect(parseCsvAmount(value)).toBe(paise);
  });

  it.each(["n/a", "12.345", "--5", "1-2", ""])("refuses %j", (value) => {
    expect(parseCsvAmount(value)).toBeNull();
  });
});

describe("mapRows with a signed Amount column", () => {
  const csv = fixture("finance-signed-amount.csv");
  const mapping = guessMapping(csv);

  it("guesses Date, Note and Amount from the headers, and leaves Balance alone", () => {
    expect(mapping).toEqual({ dateFormat: "DD/MM/YYYY", split: false, roles: ["date", "note", "amount", "ignore"] });
    expect(mappingProblem(mapping)).toBeNull();
    expect(sampleValues(csv, 3)).toEqual(["1,24,530.10", "1,25,170.10"]);
  });

  it("reads negative as expense, skips zero, and reports the unreadable row with why", () => {
    const { valid, unreadable, zero } = mapRows(csv.rows, mapping);
    expect(valid.map((r) => [r.occurredOn, r.kind, r.amountPaise, r.note])).toEqual([
      ["2026-09-23", "expense", 64000, "SWIGGY BLR"],
      ["2026-09-22", "expense", 215000, "BIGBASKET"],
      ["2026-09-22", "expense", 215000, "BIGBASKET"],
      ["2026-09-21", "expense", 50000, "METRO CARD TOPUP"],
      ["2026-09-15", "income", 11200050, "FREELANCE PAYMENT"],
    ]);
    expect(zero).toBe(1);
    expect(unreadable).toEqual([{ line: 8, reason: "Date isn’t DD/MM/YYYY" }]);
    expect(flagDuplicates(valid, [])).toEqual([null, null, "file", null, null]);
  });
});

describe("mapRows with Debit and Credit columns", () => {
  const csv = fixture("finance-debit-credit.csv");
  const mapping = guessMapping(csv);

  it("guesses the split and the date format", () => {
    expect(mapping).toEqual({
      dateFormat: "DD-MM-YYYY",
      split: true,
      roles: ["date", "note", "debit", "credit", "ignore"],
    });
  });

  it("reads Debit as expense and Credit as income", () => {
    const { valid, unreadable } = mapRows(csv.rows, mapping);
    expect(valid.map((r) => [r.occurredOn, r.kind, r.amountPaise])).toEqual([
      ["2026-09-20", "expense", 185000],
      ["2026-09-19", "expense", 124000],
      ["2026-09-19", "expense", 124000],
      ["2026-09-01", "income", 17300000],
    ]);
    expect(unreadable).toEqual([{ line: 5, reason: "Amount isn’t a number" }]);
    expect(flagDuplicates(valid, []).filter(Boolean)).toHaveLength(1);
  });

  it("refuses a row with both a debit and a credit", () => {
    const { unreadable } = mapRows([["01-09-2026", "X", "100", "100", ""]], mapping);
    expect(unreadable).toEqual([{ line: 2, reason: "Both Debit and Credit have an amount" }]);
  });
});

describe("mappingProblem", () => {
  const base: CsvMapping = { dateFormat: "DD/MM/YYYY", split: false, roles: ["date", "note", "amount"] };

  it("needs one date and one amount, or a debit and a credit", () => {
    expect(mappingProblem({ ...base, roles: ["ignore", "note", "amount"] })).toBe("Map exactly one column to Date.");
    expect(mappingProblem({ ...base, roles: ["date", "note", "ignore"] })).toBe("Map exactly one column to Amount.");
    expect(mappingProblem({ ...base, split: true, roles: ["date", "debit", "ignore"] })).toBe(
      "Map one column to Debit and one to Credit."
    );
    expect(mappingProblem({ ...base, roles: ["date", "note", "amount", "note"] })).toBe("Map at most one column to Note.");
  });
});

describe("file limits", () => {
  it("refuses a file over 2 MB without reading it", async () => {
    const big = new File(["x".repeat(2 * 1024 * 1024 + 1)], "big.csv");
    expect(await readCsvFile(big)).toEqual({ ok: false, error: "That file is over 2 MB. Export a shorter date range." });
  });

  it("refuses text that isn't UTF-8", async () => {
    const latin1 = new File([new Uint8Array([0x44, 0x61, 0x74, 0x65, 0x2c, 0xe9, 0x0a])], "latin1.csv");
    const result = await readCsvFile(latin1);
    expect(result.ok).toBe(false);
  });

  it("refuses more than 5,000 rows", () => {
    const text = ["Date,Amount", ...Array.from({ length: 5001 }, () => "01/09/2026,-1")].join("\n");
    expect(parseCsvText("many.csv", text)).toEqual({
      ok: false,
      error: "That file has more than 5,000 rows. Export a shorter date range.",
    });
  });

  it("takes the first row as the header and strips a byte-order mark", () => {
    const parsed = parseCsvText("bom.csv", "﻿Date,Amount\n01/09/2026,-1\n\n");
    expect(parsed).toEqual({ ok: true, csv: { fileName: "bom.csv", headers: ["Date", "Amount"], rows: [["01/09/2026", "-1"]] } });
  });
});
