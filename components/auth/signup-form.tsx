"use client";

import { startTransition, useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signup } from "@/actions/auth";
import { signupSchema, type SignupInput } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/auth/password-input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/types/action-result";

const initialState: ActionResult<string> = { success: false };

export function SignupForm() {
  const [state, formAction, isPending] = useActionState(signup, initialState);
  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit(values: SignupInput) {
    const formData = new FormData();
    formData.append("email", values.email);
    formData.append("password", values.password);
    startTransition(() => formAction(formData));
  }

  if (state.success) {
    return <p className="text-body text-ink-muted">{state.data}</p>;
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
        {form.formState.errors.email && (
          <p className="text-caption text-pink-ink">{form.formState.errors.email.message}</p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          id="password"
          autoComplete="new-password"
          {...form.register("password")}
        />
        {form.formState.errors.password && (
          <p className="text-caption text-pink-ink">{form.formState.errors.password.message}</p>
        )}
      </div>
      {state.error && <p className="text-caption text-pink-ink">{state.error}</p>}
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
