import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("shows the internal operations dashboard", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Buenos días." })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Navegación principal" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Procesos activos" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Iniciar un proceso" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Iniciar sesión" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Crear cuenta" })).toBeVisible();
});

test("persists an explicit color theme", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("button", { name: "Claro" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Oscuro" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("button", { name: "Oscuro" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.getByRole("button", { name: "Claro" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("has no accessibility violations in light or dark themes", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("button", { name: "Claro" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const lightResults = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(lightResults.violations).toEqual([]);

  await page.getByRole("button", { name: "Oscuro" }).click();
  await page.waitForTimeout(200);
  const darkResults = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(darkResults.violations).toEqual([]);
});
