import { describe, expect, it } from "vitest";
import { displayNameFor, initialsFor } from "./user-display";
import { validationFailure } from "./validations/field-errors";
import { displayNameSchema } from "./validations/profile";

describe("displayNameFor", () => {
  it("prefers user_metadata.display_name, trimmed", () => {
    expect(displayNameFor("me@example.com", "  Guru K ")).toBe("Guru K");
  });

  it("falls back to the part of the email before the @", () => {
    expect(displayNameFor("guru.karthik@example.com", undefined)).toBe("guru.karthik");
    expect(displayNameFor("guru@example.com", "   ")).toBe("guru");
    expect(displayNameFor("guru@example.com", 42)).toBe("guru");
  });
});

describe("initialsFor", () => {
  it("takes the first and last word of a name", () => {
    expect(initialsFor("Guru Venkat Karthik")).toBe("GK");
  });

  it("splits a handle on dots, dashes and underscores", () => {
    expect(initialsFor("guru.karthik")).toBe("GK");
    expect(initialsFor("guru")).toBe("GU");
    expect(initialsFor("")).toBe("?");
  });
});

describe("validationFailure", () => {
  it("keeps the first message overall and the first per field", () => {
    const parsed = displayNameSchema.safeParse({ display_name: "   " });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;

    expect(validationFailure(parsed.error)).toEqual({
      success: false,
      error: "Enter a name.",
      fieldErrors: { display_name: "Enter a name." },
    });
  });
});
