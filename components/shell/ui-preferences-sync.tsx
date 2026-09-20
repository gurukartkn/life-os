"use client";

import { useEffect } from "react";
import { useUIStore } from "@/stores/use-ui-store";

// Copies what the pre-paint script applied to <html> into the UI store once the
// app has hydrated. Renders nothing.
export function UIPreferencesSync() {
  useEffect(() => {
    useUIStore.getState().syncFromDocument();
  }, []);
  return null;
}
