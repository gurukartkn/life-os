import { beforeEach, describe, expect, it } from "vitest";
import { SIDEBAR_STORAGE_KEY, THEME_STORAGE_KEY } from "@/lib/ui-preferences";
import { useUIStore } from "./use-ui-store";

const root = document.documentElement;

describe("useUIStore", () => {
  beforeEach(() => {
    window.localStorage.clear();
    root.removeAttribute("data-theme");
    root.removeAttribute("data-sidebar");
    useUIStore.setState({ theme: "light", sidebarCollapsed: false });
  });

  it("setTheme applies data-theme, stores the choice and updates state", () => {
    useUIStore.getState().setTheme("dark");

    expect(root).toHaveAttribute("data-theme", "dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(useUIStore.getState().theme).toBe("dark");
  });

  it("toggleTheme flips the theme the document is showing, even before the store synced", () => {
    root.setAttribute("data-theme", "dark"); // set by the pre-paint script; store still says light

    useUIStore.getState().toggleTheme();

    expect(root).toHaveAttribute("data-theme", "light");
    expect(useUIStore.getState().theme).toBe("light");
  });

  it("syncFromDocument reads what the pre-paint script applied", () => {
    root.setAttribute("data-theme", "dark");
    root.setAttribute("data-sidebar", "collapsed");

    useUIStore.getState().syncFromDocument();

    expect(useUIStore.getState().theme).toBe("dark");
    expect(useUIStore.getState().sidebarCollapsed).toBe(true);
  });

  it("syncFromDocument defaults to light and expanded", () => {
    useUIStore.getState().syncFromDocument();

    expect(useUIStore.getState().theme).toBe("light");
    expect(useUIStore.getState().sidebarCollapsed).toBe(false);
  });

  it("setSidebarCollapsed sets and clears data-sidebar and stores the choice", () => {
    useUIStore.getState().setSidebarCollapsed(true);
    expect(root).toHaveAttribute("data-sidebar", "collapsed");
    expect(window.localStorage.getItem(SIDEBAR_STORAGE_KEY)).toBe("collapsed");
    expect(useUIStore.getState().sidebarCollapsed).toBe(true);

    useUIStore.getState().setSidebarCollapsed(false);
    expect(root).not.toHaveAttribute("data-sidebar");
    expect(window.localStorage.getItem(SIDEBAR_STORAGE_KEY)).toBe("expanded");
    expect(useUIStore.getState().sidebarCollapsed).toBe(false);
  });

  it("toggleSidebar flips the sidebar", () => {
    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarCollapsed).toBe(true);

    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarCollapsed).toBe(false);
  });
});
