"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { FieldValues } from "react-hook-form";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ConfirmDialog, type ConfirmIntent } from "@/components/entity/confirm-dialog";
import { restoreDrawerUrl } from "@/components/entity/use-entity-drawer";
import { useEntityForm, type EntityFormConfig } from "@/components/entity/use-entity-form";
import { notify } from "@/lib/toast";
import type { ActionResult } from "@/lib/types/action-result";

export type EntityDrawerProps<TValues extends FieldValues> = {
  open: boolean;
  /** Called when the drawer should close — normally useEntityDrawer().close. */
  onClose: () => void;
  /** Heading in read mode: the item's name. */
  title: React.ReactNode;
  description?: React.ReactNode;
  /** What the item is called in toasts: "Task" → "Task saved". */
  entityLabel: string;
  /** Read-mode details. */
  children: React.ReactNode;
  /** The edit form; `title` is its heading (default "Edit"). */
  edit: EntityFormConfig<TValues> & { title?: React.ReactNode };
  /** Omit to hide Delete. Confirmed through ConfirmDialog with `deleteIntent`. */
  onDelete?: () => Promise<ActionResult>;
  deleteIntent?: ConfirmIntent;
};

function EditForm<TValues extends FieldValues>({
  config,
  entityLabel,
  onSaved,
  onCancel,
  onDirtyChange,
}: {
  config: EntityFormConfig<TValues>;
  entityLabel: string;
  onSaved: () => void;
  onCancel: () => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const { children, ...formConfig } = config;
  const { form, submit, pending, formError } = useEntityForm({
    ...formConfig,
    onSuccess: () => {
      notify.updated(entityLabel);
      onSaved();
    },
  });
  const { isDirty } = form.formState;

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
      <SheetBody className="flex flex-col gap-4">
        {children(form)}
        <FieldError role="alert">{formError}</FieldError>
      </SheetBody>
      <SheetFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </SheetFooter>
    </form>
  );
}

// Right-hand drawer (a bottom sheet under 640px) for one item. It opens on the
// item's details; Edit swaps them for the form in place, Save returns to the details,
// and Delete confirms first. Leaving the form with unsaved changes — Cancel, close,
// Esc, the scrim or the browser's Back — asks before discarding them.
export function EntityDrawer<TValues extends FieldValues>({
  open,
  onClose,
  title,
  description,
  entityLabel,
  children,
  edit,
  onDelete,
  deleteIntent = "permanent",
}: EntityDrawerProps<TValues>) {
  const [mode, setMode] = useState<"read" | "edit">("read");
  const [dirty, setDirty] = useState(false);
  // What a confirmed discard should do: leave edit mode, or close the drawer.
  const [discard, setDiscard] = useState<"cancel" | "close" | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // Kept open after the URL closed it (Back) with unsaved edits, until they are
  // kept or discarded.
  const [held, setHeld] = useState(false);
  const drawerHrefRef = useRef<string | null>(null);

  const guarding = mode === "edit" && dirty;

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setHeld(false);
    } else if (guarding) {
      // Back with unsaved edits. The page has already seen the URL change (Next
      // handles popstate before anything else can), so hold the drawer open, put its
      // URL back and ask.
      setHeld(true);
      setDiscard("close");
    } else {
      // Each open starts in read mode.
      setMode("read");
      setDirty(false);
      setDiscard(null);
      setConfirmingDelete(false);
    }
  }

  // The drawer's own URL, to restore after a guarded Back.
  useEffect(() => {
    if (open) drawerHrefRef.current = window.location.href;
  }, [open]);

  useEffect(() => {
    if (held && !open && drawerHrefRef.current) restoreDrawerUrl(drawerHrefRef.current);
  }, [held, open]);

  function requestClose() {
    if (guarding) setDiscard("close");
    else onClose();
  }

  function requestCancel() {
    if (dirty) setDiscard("cancel");
    else setMode("read");
  }

  // Edit mode and the dirty flag are cleared before closing, so the URL change the
  // close makes is not mistaken for a guarded Back.
  function confirmDiscard() {
    const action = discard;
    setDiscard(null);
    setDirty(false);
    setMode("read");
    if (action === "close") {
      setHeld(false);
      onClose();
    }
  }

  return (
    <>
      <Sheet open={open || held} onOpenChange={(next) => !next && requestClose()}>
        <SheetContent side="responsive" data-slot="entity-drawer">
          <SheetHeader className="pr-14">
            <SheetTitle>{mode === "edit" ? (edit.title ?? "Edit") : title}</SheetTitle>
            {mode === "read" && description && <SheetDescription>{description}</SheetDescription>}
          </SheetHeader>
          {mode === "read" ? (
            <>
              <SheetBody>{children}</SheetBody>
              <SheetFooter className={onDelete ? "justify-between" : undefined}>
                {onDelete && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-pink-ink hover:text-pink-ink"
                    onClick={() => setConfirmingDelete(true)}
                  >
                    <Trash2 strokeWidth={1.75} />
                    Delete
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={() => setMode("edit")}>
                  <Pencil strokeWidth={1.75} />
                  Edit
                </Button>
              </SheetFooter>
            </>
          ) : (
            <EditForm
              config={edit}
              entityLabel={entityLabel}
              onSaved={() => {
                setDirty(false);
                setMode("read");
              }}
              onCancel={requestCancel}
              onDirtyChange={setDirty}
            />
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={discard !== null} onOpenChange={(next) => !next && setDiscard(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>Your edits haven&apos;t been saved.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <Button type="button" variant="destructive" onClick={confirmDiscard}>
              Discard
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {onDelete && (
        <ConfirmDialog
          open={confirmingDelete}
          onOpenChange={setConfirmingDelete}
          intent={deleteIntent}
          onConfirm={onDelete}
          onConfirmed={() => {
            if (deleteIntent === "trash") notify.trashed(entityLabel);
            else notify.deleted(entityLabel);
            onClose();
          }}
        />
      )}
    </>
  );
}
