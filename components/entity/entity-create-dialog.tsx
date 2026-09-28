"use client";

import type { FieldValues } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { FieldError } from "@/components/ui/field";
import { useEntityForm, type EntityFormConfig } from "@/components/entity/use-entity-form";
import { notify } from "@/lib/toast";

export type EntityCreateDialogProps<TValues extends FieldValues> = EntityFormConfig<TValues> & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** What the item is called in the toast: "Task" → "Task created". */
  entityLabel: string;
  submitLabel?: string;
  onCreated?: () => void;
};

function CreateForm<TValues extends FieldValues>({
  onOpenChange,
  title,
  description,
  entityLabel,
  submitLabel = "Create",
  onCreated,
  children,
  ...config
}: Omit<EntityCreateDialogProps<TValues>, "open">) {
  const { form, submit, pending, formError } = useEntityForm({
    ...config,
    onSuccess: () => {
      notify.created(entityLabel);
      onCreated?.();
      onOpenChange(false);
    },
  });

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <DialogHeader title={title} description={description} />
      <div className="flex flex-col gap-4">
        {children(form)}
        <FieldError role="alert">{formError}</FieldError>
      </div>
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="ghost" />}>Cancel</DialogClose>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}

// Modal for creating an item with a Server Action. The form is mounted only while the
// dialog is open, so every open starts from `defaultValues` with no leftover errors.
export function EntityCreateDialog<TValues extends FieldValues>({ open, ...props }: EntityCreateDialogProps<TValues>) {
  return (
    <Dialog open={open} onOpenChange={props.onOpenChange}>
      <DialogContent>{open && <CreateForm {...props} />}</DialogContent>
    </Dialog>
  );
}
