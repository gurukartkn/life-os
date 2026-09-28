import type { z } from "zod";
import type { ActionResult } from "@/lib/types/action-result";

// A failed safeParse as an ActionResult: the first message overall as `error`, and
// the first message per top-level field as `fieldErrors` (lib/types/action-result.ts).
export function validationFailure(error: z.ZodError): ActionResult {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !(field in fieldErrors)) fieldErrors[field] = issue.message;
  }
  return { success: false, error: error.issues[0]?.message, fieldErrors };
}
