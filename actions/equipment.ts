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
import type { EquipmentInput } from "@/lib/validations/fitness";

export async function createEquipment(input: EquipmentInput): Promise<CatalogResult<CatalogItem>> {
  return createCatalogItem("equipment", input);
}

// The inline "add it while tagging an exercise" action: a name that already exists
// (ignoring case) returns the existing equipment instead of an error.
export async function createEquipmentInline(
  input: EquipmentInput
): Promise<CatalogResult<CatalogItem>> {
  return createOrGetCatalogItem("equipment", input);
}

export async function renameEquipment(id: string, name: string): Promise<CatalogResult<CatalogItem>> {
  return renameCatalogItem("equipment", { id, name });
}

export async function archiveEquipment(id: string): Promise<CatalogResult<CatalogItem>> {
  return setCatalogItemActive("equipment", id, false);
}

export async function restoreEquipment(id: string): Promise<CatalogResult<CatalogItem>> {
  return setCatalogItemActive("equipment", id, true);
}

export async function deleteEquipment(id: string): Promise<CatalogResult> {
  return deleteCatalogItem("equipment", id);
}
