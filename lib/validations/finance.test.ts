import { describe, expect, it } from "vitest";
import {
  budgetInputSchema,
  categoryInputSchema,
  csvImportRowSchema,
  recurringInputSchema,
  transactionInputSchema,
} from "./finance";

const ACCOUNT = "7a1c7c1e-6a0e-4b8e-9d1a-0c6b0f3b2a11";
const CATEGORY = "0b8f3a2c-1d4e-4f6a-8b9c-2d3e4f5a6b7c";

const transaction = (overrides: Record<string, unknown> = {}) => ({
  kind: "expense",
  amount: "640",
  occurredOn: "2026-09-23",
  accountId: ACCOUNT,
  categoryId: CATEGORY,
  note: "Swiggy dinner",
  ...overrides,
});

describe("transactionInputSchema", () => {
  it("turns rupees as typed into paise", () => {
    const parsed = transactionInputSchema.parse(transaction({ amount: "1,240.50" }));
    expect(parsed.amount).toBe(124050);
  });

  it.each(["0", "0.00", "-5"])("refuses %j as an amount", (amount) => {
    expect(transactionInputSchema.safeParse(transaction({ amount })).success).toBe(false);
  });

  it("refuses more than two decimals", () => {
    const result = transactionInputSchema.safeParse(transaction({ amount: "640.505" }));
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Enter an amount like 640 or 640.50.");
  });

  it("says zero is not an amount", () => {
    expect(transactionInputSchema.safeParse(transaction({ amount: "0" })).error?.issues[0]?.message).toBe(
      "Enter an amount above zero."
    );
  });

  it("refuses an unknown kind", () => {
    expect(transactionInputSchema.safeParse(transaction({ kind: "transfer" })).success).toBe(false);
  });

  it("allows a past date and refuses an impossible one", () => {
    expect(transactionInputSchema.safeParse(transaction({ occurredOn: "2020-01-01" })).success).toBe(true);
    expect(transactionInputSchema.safeParse(transaction({ occurredOn: "2026-02-30" })).success).toBe(false);
  });

  it("treats an empty category and note as none, and caps the note at 500", () => {
    const parsed = transactionInputSchema.parse(transaction({ categoryId: "", note: "  " }));
    expect(parsed.categoryId).toBeUndefined();
    expect(parsed.note).toBeUndefined();
    expect(transactionInputSchema.safeParse(transaction({ note: "x".repeat(501) })).success).toBe(false);
  });
});

describe("other inputs", () => {
  it("categories need a non-blank name and a known kind", () => {
    expect(categoryInputSchema.safeParse({ name: "  Groceries ", kind: "expense" }).data?.name).toBe("Groceries");
    expect(categoryInputSchema.safeParse({ name: "   ", kind: "expense" }).success).toBe(false);
    expect(categoryInputSchema.safeParse({ name: "Gifts", kind: "savings" }).success).toBe(false);
  });

  it("budgets refuse zero and negative amounts", () => {
    expect(budgetInputSchema.safeParse({ categoryId: CATEGORY, amount: "0" }).success).toBe(false);
    expect(budgetInputSchema.safeParse({ categoryId: CATEGORY, amount: "-100" }).success).toBe(false);
    expect(budgetInputSchema.parse({ categoryId: CATEGORY, amount: "10000" }).amount).toBe(1000000);
  });

  it("recurring items refuse an unknown frequency", () => {
    const item = {
      name: "Rent",
      kind: "expense",
      amount: "20000",
      accountId: ACCOUNT,
      categoryId: CATEGORY,
      frequency: "monthly",
      nextOn: "2026-10-01",
    };
    expect(recurringInputSchema.safeParse(item).success).toBe(true);
    expect(recurringInputSchema.safeParse({ ...item, frequency: "daily" }).success).toBe(false);
    expect(recurringInputSchema.safeParse({ ...item, kind: "loan" }).success).toBe(false);
  });

  it("CSV rows must carry whole positive paise", () => {
    const row = { occurredOn: "2026-09-23", kind: "expense", amountPaise: 64000, note: null };
    expect(csvImportRowSchema.safeParse(row).success).toBe(true);
    expect(csvImportRowSchema.safeParse({ ...row, amountPaise: 0 }).success).toBe(false);
    expect(csvImportRowSchema.safeParse({ ...row, amountPaise: 640.5 }).success).toBe(false);
  });
});
