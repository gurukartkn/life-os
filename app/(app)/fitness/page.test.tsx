import { describe, expect, it, vi } from "vitest";
import FitnessPage from "./page";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

describe("FitnessPage", () => {
  it("lands on Workouts", async () => {
    await expect(FitnessPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("NEXT_REDIRECT:/fitness/workouts");
  });

  it("sends the old ?tab=exercises link to Exercises", async () => {
    await expect(FitnessPage({ searchParams: Promise.resolve({ tab: "exercises" }) })).rejects.toThrow(
      "NEXT_REDIRECT:/fitness/exercises"
    );
  });
});
