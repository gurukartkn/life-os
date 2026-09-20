import { create } from "zustand";
import {
  SIDEBAR_STORAGE_KEY,
  THEME_STORAGE_KEY,
  isTheme,
  safeSetItem,
  type Theme,
} from "@/lib/ui-preferences";

// UI-only state (ADR-003): theme and sidebar. The <html> element carries the
// applied values (`data-theme`, `data-sidebar`) so CSS is correct before React
// hydrates; the store mirrors them for components that need the current value
// (aria-expanded, labels) and is synced from the document after mount.
type UIState = {
  theme: Theme;
  sidebarCollapsed: boolean;
  syncFromDocument: () => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
};

export const useUIStore = create<UIState>((set, get) => ({
  theme: "light",
  sidebarCollapsed: false,

  syncFromDocument: () => {
    const root = document.documentElement;
    const theme = root.getAttribute("data-theme");
    set({
      theme: isTheme(theme) ? theme : "light",
      sidebarCollapsed: root.getAttribute("data-sidebar") === "collapsed",
    });
  },

  setTheme: (theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    safeSetItem(THEME_STORAGE_KEY, theme);
    set({ theme });
  },

  toggleTheme: () => {
    // Read the applied theme from the document, not the store, so a toggle
    // before the store has synced still flips the theme the user is looking at.
    const current = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    get().setTheme(current === "dark" ? "light" : "dark");
  },

  setSidebarCollapsed: (collapsed) => {
    const root = document.documentElement;
    if (collapsed) root.setAttribute("data-sidebar", "collapsed");
    else root.removeAttribute("data-sidebar");
    safeSetItem(SIDEBAR_STORAGE_KEY, collapsed ? "collapsed" : "expanded");
    set({ sidebarCollapsed: collapsed });
  },

  toggleSidebar: () => {
    const collapsed = document.documentElement.getAttribute("data-sidebar") === "collapsed";
    get().setSidebarCollapsed(!collapsed);
  },
}));
