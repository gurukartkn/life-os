import { Sidebar } from "@/components/shell/sidebar";

export function AppShell({
  userEmail,
  children,
}: {
  userEmail: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      <Sidebar userEmail={userEmail} />
      {/* Content region: 24px top/bottom, 32px sides (shell mockup). */}
      <main className="min-w-0 flex-1 bg-surface-050 p-4 md:px-8 md:py-6">{children}</main>
    </div>
  );
}
