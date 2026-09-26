"use client";

import { startTransition, useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signup } from "@/actions/auth";
import { signupFormSchema, type SignupFormInput } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldHint } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/auth/password-input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/types/action-result";

const initialState: ActionResult<string> = { success: false };

export function SignupForm() {
  const [state, formAction, isPending] = useActionState(signup, initialState);
  const form = useForm<SignupFormInput>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });
  const { errors } = form.formState;

  function onSubmit(values: SignupFormInput) {
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
      <Field>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={errors.email ? true : undefined}
          {...form.register("email")}
        />
        <FieldError>{errors.email?.message}</FieldError>
      </Field>
      <Field>
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          id="password"
          autoComplete="new-password"
          aria-invalid={errors.password ? true : undefined}
          aria-describedby="password-hint"
          {...form.register("password")}
        />
        {errors.password ? (
          <FieldError id="password-hint">{errors.password.message}</FieldError>
        ) : (
          <FieldHint id="password-hint">At least 8 characters.</FieldHint>
        )}
      </Field>
      <Field>
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <PasswordInput
          id="confirmPassword"
          autoComplete="new-password"
          toggleNoun="confirm password"
          aria-invalid={errors.confirmPassword ? true : undefined}
          {...form.register("confirmPassword")}
        />
        <FieldError>{errors.confirmPassword?.message}</FieldError>
      </Field>
      <FieldError>{state.error}</FieldError>
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
