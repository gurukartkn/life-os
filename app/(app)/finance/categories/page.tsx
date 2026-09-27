import { LabelManager } from "@/components/finance/label-manager";
import { listCategoriesWithCounts } from "@/lib/queries/finance";
import { createClient } from "@/lib/supabase/server";

export default async function FinanceCategoriesPage() {
  const supabase = await createClient();
  const { categories, error } = await listCategoriesWithCounts(supabase);
  return <LabelManager mode="categories" active={categories.active} archived={categories.archived} loadError={error} />;
}
