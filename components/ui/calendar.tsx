"use client"

import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon } from "lucide-react"
import { DayPicker, getDefaultClassNames, type DayButton } from "react-day-picker"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

// shadcn Calendar (react-day-picker), restyled to the component sheet's date
// picker: 38×36 day cells with radius-md and 13px tabular digits, the selected day
// an accent fill with semibold white text, today a 1px ink outline, outside-month
// days faint. The week starts on Monday to match the routine week boundary.
// Single-date selection only.
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  weekStartsOn = 1,
  components,
  formatters,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      weekStartsOn={weekStartsOn}
      captionLayout={captionLayout}
      className={cn("p-0 [--cell-radius:var(--radius-md)] [--cell-size:--spacing(8)]", className)}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn("relative flex flex-col gap-4", defaultClassNames.months),
        month: cn("flex w-full flex-col gap-1.5", defaultClassNames.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "size-(--cell-size) p-0 select-none aria-disabled:opacity-50",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "size-(--cell-size) p-0 select-none aria-disabled:opacity-50",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)",
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          "flex h-(--cell-size) w-full items-center justify-center gap-1.5 text-body",
          defaultClassNames.dropdowns
        ),
        caption_label: cn("text-body font-semibold text-ink select-none", defaultClassNames.caption_label),
        month_grid: cn("w-full border-collapse", defaultClassNames.month_grid),
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "flex h-6 flex-1 items-center justify-center text-label text-ink-muted select-none",
          defaultClassNames.weekday
        ),
        week: cn("flex w-full", defaultClassNames.week),
        day: cn(
          "group/day relative flex h-9 w-[42px] items-center justify-center p-0 text-center select-none",
          defaultClassNames.day
        ),
        today: cn("text-ink", defaultClassNames.today),
        outside: cn("text-ink-faint aria-selected:text-ink-faint", defaultClassNames.outside),
        disabled: cn("text-ink-faint opacity-50", defaultClassNames.disabled),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return <ChevronLeftIcon className={cn("size-4", className)} {...props} />
          }
          if (orientation === "right") {
            return <ChevronRightIcon className={cn("size-4", className)} {...props} />
          }
          return <ChevronDownIcon className={cn("size-4", className)} {...props} />
        },
        DayButton: CalendarDayButton,
        ...components,
      }}
      formatters={{
        // Single-letter weekday headers (M T W T F S S), as in the component sheet.
        formatWeekdayName: (date) => date.toLocaleDateString("en-GB", { weekday: "narrow" }),
        ...formatters,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({ className, day, modifiers, ...props }: React.ComponentProps<typeof DayButton>) {
  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <button
      ref={ref}
      type="button"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={modifiers.selected}
      data-today={modifiers.today}
      className={cn(
        "flex h-9 w-[38px] items-center justify-center rounded-(--cell-radius) border border-transparent text-[13px] tabular-nums outline-none transition-colors hover:bg-surface-200 focus-visible:ring-2 focus-visible:ring-ring data-[today=true]:border-ink data-[selected-single=true]:border-transparent data-[selected-single=true]:bg-accent data-[selected-single=true]:font-semibold data-[selected-single=true]:text-accent-ink data-[selected-single=true]:hover:bg-accent-hover",
        className
      )}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }
