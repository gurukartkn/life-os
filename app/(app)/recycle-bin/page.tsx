import { Trash2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

// Placeholder so the account menu's link works; the Recycle Bin is built in stage 8.3.
export default function RecycleBinPage() {
  return (
    <div className="flex flex-col">
      <PageHeader title="Recycle Bin" />
      <EmptyState icon={Trash2} title="Recycle Bin arrives in the next stage" description="Deleted items will wait here before they're gone for good." />
    </div>
  );
}
