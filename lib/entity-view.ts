// The entity drawer's URL state, `?view=<type>:<id>` (components/entity/use-entity-drawer.ts).
// Kept out of the client hook's module so Server Components can build links with it.
export const VIEW_PARAM = "view";

export type EntityView = { type: string; id: string };

// `?view=<type>:<id>` → { type, id }; anything else is no drawer.
export function parseView(value: string | null | undefined): EntityView | null {
  if (!value) return null;
  const colon = value.indexOf(":");
  if (colon <= 0 || colon === value.length - 1) return null;
  return { type: value.slice(0, colon), id: value.slice(colon + 1) };
}

// A link that opens an item's drawer directly, e.g. from Today: viewHref("/tasks", "task", id).
export function viewHref(pathname: string, type: string, id: string): string {
  return `${pathname}?${VIEW_PARAM}=${type}:${id}`;
}
