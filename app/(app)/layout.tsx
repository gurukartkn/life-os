import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { userHasData } from "@/lib/has-data";
import { AppShell } from "@/components/shell/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  // Independent, so they run together: the session check, and whether Export data
  // has anything to export (the sidebar hides it for an empty account).
  // getClaims() verifies the session JWT locally (no Auth round trip); the proxy
  // has already refreshed an expired token, and RLS scopes every query regardless.
  const [{ data: authData }, hasExportableData] = await Promise.all([
    supabase.auth.getClaims(),
    userHasData(supabase),
  ]);

  const claims = authData?.claims;
  if (!claims) {
    redirect("/login");
  }

  return (
    <AppShell userEmail={claims.email ?? ""} hasExportableData={hasExportableData}>
      {children}
    </AppShell>
  );
}
