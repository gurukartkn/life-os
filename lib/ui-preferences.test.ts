import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PRE_PAINT_SCRIPT,
  SIDEBAR_STORAGE_KEY,
  THEME_STORAGE_KEY,
  isTheme,
  safeGetItem,
  safeSetItem,
} from "./ui-preferences";

function runPrePaintScript() {
  new Function(PRE_PAINT_SCRIPT)();
}

function stubSystemTheme(dark: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({ matches: dark && query.includes("dark") }))
  );
}

describe("PRE_PAINT_SCRIPT", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-sidebar");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("applies the stored theme over the OS preference", () => {
    stubSystemTheme(true);
    window.localStorage.setItem(THEME_STORAGE_KEY, "light");
    runPrePaintScript();
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
  });

  it("follows the OS preference on a first visit", () => {
    stubSystemTheme(true);
    runPrePaintScript();
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  });

  it("falls back to light when the OS prefers light and nothing is stored", () => {
    stubSystemTheme(false);
    runPrePaintScript();
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
  });

  it("ignores an invalid stored theme", () => {
    stubSystemTheme(false);
    window.localStorage.setItem(THEME_STORAGE_KEY, "sepia");
    runPrePaintScript();
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
  });

  it("restores a collapsed sidebar", () => {
    stubSystemTheme(false);
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, "collapsed");
    runPrePaintScript();
    expect(document.documentElement).toHaveAttribute("data-sidebar", "collapsed");
  });

  it("leaves the sidebar expanded by default", () => {
    stubSystemTheme(false);
    runPrePaintScript();
    expect(document.documentElement).not.toHaveAttribute("data-sidebar");
  });

  it("does not throw when localStorage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(runPrePaintScript).not.toThrow();
  });
});

describe("storage helpers", () => {
  afterEach(() => vi.restoreAllMocks());

  it("isTheme accepts only light and dark", () => {
    expect(isTheme("light")).toBe(true);
    expect(isTheme("dark")).toBe(true);
    expect(isTheme("system")).toBe(false);
    expect(isTheme(null)).toBe(false);
  });

  it("safeGetItem and safeSetItem swallow storage errors", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(safeGetItem("k")).toBeNull();
    expect(() => safeSetItem("k", "v")).not.toThrow();
  });
});
