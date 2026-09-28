import { SettingsCard, SettingsRow } from "@/components/settings/settings-row";
import { TimezoneSelect } from "@/components/settings/timezone-select";
import { ExportDataButton } from "@/components/shell/export-data-button";
import { ThemeSwitch } from "@/components/shell/theme-switch";
import { PageHeader } from "@/components/ui/page-header";
import { userHasData } from "@/lib/has-data";
import { getUserTimezone } from "@/lib/queries/user-settings";
import { createClient } from "@/lib/supabase/server";

// Every IANA zone the runtime knows, plus UTC (the default, missing from some
// engines' lists) and the saved zone, whatever it is.
function timezoneOptions(current: string): string[] {
  const zones = Intl.supportedValuesOf("timeZone");
  const extra = [...new Set(["UTC", current])].filter((zone) => !zones.includes(zone));
  return [...extra, ...zones];
}

// How the app behaves: theme (was the nav switch and Settings › Appearance),
// timezone (user_settings.timezone, new here) and data export (was Settings › Data).
export default async function PreferencesPage() {
  const supabase = await createClient();
  const [timezone, hasExportableData] = await Promise.all([getUserTimezone(supabase), userHasData(supabase)]);

  return (
    <div className="flex flex-col">
      <PageHeader title="Preferences" />
      <div className="flex max-w-[640px] flex-col gap-4">
        <SettingsCard title="Appearance">
          <SettingsRow title="Theme" description="Light or dark. Saved in this browser.">
            <ThemeSwitch size="md" />
          </SettingsRow>
        </SettingsCard>
        <SettingsCard title="Date and time">
          <SettingsRow title="Timezone" description="Decides when your day starts and ends.">
            <TimezoneSelect value={timezone} options={timezoneOptions(timezone)} />
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
      </div>
    </div>
  );
}
