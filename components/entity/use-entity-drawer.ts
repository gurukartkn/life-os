"use client";

import { useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { VIEW_PARAM, parseView } from "@/lib/entity-view";

// The URL this tab pushed for the drawer it opened. Closing that drawer goes back one
// history entry (so Back and Close leave the same history); a drawer that arrived in
// the URL some other way (a link, a reload) is closed by replacing the URL instead.
let pushedHref: string | null = null;

function urlWithView(view: string | null): URL {
  const url = new URL(window.location.href);
  if (view) url.searchParams.set(VIEW_PARAM, view);
  else url.searchParams.delete(VIEW_PARAM);
  // Keep the readable `view=task:<id>` form rather than URLSearchParams' `task%3A<id>`.
  url.search = url.search.replaceAll("%3A", ":");
  return url;
}

// Which entity drawer is open, as URL state. Opening pushes a history entry with
// history.pushState, which Next syncs into useSearchParams without a server round
// trip (as the Tasks filter tabs do), so the page stays server-rendered and only
// the drawer reacts. Pass `type` to read only that entity type's param.
export function useEntityDrawer(type?: string) {
  const view = parseView(useSearchParams().get(VIEW_PARAM));
  const current = view && (!type || view.type === type) ? view : null;

  const open = useCallback((entityType: string, id: string) => {
    const url = urlWithView(`${entityType}:${id}`);
    pushedHref = url.href;
    window.history.pushState(null, "", url);
  }, []);

  const close = useCallback(() => {
    if (!parseView(new URL(window.location.href).searchParams.get(VIEW_PARAM))) return;
    if (pushedHref === window.location.href) {
      pushedHref = null;
      window.history.back();
    } else {
      window.history.replaceState(null, "", urlWithView(null));
    }
  }, []);

  return { view: current, open, close };
}

// Undo a Back press the drawer refused (unsaved edits): put the drawer's URL back as
// a fresh entry this tab owns, so a later close still goes back through history.
export function restoreDrawerUrl(href: string) {
  pushedHref = href;
  window.history.pushState(null, "", href);
}
