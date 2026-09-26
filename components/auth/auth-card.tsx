import Link from "next/link";

// The log in / sign up card (Foundations mockup): 400px, 32px padding, the logo
// mark and name, a page-title heading with a muted line, the form, and a centred
// "switch screens" line under it.
export function AuthCard({
  title,
  description,
  footerText,
  footerLinkLabel,
  footerHref,
  children,
}: {
  title: string;
  description: string;
  footerText: string;
  footerLinkLabel: string;
  footerHref: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full flex-col gap-4 rounded-lg border border-border bg-surface-100 p-8">
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="flex size-7 items-center justify-center rounded-sm bg-accent text-[13px] leading-[18px] font-bold text-accent-ink"
        >
          L
        </span>
        <span className="text-heading text-ink">Life OS</span>
      </div>
      <div className="flex flex-col gap-0.5">
        <h1 className="text-page-title text-ink">{title}</h1>
        <p className="text-body-sm text-ink-muted">{description}</p>
      </div>
      {children}
      <p className="flex items-center justify-center gap-1.5 text-body-sm">
        <span className="text-ink-muted">{footerText}</span>
        <Link href={footerHref} className="font-semibold text-accent-text hover:underline">
          {footerLinkLabel}
        </Link>
      </p>
    </div>
  );
}
