import { logout } from "@/actions/auth";
import { ProfileForm } from "@/components/settings/profile-form";
import { SettingsCard, SettingsRow } from "@/components/settings/settings-row";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { createClient } from "@/lib/supabase/server";
import { displayNameFor, initialsFor } from "@/lib/user-display";

// Who you are: initials avatar, display name (user_metadata.display_name), the
// read-only email, and signing out (moved from Settings › Account).
export default async function ProfilePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = data?.claims?.email ?? "";
  const displayName = displayNameFor(email, data?.claims?.user_metadata?.display_name);

  return (
    <div className="flex flex-col">
      <PageHeader title="Profile" />
      <div className="flex max-w-[640px] flex-col gap-4">
        <SettingsCard title="Your details">
          <div className="flex items-center gap-3">
            <Avatar size="lg">
              <AvatarFallback>{initialsFor(displayName)}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-heading text-ink">{displayName}</span>
              <span className="truncate text-body-sm text-ink-muted">{email}</span>
            </div>
          </div>
          <ProfileForm displayName={displayName} email={email} />
        </SettingsCard>
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
