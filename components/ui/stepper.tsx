"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

// A small number field stepped with − / + (routine "N times a week", item "every Nth"):
// input-styled, 40px tall, the value in semibold tabular digits between two ghost buttons.
export function Stepper({
  value,
  min,
  max,
  onChange,
  decreaseLabel,
  increaseLabel,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  decreaseLabel: string;
  increaseLabel: string;
}) {
  return (
    <div className="inline-flex h-10 shrink-0 items-center rounded-md border border-border-strong bg-surface-100 px-0.5">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={decreaseLabel}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <Minus strokeWidth={1.75} />
      </Button>
      <output aria-live="polite" className="w-8 text-center text-body font-semibold text-ink tabular-nums">
        {value}
      </output>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={increaseLabel}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <Plus strokeWidth={1.75} />
      </Button>
    </div>
  );
}
