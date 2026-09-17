import { Sidebar } from "@/components/shell/sidebar";

export function AppShell({
  userEmail,
  children,
}: {
  userEmail: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh">
      <Sidebar userEmail={userEmail} />
      <main className="flex-1 bg-surface-050 p-8">{children}</main>
    </div>
  );
}
