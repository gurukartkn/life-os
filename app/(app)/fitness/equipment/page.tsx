import { CatalogManager } from "@/components/fitness/catalog-manager";
import {
  archiveEquipment,
  createEquipment,
  deleteEquipment,
  renameEquipment,
  restoreEquipment,
} from "@/actions/equipment";
import { getCatalogItems, getCatalogUsage } from "@/lib/queries/fitness";
import { createClient } from "@/lib/supabase/server";

export default async function EquipmentPage() {
  const supabase = await createClient();
  const [items, usage] = await Promise.all([
    getCatalogItems(supabase, "equipment", { includeArchived: true }),
    getCatalogUsage(supabase, "equipment"),
  ]);

  return (
    <CatalogManager
      copy={{
        title: "Equipment",
        singular: "equipment",
        emptyDescription: "Add the equipment you train with to tag your exercises.",
      }}
      items={items}
      usage={usage}
      actions={{
        create: createEquipment,
        rename: renameEquipment,
        archive: archiveEquipment,
        restore: restoreEquipment,
        remove: deleteEquipment,
      }}
    />
  );
}
