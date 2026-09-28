import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shell/app-shell";
import { displayNameFor } from "@/lib/user-display";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  // getClaims() verifies the session JWT locally (no Auth round trip); the proxy
  // has already refreshed an expired token, and RLS scopes every query regardless.
  const { data: authData } = await supabase.auth.getClaims();

  const claims = authData?.claims;
  if (!claims) {
    redirect("/login");
  }

  const email = claims.email ?? "";
  const user = { email, displayName: displayNameFor(email, claims.user_metadata?.display_name) };

  return <AppShell user={user}>{children}</AppShell>;
}
