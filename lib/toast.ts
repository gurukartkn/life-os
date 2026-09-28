import { toast } from "sonner";

// One place for the app's toast copy (docs/05-design-system.md voice: short,
// past tense, no exclamation marks). `label` is what the user would call the
// item — "Task", "Workout" — not its title, so reports never carry user content.
// The Toaster itself is mounted once in app/(app)/layout.tsx.
export const notify = {
  created: (label: string) => toast.success(`${label} created`),
  updated: (label: string) => toast.success(`${label} saved`),
  deleted: (label: string) => toast.success(`${label} deleted`),
  // Undo is wired up by the Recycle Bin (stage 8.3); without onUndo there is no button.
  trashed: (label: string, options: { onUndo?: () => void } = {}) =>
    toast.success(`${label} moved to Recycle Bin`, {
      action: options.onUndo ? { label: "Undo", onClick: options.onUndo } : undefined,
    }),
  restored: (label: string) => toast.success(`${label} restored`),
  error: (message: string) => toast.error(message),
};
