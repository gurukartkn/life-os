import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Enter your email.").email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export const signupSchema = z.object({
  email: z.string().min(1, "Enter your email.").email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

// The sign-up form adds a confirm field; the match is checked in the browser only —
// the server action validates the credentials it actually uses (signupSchema).
export const signupFormSchema = signupSchema
  .extend({ confirmPassword: z.string().min(1, "Confirm your password.") })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type SignupFormInput = z.infer<typeof signupFormSchema>;
