"use server";

import {
  createCatalogItem,
  createOrGetCatalogItem,
  deleteCatalogItem,
  renameCatalogItem,
  setCatalogItemActive,
  type CatalogItem,
  type CatalogResult,
} from "@/lib/fitness/catalog";
import type { MuscleGroupInput } from "@/lib/validations/fitness";

export async function createMuscleGroup(input: MuscleGroupInput): Promise<CatalogResult<CatalogItem>> {
  return createCatalogItem("muscle_groups", input);
}

// The inline "add it while tagging an exercise" action: a name that already exists
// (ignoring case) returns the existing muscle group instead of an error.
export async function createMuscleGroupInline(
  input: MuscleGroupInput
): Promise<CatalogResult<CatalogItem>> {
  return createOrGetCatalogItem("muscle_groups", input);
}

export async function renameMuscleGroup(id: string, name: string): Promise<CatalogResult<CatalogItem>> {
  return renameCatalogItem("muscle_groups", { id, name });
}

export async function archiveMuscleGroup(id: string): Promise<CatalogResult<CatalogItem>> {
  return setCatalogItemActive("muscle_groups", id, false);
}

export async function restoreMuscleGroup(id: string): Promise<CatalogResult<CatalogItem>> {
  return setCatalogItemActive("muscle_groups", id, true);
}

export async function deleteMuscleGroup(id: string): Promise<CatalogResult> {
  return deleteCatalogItem("muscle_groups", id);
}
