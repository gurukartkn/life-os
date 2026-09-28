import { z } from "zod";

export const displayNameSchema = z.object({
  display_name: z.string().trim().min(1, "Enter a name.").max(60, "Keep the name under 60 characters."),
});

function isTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export const timezoneSchema = z.object({
  timezone: z.string().min(1, "Choose a timezone.").refine(isTimeZone, "Choose a timezone from the list."),
});

export type DisplayNameInput = z.infer<typeof displayNameSchema>;
