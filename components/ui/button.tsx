import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils";

// One set of button variants (docs/05-design-system.md, v2 Amendment §C).
// `primary` and `soft` take a `tone` that carries the domain identity — violet
// (Todo, default), teal (Fitness), blue (Routines) — so every add/new action
// shares one shape and only the colour changes. To style a link as a button,
// pass the same props to buttonVariants: <Link className={buttonVariants({ tone: "teal" })} />.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-transparent text-button-text whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-pink [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary: "text-accent-ink",
        soft: "",
        secondary: "bg-surface-200 text-ink hover:bg-border-strong/50",
        outline: "border-border-strong bg-surface-100 text-ink hover:bg-surface-200",
        ghost: "text-ink-muted hover:bg-surface-200 hover:text-ink",
        destructive: "bg-pink text-white hover:bg-pink/90",
        link: "text-accent-text underline-offset-4 hover:underline",
      },
      tone: {
        violet: "",
        teal: "",
        blue: "",
      },
      size: {
        default: "h-[38px] px-4.5",
        sm: "h-8 px-3",
        xs: "h-6 gap-1 px-2 text-xs",
        lg: "h-11 px-5",
        icon: "size-[38px]",
        "icon-sm": "size-8",
        "icon-xs": "size-6",
        "icon-lg": "size-11",
      },
    },
    compoundVariants: [
      { variant: "primary", tone: "violet", class: "bg-accent hover:bg-accent-hover" },
      { variant: "primary", tone: "teal", class: "bg-teal hover:bg-teal/90" },
      { variant: "primary", tone: "blue", class: "bg-blue hover:bg-blue/90" },
      { variant: "soft", tone: "violet", class: "bg-accent-soft text-accent-text hover:bg-accent-soft/80" },
      { variant: "soft", tone: "teal", class: "bg-teal-soft text-teal-ink hover:bg-teal-soft/80" },
      { variant: "soft", tone: "blue", class: "bg-blue-soft text-blue-ink hover:bg-blue-soft/80" },
    ],
    defaultVariants: {
      variant: "primary",
      tone: "violet",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  tone,
  size,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, tone, size }), className)}
      {...props}
    />
  )
}

export { Button, buttonVariants }
