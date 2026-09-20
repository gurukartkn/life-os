import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { userHasData } from "@/lib/has-data";
import { AppShell } from "@/components/shell/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  // Independent, so they run together: the auth check, and whether Export data
  // has anything to export (the sidebar hides it for an empty account).
  const [
    {
      data: { user },
    },
    hasExportableData,
  ] = await Promise.all([supabase.auth.getUser(), userHasData(supabase)]);

  if (!user) {
    redirect("/login");
  }

  return (
    <AppShell userEmail={user.email ?? ""} hasExportableData={hasExportableData}>
      {children}
    </AppShell>
  );
}
