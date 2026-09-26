import { CatalogManager } from "@/components/fitness/catalog-manager";
import {
  archiveMuscleGroup,
  createMuscleGroup,
  deleteMuscleGroup,
  renameMuscleGroup,
  restoreMuscleGroup,
} from "@/actions/muscle-groups";
import { getCatalogItems, getCatalogUsage } from "@/lib/queries/fitness";
import { createClient } from "@/lib/supabase/server";

export default async function MuscleGroupsPage() {
  const supabase = await createClient();
  const [items, usage] = await Promise.all([
    getCatalogItems(supabase, "muscle_groups", { includeArchived: true }),
    getCatalogUsage(supabase, "muscle_groups"),
  ]);

  return (
    <CatalogManager
      copy={{
        title: "Muscle Groups",
        singular: "muscle group",
        emptyDescription: "Add muscle groups to tag your exercises.",
      }}
      items={items}
      usage={usage}
      actions={{
        create: createMuscleGroup,
        rename: renameMuscleGroup,
        archive: archiveMuscleGroup,
        restore: restoreMuscleGroup,
        remove: deleteMuscleGroup,
      }}
    />
  );
}
