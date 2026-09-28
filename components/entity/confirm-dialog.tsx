"use client";

import { useTransition } from "react";
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
import { notify } from "@/lib/toast";
import type { ActionResult } from "@/lib/types/action-result";

export type ConfirmIntent = "trash" | "permanent";

const COPY: Record<ConfirmIntent, { title: string; body: string; confirm: string; pending: string }> = {
  trash: {
    title: "Move to Recycle Bin?",
    body: "You can restore it from the Recycle Bin.",
    confirm: "Move to bin",
    pending: "Moving…",
  },
  permanent: {
    title: "Delete permanently?",
    body: "This can't be undone.",
    confirm: "Delete",
    pending: "Deleting…",
  },
};

export type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  intent: ConfirmIntent;
  /** The Server Action call. A failed result toasts its error and keeps the dialog open. */
  onConfirm: () => Promise<ActionResult>;
  /** Runs after a successful confirm, once the dialog has closed (toast here). */
  onConfirmed?: () => void;
  /** Replaces the intent's standard body line. */
  description?: React.ReactNode;
};

// "Are you sure?" for removing an item. The copy is fixed per intent so every module
// asks the same way; Cancel and Esc are no-ops while the action is running.
export function ConfirmDialog({ open, onOpenChange, intent, onConfirm, onConfirmed, description }: ConfirmDialogProps) {
  const [pending, startTransition] = useTransition();
  const copy = COPY[intent];

  function confirm() {
    startTransition(async () => {
      const result = await onConfirm();
      if (!result.success) {
        notify.error(result.error ?? "Something went wrong. Try again.");
        return;
      }
      onOpenChange(false);
      onConfirmed?.();
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.title}</AlertDialogTitle>
          <AlertDialogDescription>{description ?? copy.body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button
            type="button"
            variant={intent === "permanent" ? "destructive" : "primary"}
            disabled={pending}
            onClick={confirm}
          >
            {pending ? copy.pending : copy.confirm}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
