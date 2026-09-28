"use client";

import { useState, useTransition } from "react";
import { updateTimezone } from "@/actions/profile";
import { NativeSelect } from "@/components/ui/native-select";
import { notify } from "@/lib/toast";

// Timezone picker on /preferences: saves as soon as a zone is chosen, and goes back
// to the saved zone if that fails.
export function TimezoneSelect({ value, options }: { value: string; options: string[] }) {
  const [selected, setSelected] = useState(value);
  const [pending, startTransition] = useTransition();

  function handleChange(next: string) {
    const previous = selected;
    setSelected(next);
    startTransition(async () => {
      const result = await updateTimezone(next);
      if (result.success) {
        notify.updated("Timezone");
      } else {
        setSelected(previous);
        notify.error(result.error ?? "Couldn't save your timezone. Try again.");
      }
    });
  }

  return (
    <NativeSelect
      aria-label="Timezone"
      className="w-56"
      value={selected}
      disabled={pending}
      onChange={(event) => handleChange(event.target.value)}
    >
      {options.map((zone) => (
        <option key={zone} value={zone}>
          {zone.replaceAll("_", " ")}
        </option>
      ))}
    </NativeSelect>
  );
}
