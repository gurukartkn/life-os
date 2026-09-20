import { test, expect, type Locator, type Page } from "@playwright/test";

// Backlog #2 and #3 — one input style, one set of button variants (v2 Amendment §B, §C).

async function style(locator: Locator) {
  return locator.evaluate((el) => {
    const s = getComputedStyle(el);
    return {
      height: s.height,
      radius: s.borderTopLeftRadius,
      fontSize: s.fontSize,
      fontWeight: s.fontWeight,
      background: s.backgroundColor,
      borderColor: s.borderTopColor,
      borderWidth: s.borderTopWidth,
      paddingLeft: s.paddingLeft,
    };
  });
}

async function forceTheme(page: Page, theme: "light" | "dark") {
  await page.addInitScript((value) => window.localStorage.setItem("life-os-theme", value), theme);
}

test("input: 38px, 10px radius, white fill, 1px strong border (light)", async ({ page }) => {
  await forceTheme(page, "light");
  await page.goto("/todos");

  const input = await style(page.getByLabel("Todo title"));

  expect(input.height).toBe("38px");
  expect(input.radius).toBe("10px");
  expect(input.background).toBe("rgb(255, 255, 255)");
  expect(input.borderWidth).toBe("1px");
  expect(input.borderColor).toBe("rgb(224, 224, 224)");
});

test("input: dark fill is the dark card surface, same shape", async ({ page }) => {
  await forceTheme(page, "dark");
  await page.goto("/todos");

  const input = await style(page.getByLabel("Todo title"));

  expect(input.height).toBe("38px");
  expect(input.radius).toBe("10px");
  expect(input.background).toBe("rgb(23, 24, 29)");
});

test("every text input on the login page shares one style", async ({ browser }) => {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  await forceTheme(page, "light");
  await page.goto("/login");

  const email = await style(page.getByLabel("Email"));
  const password = await style(page.getByLabel("Password", { exact: true }));

  expect({ ...password, paddingLeft: "" }).toEqual({ ...email, paddingLeft: "" });
  await context.close();
});

test("add-todo, New workout and New routine buttons share one shape (tone differs)", async ({ page }) => {
  await forceTheme(page, "light");

  await page.goto("/todos");
  const addTodo = await style(page.getByRole("button", { name: "Add todo" }));
  await page.goto("/fitness");
  const newWorkout = await style(page.getByRole("link", { name: "New workout" }));
  await page.goto("/routines");
  const newRoutine = await style(page.getByRole("link", { name: "New routine" }));

  const shape = ({ height, radius, fontSize, fontWeight, paddingLeft }: Awaited<ReturnType<typeof style>>) => ({
    height,
    radius,
    fontSize,
    fontWeight,
    paddingLeft,
  });
  expect(shape(newWorkout)).toEqual(shape(addTodo));
  expect(shape(newRoutine)).toEqual(shape(addTodo));
  expect(addTodo.height).toBe("38px");
  expect(addTodo.radius).toBe("10px");

  // Domain identity: violet (Todo), teal (Fitness), blue (Routines).
  expect(addTodo.background).toBe("rgb(108, 76, 245)");
  expect(newWorkout.background).toBe("rgb(63, 164, 145)");
  expect(newRoutine.background).toBe("rgb(75, 158, 234)");
});
