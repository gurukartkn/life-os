import { describe, expect, it } from "vitest";
import { flagDuplicates, type DuplicateKey } from "./duplicates";

const row = (occurredOn: string, amountPaise: number, kind: DuplicateKey["kind"] = "expense"): DuplicateKey => ({
  occurredOn,
  kind,
  amountPaise,
});

describe("flagDuplicates", () => {
  it("flags a row matching an existing transaction on date, kind and amount", () => {
    expect(flagDuplicates([row("2026-09-22", 215000)], [row("2026-09-22", 215000)])).toEqual(["existing"]);
  });

  it("does not match on a different date, amount or kind", () => {
    const existing = [row("2026-09-22", 215000)];
    expect(
      flagDuplicates(
        [row("2026-09-21", 215000), row("2026-09-22", 215001), row("2026-09-22", 215000, "income")],
        existing
      )
    ).toEqual([null, null, null]);
  });

  it("flags a repeat of an earlier row in the same file", () => {
    expect(flagDuplicates([row("2026-09-22", 215000), row("2026-09-22", 215000)], [])).toEqual([null, "file"]);
  });

  it("matches each existing transaction to at most one incoming row", () => {
    const incoming = [row("2026-09-19", 124000), row("2026-09-19", 124000), row("2026-09-19", 124000)];
    const existing = [row("2026-09-19", 124000), row("2026-09-19", 124000)];
    expect(flagDuplicates(incoming, existing)).toEqual(["existing", "existing", "file"]);
  });

  it("an existing match is used up by the first row, and the second repeats it", () => {
    expect(flagDuplicates([row("2026-09-23", 64000), row("2026-09-23", 64000)], [row("2026-09-23", 64000)])).toEqual([
      "existing",
      "file",
    ]);
  });

  it("marks everything new when nothing matches", () => {
    expect(flagDuplicates([row("2026-09-01", 100), row("2026-09-02", 100)], [])).toEqual([null, null]);
  });
});
