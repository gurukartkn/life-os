import { ThemeToggle } from "@/components/shell/theme-toggle";

// Screens without the sidebar keep the theme toggle top-right (Foundations mockup).
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-svh flex-1 items-center justify-center bg-surface-050 p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-[400px]">{children}</div>
    </div>
  );
}
