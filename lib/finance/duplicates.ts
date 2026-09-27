import type { FinanceKind } from "@/lib/finance/money";

// Possible-duplicate detection for a CSV import. Pure, so the preview (in the browser)
// and importCsv (on the server, against a fresh read) run the same rule.
//
// A row is a possible duplicate when an existing transaction in the same account — the
// caller passes only that account's — or an earlier row in the same file has the same
// date, kind and amount. Notes are ignored: bank narrations rarely match what was typed
// by hand. Each existing transaction matches at most one incoming row, so a file with
// two identical ₹640 rows against one existing ₹640 flags the first as matching the
// existing one and the second as repeating the first.

export type DuplicateKey = { occurredOn: string; kind: FinanceKind; amountPaise: number };

// Why a row was flagged, or null when it is new.
export type DuplicateFlag = "existing" | "file" | null;

function keyOf(row: DuplicateKey): string {
  return `${row.occurredOn}|${row.kind}|${row.amountPaise}`;
}

export function flagDuplicates(incoming: DuplicateKey[], existing: DuplicateKey[]): DuplicateFlag[] {
  const unmatched = new Map<string, number>();
  for (const row of existing) {
    const key = keyOf(row);
    unmatched.set(key, (unmatched.get(key) ?? 0) + 1);
  }

  const seenInFile = new Set<string>();
  return incoming.map((row) => {
    const key = keyOf(row);
    const left = unmatched.get(key) ?? 0;
    let flag: DuplicateFlag = null;
    if (left > 0) {
      unmatched.set(key, left - 1);
      flag = "existing";
    } else if (seenInFile.has(key)) {
      flag = "file";
    }
    seenInFile.add(key);
    return flag;
  });
}
