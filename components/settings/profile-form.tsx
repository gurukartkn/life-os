"use client";

import { updateDisplayName } from "@/actions/profile";
import { useEntityForm } from "@/components/entity/use-entity-form";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldHint } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { notify } from "@/lib/toast";
import { displayNameSchema } from "@/lib/validations/profile";

// Display name (editable) and email (read-only) on /profile.
export function ProfileForm({ displayName, email }: { displayName: string; email: string }) {
  const { form, submit, pending, formError } = useEntityForm({
    schema: displayNameSchema,
    defaultValues: { display_name: displayName },
    action: updateDisplayName,
    toFormData: (values) => {
      const formData = new FormData();
      formData.append("display_name", values.display_name);
      return formData;
    },
    onSuccess: () => {
      notify.updated("Profile");
      form.reset(form.getValues());
    },
  });
  const { errors, isDirty } = form.formState;

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <Field>
        <Label htmlFor="profile-name">Display name</Label>
        <Input
          id="profile-name"
          autoComplete="name"
          // In the server HTML too, not only once React Hook Form sets it after hydration.
          defaultValue={displayName}
          aria-invalid={errors.display_name ? true : undefined}
          {...form.register("display_name")}
        />
        <FieldError>{errors.display_name?.message}</FieldError>
      </Field>
      <Field>
        <Label htmlFor="profile-email">Email</Label>
        <Input id="profile-email" value={email} readOnly disabled />
        <FieldHint>Your sign-in email can&apos;t be changed here.</FieldHint>
      </Field>
      <FieldError role="alert">{formError}</FieldError>
      <div>
        <Button type="submit" disabled={pending || !isDirty}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
