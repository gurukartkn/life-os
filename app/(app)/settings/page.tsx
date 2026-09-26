import { logout } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsCard, SettingsRow } from "@/components/settings/settings-row";
import { ExportDataButton } from "@/components/shell/export-data-button";
import { ThemeSwitch } from "@/components/shell/theme-switch";
import { userHasData } from "@/lib/has-data";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const [{ data: authData }, hasExportableData] = await Promise.all([
    supabase.auth.getClaims(),
    userHasData(supabase),
  ]);
  const email = authData?.claims?.email ?? "";

  return (
    <div className="flex flex-col">
      <PageHeader title="Settings" />
      <div className="flex max-w-[640px] flex-col gap-4">
        <SettingsCard title="Appearance">
          <SettingsRow title="Theme" description="Light or dark. Saved in this browser.">
            <ThemeSwitch size="md" />
          </SettingsRow>
        </SettingsCard>
        {/* Not rendered at all for an account with nothing to export (backlog #19). */}
        {hasExportableData && (
          <SettingsCard title="Data">
            <SettingsRow title="Export data" description="Download everything you have entered as one JSON file.">
              <ExportDataButton />
            </SettingsRow>
          </SettingsCard>
        )}
        <SettingsCard title="Account">
          <SettingsRow title="Signed in as" description={email}>
            <form action={logout}>
              <Button type="submit" variant="outline">
                Sign out
              </Button>
            </form>
          </SettingsRow>
        </SettingsCard>
      </div>
    </div>
  );
}
