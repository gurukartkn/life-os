// Browser-stored UI preferences (v2 design-system amendment §E, §G): the theme
// and the sidebar state live in localStorage — no schema change — and are
// applied to <html> by an inline script before first paint, so there is no flash.

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "life-os-theme";
export const SIDEBAR_STORAGE_KEY = "life-os-sidebar";

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

// localStorage can be blocked or throw (private windows, cleared site data), so
// every access is wrapped: the app must render correctly without it.
export function safeGetItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetItem(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Preference just won't persist.
  }
}

// Runs synchronously in <head> before the body paints. Mirrors what the store
// does on the client: an explicit stored theme wins, otherwise the OS preference.
export const PRE_PAINT_SCRIPT = `(function(){try{var d=document.documentElement,s=window.localStorage,t=s.getItem("${THEME_STORAGE_KEY}");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}d.setAttribute("data-theme",t);if(s.getItem("${SIDEBAR_STORAGE_KEY}")==="collapsed"){d.setAttribute("data-sidebar","collapsed")}}catch(e){}})();`;
