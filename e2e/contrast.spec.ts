import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// v2 Stage 1: "the user can switch between light and dark on every screen" — so
// every screen is checked for WCAG AA text contrast in both themes
// (docs/05-design-system.md, v2 Amendment §F).
//
// KNOWN_V1_PAIRS are colour pairs from the approved v1 palette that already fall
// short of 4.5:1 in the LIGHT theme and are carried over unchanged into dark:
//   - white text on the teal (#3fa491, 3.0:1) and blue (#4b9eea, 2.8:1) button fills —
//     the v1 design system accepts this for medium-weight button labels;
//   - ink-faint (#9a9a9a, 2.7:1) used for captions and inactive tab labels.
// They are reported to the owner as a finding, not changed silently. Anything else
// failing here is a new regression.
const KNOWN_V1_PAIRS = (fg: string, bg: string) =>
  (fg === "#ffffff" && (bg === "#3fa491" || bg === "#4b9eea")) || fg === "#9a9a9a";

const APP_SCREENS = ["/todos", "/fitness", "/fitness?tab=exercises", "/routines", "/routines/new", "/goals"];
const AUTH_SCREENS = ["/login", "/signup"];

async function newContrastViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze();
  return results.violations
    .flatMap((violation) => violation.nodes)
    .filter((node) => {
      const data = node.any[0]?.data as { fgColor?: string; bgColor?: string } | undefined;
      return !(data?.fgColor && data.bgColor && KNOWN_V1_PAIRS(data.fgColor, data.bgColor));
    })
    .map((node) => `${node.target.join(" ")} — ${node.any[0]?.message}`);
}

for (const theme of ["light", "dark"] as const) {
  test.describe(`${theme} theme`, () => {
    for (const path of APP_SCREENS) {
      test(`${path}: no new contrast failures`, async ({ page }) => {
        await page.addInitScript((value) => window.localStorage.setItem("life-os-theme", value), theme);
        await page.goto(path);
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        await page.locator("main").waitFor();

        expect(await newContrastViolations(page)).toEqual([]);
      });
    }

    test.describe("signed out", () => {
      test.use({ storageState: { cookies: [], origins: [] } });

      for (const path of AUTH_SCREENS) {
        test(`${path}: no new contrast failures`, async ({ page }) => {
          await page.addInitScript((value) => window.localStorage.setItem("life-os-theme", value), theme);
          await page.goto(path);
          await expect(page.locator("html")).toHaveAttribute("data-theme", theme);

          expect(await newContrastViolations(page)).toEqual([]);
        });
      }
    });
  });
}
