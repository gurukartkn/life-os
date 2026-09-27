import { CircleAlert } from "lucide-react";
import { CsvImportWizard } from "@/components/finance/csv-import-wizard";
import { EmptyState } from "@/components/ui/empty-state";
import { RetryButton } from "@/components/ui/retry-button";
import { listLabels } from "@/lib/queries/finance";
import { createClient } from "@/lib/supabase/server";

export default async function FinanceImportPage() {
  const supabase = await createClient();
  const { accounts, error } = await listLabels(supabase);
  if (error) {
    return (
      <EmptyState
        tone="error"
        icon={CircleAlert}
        title="Couldn’t load your accounts"
        description="Check your connection and try again."
        action={<RetryButton />}
      />
    );
  }
  return <CsvImportWizard accounts={accounts} />;
}
