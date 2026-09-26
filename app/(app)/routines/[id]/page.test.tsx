import { describe, expect, it, vi } from "vitest";
import RoutinePage from "./page";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

describe("RoutinePage", () => {
  it("sends the old checklist URL to the routine's editor", async () => {
    await expect(RoutinePage({ params: Promise.resolve({ id: "r1" }) })).rejects.toThrow("NEXT_REDIRECT:/routines/r1/edit");
  });
});
