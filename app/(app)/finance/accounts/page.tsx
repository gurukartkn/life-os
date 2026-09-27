import { LabelManager } from "@/components/finance/label-manager";
import { listAccountsWithCounts } from "@/lib/queries/finance";
import { createClient } from "@/lib/supabase/server";

export default async function FinanceAccountsPage() {
  const supabase = await createClient();
  const { accounts, error } = await listAccountsWithCounts(supabase);
  return <LabelManager mode="accounts" active={accounts.active} archived={accounts.archived} loadError={error} />;
}
