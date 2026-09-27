import { RecurringView } from "@/components/finance/recurring-view";
import { todayIso } from "@/lib/dates";
import { listLabels, listRecurring } from "@/lib/queries/finance";
import { getUserTimezone } from "@/lib/queries/user-settings";
import { createClient } from "@/lib/supabase/server";

export default async function FinanceRecurringPage() {
  const supabase = await createClient();
  const today = todayIso(await getUserTimezone(supabase));
  const [recurring, labels] = await Promise.all([listRecurring(supabase, today), listLabels(supabase)]);
  return (
    <RecurringView
      items={recurring.items}
      accounts={labels.accounts}
      categories={labels.categories}
      today={today}
      loadError={recurring.error || labels.error}
    />
  );
}
