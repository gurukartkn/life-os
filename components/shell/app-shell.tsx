import { Sidebar } from "@/components/shell/sidebar";

export function AppShell({
  userEmail,
  hasExportableData,
  children,
}: {
  userEmail: string;
  hasExportableData: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      <Sidebar userEmail={userEmail} hasExportableData={hasExportableData} />
      <main className="flex-1 bg-surface-050 p-4 md:p-8">{children}</main>
    </div>
  );
}
