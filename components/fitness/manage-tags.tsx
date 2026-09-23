"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { CatalogManager } from "@/components/fitness/catalog-manager";
import {
  archiveMuscleGroup,
  createMuscleGroup,
  deleteMuscleGroup,
  renameMuscleGroup,
  restoreMuscleGroup,
} from "@/actions/muscle-groups";
import {
  archiveEquipment,
  createEquipment,
  deleteEquipment,
  renameEquipment,
  restoreEquipment,
} from "@/actions/equipment";
import type { CatalogItem } from "@/lib/fitness/catalog";

// A disclosure around the two catalog submodules, collapsed by default so the
// Exercises tab still reads as exercises-first.
export function ManageTags({
  muscleGroups,
  equipment,
}: {
  muscleGroups: CatalogItem[];
  equipment: CatalogItem[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        className="flex w-fit items-center gap-1.5 text-body-sm font-medium text-ink-muted transition-colors hover:text-ink"
      >
        {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        Manage muscle groups &amp; equipment
      </button>
      {isOpen && (
        <div className="grid gap-3 sm:grid-cols-2">
          <CatalogManager
            title="Muscle groups"
            items={muscleGroups}
            actions={{
              create: createMuscleGroup,
              rename: renameMuscleGroup,
              archive: archiveMuscleGroup,
              restore: restoreMuscleGroup,
              remove: deleteMuscleGroup,
            }}
          />
          <CatalogManager
            title="Equipment"
            items={equipment}
            actions={{
              create: createEquipment,
              rename: renameEquipment,
              archive: archiveEquipment,
              restore: restoreEquipment,
              remove: deleteEquipment,
            }}
          />
        </div>
      )}
    </div>
  );
}
