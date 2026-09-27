"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import { AlertCircle, ArrowRight, Check, FileText, Upload, X } from "lucide-react";
import { importCsv, importMatches, type ImportSummary } from "@/actions/finance";
import { Amount } from "@/components/finance/money";
import { BackLink } from "@/components/ui/back-link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldError, FieldHint } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { PageHeader } from "@/components/ui/page-header";
import { Tag } from "@/components/ui/tag";
import {
  DATE_FORMATS,
  guessMapping,
  mappingProblem,
  mapRows,
  readCsvFile,
  sampleValues,
  type ColumnRole,
  type CsvMapping,
  type CsvRow,
  type DateFormat,
  type ParsedCsv,
  type UnreadableRow,
} from "@/lib/finance/csv";
import { flagDuplicates, type DuplicateFlag } from "@/lib/finance/duplicates";
import { formatDay, monthOf } from "@/lib/finance/money";
import { transactionsHref } from "@/lib/finance/params";
import type { Account } from "@/lib/validations/finance";
import { cn } from "@/lib/utils";

type Step = "upload" | "map" | "preview" | "done";
const STEPS: { step: Step; label: string }[] = [
  { step: "upload", label: "Upload" },
  { step: "map", label: "Map columns" },
  { step: "preview", label: "Preview" },
  { step: "done", label: "Import" },
];

const ROLE_LABELS: Record<ColumnRole, string> = {
  ignore: "Ignore",
  date: "Date",
  note: "Note",
  amount: "Amount",
  debit: "Debit (money out)",
  credit: "Credit (money in)",
};

function plural(count: number, word: string) {
  return `${count.toLocaleString("en-IN")} ${word}${count === 1 ? "" : "s"}`;
}

function StepBar({ current }: { current: Step }) {
  const index = STEPS.findIndex((item) => item.step === current);
  return (
    <ol aria-label="Import steps" className="flex items-center gap-3">
      {STEPS.map((item, i) => {
        const done = i < index || current === "done";
        const active = i === index;
        return (
          <li key={item.step} className="flex min-w-0 flex-1 items-center gap-3 last:flex-none">
            <span className="flex items-center gap-2" aria-current={active ? "step" : undefined}>
              <span
                className={cn(
                  "flex size-[26px] shrink-0 items-center justify-center rounded-full text-label font-semibold",
                  done || active ? "bg-accent text-accent-ink" : "bg-surface-200 text-ink-muted"
                )}
              >
                {done && !active ? <Check className="size-3.5" strokeWidth={2.25} aria-label="Done" /> : i + 1}
              </span>
              <span className={cn("hidden text-body sm:inline", active ? "font-semibold text-ink" : "font-medium text-ink-muted")}>
                {item.label}
              </span>
            </span>
            {i < STEPS.length - 1 && <span aria-hidden="true" className="h-px min-w-6 flex-1 bg-border-strong" />}
          </li>
        );
      })}
    </ol>
  );
}

type PreviewRow =
  | { type: "row"; index: number; row: CsvRow; flag: DuplicateFlag }
  | { type: "unreadable"; row: UnreadableRow };

