"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

// Password field with a show/hide toggle (backlog #1). Hidden by default; the
// toggle is a plain 32px ghost icon button (type="button") inside the field, so it
// never submits the form. `toggleNoun` names what it reveals, keeping two toggles
// on one form (password, confirm password) distinct for assistive tech.
export function PasswordInput({
  className,
  toggleNoun = "password",
  ...props
}: Omit<React.ComponentProps<"input">, "type"> & { toggleNoun?: string }) {
  const [visible, setVisible] = React.useState(false);

  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className={cn("pr-11", className)} />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? `Hide ${toggleNoun}` : `Show ${toggleNoun}`}
        aria-pressed={visible}
        className="absolute top-1 right-1 flex size-8 items-center justify-center rounded-md text-ink outline-none transition-colors hover:bg-surface-200 focus-visible:ring-2 focus-visible:ring-ring"
      >
        {visible ? <EyeOff className="size-4" strokeWidth={1.75} /> : <Eye className="size-4" strokeWidth={1.75} />}
      </button>
    </div>
  );
}
