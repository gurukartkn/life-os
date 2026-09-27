import { redirect } from "next/navigation";

// Finance opens on its Overview tab.
export default function FinancePage() {
  redirect("/finance/overview");
}
