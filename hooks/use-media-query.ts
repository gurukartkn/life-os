"use client";

import { useCallback, useSyncExternalStore } from "react";

// Whether a CSS media query matches, kept live. The server snapshot (and any
// environment without matchMedia, such as jsdom) is `fallback`, so markup that
// differs by breakpoint should stay CSS-driven and only behaviour — like which side
// a menu opens on — read this.
export function useMediaQuery(query: string, fallback = false): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window.matchMedia !== "function") return () => {};
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query]
  );
  return useSyncExternalStore(
    subscribe,
    () => (typeof window.matchMedia === "function" ? window.matchMedia(query).matches : fallback),
    () => fallback
  );
}
