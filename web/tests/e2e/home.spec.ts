import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("shows the architecture foundation", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Built light. Ready to grow." }),
  ).toBeVisible();
  await expect(page.getByText("Next.js + React")).toBeVisible();
  await expect(page.getByText("Atlas to Netlify")).toBeVisible();
});

test("has no automatically detectable accessibility violations", async ({ page }) => {
  await page.goto("/");

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();

  expect(results.violations).toEqual([]);
});
