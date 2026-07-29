import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("redirects signed-out visitors to the Spanish sign-in screen", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/sign-in/);
  await expect(
    page.getByRole("heading", { name: "Todo tu equipo, en un mismo lugar." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Te damos la bienvenida" }),
  ).toBeVisible();
});

test("persists an explicit color theme", async ({ page }) => {
  await page.goto("/sign-in");
  await page.evaluate(() => {
    window.localStorage.setItem("colaboradores-theme", "dark");
  });

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.evaluate(() => {
    window.localStorage.setItem("colaboradores-theme", "light");
  });
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("has no accessibility violations in light or dark themes", async ({ page }) => {
  await page.goto("/sign-in");
  const lightResults = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(lightResults.violations).toEqual([]);

  await page.evaluate(() => {
    window.localStorage.setItem("colaboradores-theme", "dark");
  });
  await page.reload();
  const darkResults = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(darkResults.violations).toEqual([]);
});
