import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shell/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  // getClaims() verifies the session JWT locally (no Auth round trip); the proxy
  // has already refreshed an expired token, and RLS scopes every query regardless.
  const { data: authData } = await supabase.auth.getClaims();

  const claims = authData?.claims;
  if (!claims) {
    redirect("/login");
  }

  return <AppShell userEmail={claims.email ?? ""}>{children}</AppShell>;
}