// CSV import (5b · Finance "CSV import"): Upload → Map columns → Preview → Imported. The
// file is read and mapped here in the browser; only the mapped rows the person keeps are
// sent to importCsv, and the file is never uploaded or stored.
export function CsvImportWizard({ accounts }: { accounts: Account[] }) {
  const activeAccounts = accounts.filter((account) => account.isActive);
  const fileInput = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [csv, setCsv] = useState<ParsedCsv | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [mapping, setMapping] = useState<CsvMapping | null>(null);
  const [accountId, setAccountId] = useState(activeAccounts[0]?.id ?? "");
  const [mapped, setMapped] = useState<{ valid: CsvRow[]; unreadable: UnreadableRow[]; zero: number } | null>(null);
  const [flags, setFlags] = useState<DuplicateFlag[]>([]);
  const [ticked, setTicked] = useState<boolean[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function takeFile(file: File | undefined) {
    if (!file) return;
    setFileError(null);
    const result = await readCsvFile(file);
    if (!result.ok) {
      setCsv(null);
      setFileError(result.error);
      return;
    }
    setCsv(result.csv);
    setMapping(guessMapping(result.csv));
  }

  function reset() {
    setStep("upload");
    setCsv(null);
    setMapping(null);
    setMapped(null);
    setFlags([]);
    setTicked([]);
    setSummary(null);
    setError(null);
    setFileError(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  function setRole(column: number, role: ColumnRole) {
    if (!mapping) return;
    // A role that belongs to one column moves to this one.
    const roles = mapping.roles.map((current, i) => (i === column ? role : role !== "ignore" && current === role ? "ignore" : current));
    setMapping({ ...mapping, roles });
  }

  function setSplit(split: boolean) {
    if (!mapping) return;
    const drop: ColumnRole[] = split ? ["amount"] : ["debit", "credit"];
    setMapping({ ...mapping, split, roles: mapping.roles.map((role) => (drop.includes(role) ? "ignore" : role)) });
  }

  const problem = mapping ? mappingProblem(mapping) : null;

  function toPreview() {
    if (!csv || !mapping || problem || !accountId) return;
    setError(null);
    const result = mapRows(csv.rows, mapping);
    startTransition(async () => {
      let existing: { occurredOn: string; kind: CsvRow["kind"]; amountPaise: number }[] = [];
      if (result.valid.length > 0) {
        const dates = result.valid.map((row) => row.occurredOn).sort();
        const matches = await importMatches(accountId, dates[0], dates[dates.length - 1]);
        if (!matches.success) {
          setError(matches.error ?? "Couldn't check for duplicates. Try again.");
          return;
        }
        existing = matches.data ?? [];
      }
      const nextFlags = flagDuplicates(result.valid, existing);
      setMapped(result);
      setFlags(nextFlags);
      // Possible duplicates start unticked; everything else ticked.
      setTicked(nextFlags.map((flag) => flag === null));
      setStep("preview");
    });
  }

  function runImport() {
    if (!mapped) return;
    setError(null);
    startTransition(async () => {
      const result = await importCsv(
        accountId,
        mapped.valid.map(({ occurredOn, kind, amountPaise, note }) => ({ occurredOn, kind, amountPaise, note })),
        ticked
      );
      if (!result.success || !result.data) {
        setError(result.error ?? "Couldn't import the file. Nothing was added. Try again.");
        return;
      }
      setSummary({ ...result.data, unreadable: result.data.unreadable + mapped.unreadable.length });
      setStep("done");
    });
  }

  const previewRows = useMemo<PreviewRow[]>(() => {
    if (!mapped) return [];
    const rows: PreviewRow[] = [
      ...mapped.valid.map((row, index) => ({ type: "row" as const, index, row, flag: flags[index] ?? null })),
      ...mapped.unreadable.map((row) => ({ type: "unreadable" as const, row })),
    ];
    return rows.sort((a, b) => a.row.line - b.row.line);
  }, [mapped, flags]);

  const tickedCount = ticked.filter(Boolean).length;
  const flaggedCount = flags.filter(Boolean).length;
  const importedMonth = mapped?.valid.length ? monthOf([...mapped.valid].sort((a, b) => b.occurredOn.localeCompare(a.occurredOn))[0].occurredOn) : undefined;

  let body: React.ReactNode;
  if (step === "upload") {
    body = (
      <div className="flex flex-col gap-3">
        <div
          data-slot="csv-drop-zone"
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void takeFile(event.dataTransfer.files[0]);
          }}
          className={cn(
            "flex flex-col items-center gap-2 rounded-lg border-2 border-dashed bg-surface-100 px-6 py-9 text-center transition-colors",
            dragging ? "border-accent bg-accent-soft" : "border-border-strong"
          )}
        >
          <Upload className="size-6 text-ink-muted" strokeWidth={1.75} />
          <p className="text-[15px] leading-5 font-semibold text-ink">Drop a CSV file here</p>
          <p className="text-body-sm text-ink-muted">or</p>
          <Button type="button" variant="outline" onClick={() => fileInput.current?.click()}>
            <FileText strokeWidth={1.75} />
            Choose file
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            aria-label="CSV file"
            onChange={(event) => void takeFile(event.target.files?.[0])}
          />
          <FieldHint>UTF-8 CSV, up to 2 MB and 5,000 rows. The first row must be the column headers.</FieldHint>
        </div>
        <FieldError role="alert">{fileError}</FieldError>
        {csv && (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-100 p-3" data-slot="csv-file">
            <FileText className="size-5 shrink-0 text-ink-muted" strokeWidth={1.75} />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-body font-medium text-ink">{csv.fileName}</span>
              <span className="text-caption text-ink-muted">
                {plural(csv.rows.length, "row")} · {plural(csv.headers.length, "column")}
              </span>
            </div>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove file" onClick={reset}>
              <X strokeWidth={1.75} />
            </Button>
          </div>
        )}
        <div className="flex justify-end">
          <Button type="button" disabled={!csv} onClick={() => setStep("map")}>
            Continue
            <ArrowRight strokeWidth={1.75} />
          </Button>
        </div>
      </div>
    );
  } else if (step === "map" && csv && mapping) {
    const roleOptions: ColumnRole[] = mapping.split ? ["ignore", "date", "note", "debit", "credit"] : ["ignore", "date", "note", "amount"];
    body = (
      <div className="flex flex-col gap-4">
        {activeAccounts.length === 0 ? (
          <p role="alert" className="rounded-md bg-pink-soft px-3 py-2.5 text-body-sm text-pink-ink">
            Add an account to import into first.{" "}
            <Link href="/finance/accounts" className="font-medium underline underline-offset-4">
              Go to Accounts
            </Link>
          </p>
        ) : null}
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex w-[240px] flex-col gap-1.5">
            <Label htmlFor="import-account">Import into account</Label>
            <NativeSelect id="import-account" value={accountId} onChange={(event) => setAccountId(event.target.value)}>
              {activeAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="flex w-[200px] flex-col gap-1.5">
            <Label htmlFor="import-date-format">Date format</Label>
            <NativeSelect
              id="import-date-format"
              value={mapping.dateFormat}
              onChange={(event) => setMapping({ ...mapping, dateFormat: event.target.value as DateFormat })}
            >
              {DATE_FORMATS.map((format) => (
                <option key={format} value={format}>
                  {format}
                </option>
              ))}
            </NativeSelect>
          </div>
          <label className="flex items-center gap-2 self-end pb-2.5 text-body text-ink">
            <Checkbox
              aria-label="Amounts are in separate Debit and Credit columns"
              checked={mapping.split}
              onCheckedChange={(checked) => setSplit(checked === true)}
            />
            Amounts are in separate Debit and Credit columns
          </label>
        </div>
        <div className="overflow-hidden rounded-lg border border-border bg-surface-100">
          <div aria-hidden="true" className="hidden h-9 grid-cols-[170px_minmax(0,1fr)_200px] items-center gap-4 border-b border-border bg-surface-200 px-4 text-label text-ink-muted sm:grid">
            <span>CSV column</span>
            <span>Sample values</span>
            <span>Maps to</span>
          </div>
          <ul aria-label="Columns">
            {csv.headers.map((header, column) => (
              <li
                key={`${header}-${column}`}
                className="grid grid-cols-[minmax(0,1fr)_180px] items-center gap-x-4 gap-y-0.5 border-b border-border px-4 py-2.5 last:border-b-0 sm:min-h-14 sm:grid-cols-[170px_minmax(0,1fr)_200px]"
              >
                <span className="truncate text-body font-medium text-ink">{header}</span>
                <span className="order-last col-span-2 truncate text-body-sm text-ink-muted sm:order-none sm:col-span-1">
                  {sampleValues(csv, column).join(", ") || "Empty"}
                </span>
                <NativeSelect aria-label={`Map ${header}`} value={mapping.roles[column]} onChange={(event) => setRole(column, event.target.value as ColumnRole)}>
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </NativeSelect>
              </li>
            ))}
          </ul>
        </div>
        <FieldHint>
          {mapping.split
            ? "Date, Debit and Credit are required. A debit is money out, a credit money in."
            : "Date and Amount are required; a negative amount is money out. Category can be set later."}
        </FieldHint>
        <FieldError role="alert">{problem ?? error}</FieldError>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setStep("upload")}>
            Back
          </Button>
          <Button type="button" disabled={Boolean(problem) || !accountId || isPending} onClick={toPreview}>
            {isPending ? "Checking…" : "Continue"}
            <ArrowRight strokeWidth={1.75} />
          </Button>
        </div>
      </div>
    );
  } else if (step === "preview" && mapped) {
    body = (
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-body font-semibold text-ink">{plural(previewRows.length + mapped.zero, "row")}</p>
          <p className="text-body-sm text-ink-muted" data-slot="preview-summary">
            {flaggedCount > 0 && `${plural(flaggedCount, "possible duplicate")} flagged · `}
            {plural(tickedCount, "transaction")} will be imported
            {mapped.unreadable.length > 0 && ` · ${plural(mapped.unreadable.length, "row")} can’t be read`}
            {mapped.zero > 0 && ` · ${plural(mapped.zero, "zero-amount row")} skipped`}
          </p>
        </div>
        <div className="overflow-hidden rounded-lg border border-border bg-surface-100">
          <div aria-hidden="true" className="hidden h-9 grid-cols-[20px_70px_minmax(0,1fr)_110px_230px] items-center gap-3.5 border-b border-border bg-surface-200 px-4 text-label text-ink-muted sm:grid">
            <span />
            <span>Date</span>
            <span>Note</span>
            <span className="text-right">Amount</span>
            <span>Status</span>
          </div>
          <ul aria-label="Rows to import" className="max-h-[520px] overflow-y-auto">
            {previewRows.map((item) =>
              item.type === "row" ? (
                <li
                  key={`r${item.row.line}`}
                  data-slot="preview-row"
                  data-status={item.flag ? "duplicate" : "new"}
                  className={cn(
                    "grid grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-x-3.5 gap-y-1 border-b border-border px-4 py-2.5 last:border-b-0 sm:min-h-[52px] sm:grid-cols-[20px_70px_minmax(0,1fr)_110px_230px]",
                    item.flag && "bg-pink-soft"
                  )}
                >
                  <Checkbox
                    aria-label={`Include line ${item.row.line}${item.row.note ? `, ${item.row.note}` : ""}`}
                    checked={ticked[item.index] ?? false}
                    onCheckedChange={(checked) =>
                      setTicked((current) => current.map((value, i) => (i === item.index ? checked === true : value)))
                    }
                  />
                  <span className="text-body-sm text-ink-muted">{formatDay(item.row.occurredOn)}</span>
                  <span className="col-span-2 row-start-2 min-w-0 truncate text-body font-medium text-ink sm:col-span-1 sm:row-start-auto">
                    {item.row.note ?? "No note"}
                  </span>
                  <Amount paise={item.row.amountPaise} kind={item.row.kind} className="text-right" />
                  <span className="col-span-2 sm:col-span-1">
                    {item.flag ? (
                      <Tag tone="pink">
                        <AlertCircle strokeWidth={1.75} />
                        Possible duplicate
                      </Tag>
                    ) : (
                      <Tag tone="teal">New</Tag>
                    )}
                  </span>
                </li>
              ) : (
                <li
                  key={`u${item.row.line}`}
                  data-slot="preview-row"
                  data-status="unreadable"
                  className="grid grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-x-3.5 gap-y-1 border-b border-border px-4 py-2.5 last:border-b-0 sm:min-h-[52px] sm:grid-cols-[20px_70px_minmax(0,1fr)_110px_230px]"
                >
                  <span />
                  <span className="text-body-sm text-ink-muted">Line {item.row.line}</span>
                  <span className="hidden sm:block" />
                  <span className="hidden sm:block" />
                  <span className="col-span-2 sm:col-span-1">
                    <Tag>Can’t read · {item.row.reason}</Tag>
                  </span>
                </li>
              )
            )}
          </ul>
        </div>
        <FieldHint>
          A possible duplicate has the same date, type and amount as a transaction already in this account, or as an earlier
          row in this file. Notes aren’t compared. Tick it to import it anyway.
        </FieldHint>
        <FieldError role="alert">{error}</FieldError>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" disabled={isPending} onClick={() => setStep("map")}>
            Back
          </Button>
          <Button type="button" disabled={tickedCount === 0 || isPending} onClick={runImport}>
            {isPending ? "Importing…" : `Import ${plural(tickedCount, "transaction")}`}
          </Button>
        </div>
      </div>
    );
  } else if (step === "done" && summary) {
    body = (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-surface-100 px-6 py-10 text-center" role="status">
        <span className="flex size-14 items-center justify-center rounded-full bg-teal-soft text-teal-ink">
          <Check className="size-6" strokeWidth={2} />
        </span>
        <p className="text-dialog-title text-ink">{plural(summary.inserted, "transaction")} imported</p>
        <p className="text-body-sm text-ink-muted">
          {summary.duplicatesLeftOut > 0
            ? `${plural(summary.duplicatesLeftOut, "possible duplicate")} ${summary.duplicatesLeftOut === 1 ? "was" : "were"} left out.`
            : "No possible duplicates were left out."}
          {summary.unreadable > 0 && ` ${plural(summary.unreadable, "row")} couldn’t be read.`}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Link href={transactionsHref({ month: importedMonth, account: accountId })} className={buttonVariants()}>
            View transactions
          </Link>
          <Button type="button" variant="outline" onClick={reset}>
            <Upload strokeWidth={1.75} />
            Import another file
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <BackLink href="/finance/transactions">Transactions</BackLink>
        <PageHeader title="Import CSV" description="Bring in a bank statement export. Amounts are read as ₹." className="mb-0" />
      </div>
      <StepBar current={step} />
      {body}
    </div>
  );
}
