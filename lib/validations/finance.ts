import { z } from "zod";
import { isRealDate, MAX_PAISE, toPaise, type FinanceKind, type Frequency } from "@/lib/finance/money";
import type { Tables } from "@/lib/types/database";

// Finance inputs (Stage 5b), shared by the forms and the Server Actions, and the one
// place Finance moves between the app's camelCase and the tables' snake_case.

export const FINANCE_KINDS = ["expense", "income"] as const;
export const kindSchema = z.enum(FINANCE_KINDS);

export const FREQUENCIES = ["weekly", "monthly", "yearly"] as const;
export const frequencySchema = z.enum(FREQUENCIES);

const nameSchema = z.string().trim().min(1, "Enter a name.").max(100, "Keep the name under 100 characters.");

// Rupees as typed — "640", "1,240.50" — becoming whole paise. Above zero, at most two
// decimals.
export const amountSchema = z
  .string()
  .trim()
  .min(1, "Enter an amount.")
  .transform((value, ctx) => {
    const paise = toPaise(value);
    if (paise === null) {
      ctx.addIssue({ code: "custom", message: "Enter an amount like 640 or 640.50." });
      return z.NEVER;
    }
    if (paise === 0) {
      ctx.addIssue({ code: "custom", message: "Enter an amount above zero." });
      return z.NEVER;
    }
    if (paise > MAX_PAISE) {
      ctx.addIssue({ code: "custom", message: "That amount is too large." });
      return z.NEVER;
    }
    return paise;
  });

// A local calendar date ("YYYY-MM-DD", in the user's timezone). Past dates are fine.
const localDateSchema = z.string().refine(isRealDate, "Enter a valid date.");

const optionalId = z
  .uuid()
  .optional()
  .or(z.literal("").transform(() => undefined));

const optionalNote = z
  .string()
  .trim()
  .max(500, "Keep the note under 500 characters.")
  .optional()
  .transform((value) => (value ? value : undefined));

export const idSchema = z.uuid();

export const accountInputSchema = z.object({ name: nameSchema });
export const categoryInputSchema = z.object({ name: nameSchema, kind: kindSchema });
export const renameSchema = z.object({ id: z.uuid(), name: nameSchema });

export const transactionInputSchema = z.object({
  kind: kindSchema,
  amount: amountSchema,
  occurredOn: localDateSchema,
  accountId: z.uuid("Pick an account."),
  categoryId: optionalId,
  note: optionalNote,
});
export type TransactionInput = z.input<typeof transactionInputSchema>;
export type TransactionValues = z.output<typeof transactionInputSchema>;
export const transactionUpdateSchema = transactionInputSchema.extend({ id: z.uuid() });

export const budgetInputSchema = z.object({ categoryId: z.uuid("Pick a category."), amount: amountSchema });
export type BudgetInput = z.input<typeof budgetInputSchema>;

export const recurringInputSchema = z.object({
  name: nameSchema,
  kind: kindSchema,
  amount: amountSchema,
  accountId: z.uuid("Pick an account."),
  categoryId: z.uuid("Pick a category."),
  frequency: frequencySchema,
  nextOn: localDateSchema,
});
export type RecurringInput = z.input<typeof recurringInputSchema>;
export type RecurringValues = z.output<typeof recurringInputSchema>;
export const recurringUpdateSchema = recurringInputSchema.extend({ id: z.uuid() });

// One mapped CSV row as importCsv receives it (already in paise).
export const csvImportRowSchema = z.object({
  occurredOn: localDateSchema,
  kind: kindSchema,
  amountPaise: z.number().int().positive().max(MAX_PAISE),
  note: z.string().max(500).nullable(),
});
export type CsvImportRow = z.infer<typeof csvImportRowSchema>;

export const CSV_MAX_ROWS = 5000;

// ── Rows ↔ app shapes ────────────────────────────────────────────────────────────────

export type FinanceLabel = { id: string; name: string; isActive: boolean };
export type Account = FinanceLabel;
export type Category = FinanceLabel & { kind: FinanceKind };

export function toKind(value: string): FinanceKind {
  return value === "income" ? "income" : "expense";
}

export function toFrequency(value: string): Frequency {
  const parsed = frequencySchema.safeParse(value);
  return parsed.success ? parsed.data : "monthly";
}

export const ACCOUNT_COLUMNS = "id, name, is_active";
export const CATEGORY_COLUMNS = "id, name, kind, is_active";

export function accountFromRow(row: Pick<Tables<"finance_accounts">, "id" | "name" | "is_active">): Account {
  return { id: row.id, name: row.name, isActive: row.is_active };
}

export function categoryFromRow(row: Pick<Tables<"finance_categories">, "id" | "name" | "kind" | "is_active">): Category {
  return { id: row.id, name: row.name, kind: toKind(row.kind), isActive: row.is_active };
}

export type Transaction = {
  id: string;
  occurredOn: string;
  kind: FinanceKind;
  amountPaise: number;
  accountId: string;
  categoryId: string | null;
  note: string | null;
};

export const TRANSACTION_COLUMNS = "id, occurred_on, kind, amount_paise, account_id, category_id, note";

export function transactionFromRow(
  row: Pick<
    Tables<"transactions">,
    "id" | "occurred_on" | "kind" | "amount_paise" | "account_id" | "category_id" | "note"
  >
): Transaction {
  return {
    id: row.id,
    occurredOn: row.occurred_on,
    kind: toKind(row.kind),
    amountPaise: row.amount_paise,
    accountId: row.account_id,
    categoryId: row.category_id,
    note: row.note,
  };
}

export function transactionToRow(values: TransactionValues) {
  return {
    kind: values.kind,
    amount_paise: values.amount,
    occurred_on: values.occurredOn,
    account_id: values.accountId,
    category_id: values.categoryId ?? null,
    note: values.note ?? null,
  };
}

export type RecurringItem = {
  id: string;
  name: string;
  kind: FinanceKind;
  amountPaise: number;
  accountId: string;
  categoryId: string;
  frequency: Frequency;
  anchorDay: number;
  nextOn: string;
};

export const RECURRING_COLUMNS = "id, name, kind, amount_paise, account_id, category_id, frequency, anchor_day, next_on";

export function recurringFromRow(
  row: Pick<
    Tables<"recurring_items">,
    "id" | "name" | "kind" | "amount_paise" | "account_id" | "category_id" | "frequency" | "anchor_day" | "next_on"
  >
): RecurringItem {
  return {
    id: row.id,
    name: row.name,
    kind: toKind(row.kind),
    amountPaise: row.amount_paise,
    accountId: row.account_id,
    categoryId: row.category_id,
    frequency: toFrequency(row.frequency),
    anchorDay: row.anchor_day,
    nextOn: row.next_on,
  };
}

export function recurringToRow(values: RecurringValues, anchorDay: number) {
  return {
    name: values.name,
    kind: values.kind,
    amount_paise: values.amount,
    account_id: values.accountId,
    category_id: values.categoryId,
    frequency: values.frequency,
    anchor_day: anchorDay,
    next_on: values.nextOn,
  };
}
