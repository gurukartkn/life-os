"use client";

import { startTransition, useActionState, useEffect, useEffectEvent } from "react";
import { useForm, type DefaultValues, type FieldValues, type Path, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import type { ActionResult } from "@/lib/types/action-result";

// A Server Action in the useActionState shape (ADR-005).
export type EntityFormAction = (prevState: ActionResult, formData: FormData) => Promise<ActionResult>;

// What a module hands EntityCreateDialog / EntityDrawer to build its form: the shared
// Zod schema, starting values, the action, how values become FormData, and the fields.
export type EntityFormConfig<TValues extends FieldValues> = {
  schema: z.ZodType<TValues, TValues>;
  defaultValues: DefaultValues<TValues>;
  action: EntityFormAction;
  toFormData: (values: TValues) => FormData;
  children: (form: UseFormReturn<TValues>) => React.ReactNode;
};

const initialState: ActionResult = { success: false };

// React Hook Form + useActionState, wired once: client-side Zod errors show under the
// fields; a server `fieldErrors` entry for a field on this form goes under that field,
// anything else shows as `formError`. `onSuccess` runs once per successful submit.
export function useEntityForm<TValues extends FieldValues>({
  schema,
  defaultValues,
  action,
  toFormData,
  onSuccess,
}: Omit<EntityFormConfig<TValues>, "children"> & { onSuccess: () => void }) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const form = useForm<TValues>({ resolver: zodResolver(schema), defaultValues });

  const fieldNames = Object.keys(defaultValues ?? {});
  const serverFieldErrors = Object.entries(state.fieldErrors ?? {}).filter(([name]) => fieldNames.includes(name));

  const handleResult = useEffectEvent((result: ActionResult) => {
    if (result.success) {
      onSuccess();
      return;
    }
    for (const [name, message] of serverFieldErrors) {
      form.setError(name as Path<TValues>, { type: "server", message });
    }
  });

  useEffect(() => {
    if (state !== initialState) handleResult(state);
  }, [state]);

  const submit = form.handleSubmit((values) => {
    startTransition(() => formAction(toFormData(values)));
  });

  return {
    form,
    submit,
    pending,
    formError: !state.success && serverFieldErrors.length === 0 ? state.error : undefined,
  };
}
