import { expect, test } from "@playwright/test";

for (const viewport of [{ name: "desktop", width: 1440, height: 900 }, { name: "mobile", width: 375, height: 812 }]) {
  test(`${viewport.name} learner completes and resumes a study session`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/profiles");
    await page.getByRole("button", { name: "Omar", exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto("/study");
    await expect(page.getByRole("heading", { name: "Arrival" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Arrival" })).toBeVisible();
    for (const stage of ["Arrival", "Retrieval", "New concept", "Input", "Output", "Close"]) {
      await expect(page.getByRole("heading", { name: stage })).toBeVisible();
      await page.getByRole("textbox").fill(stage === "Close" ? "أَنَا أَتَعَلَّمُ العَرَبِيَّةَ" : "ب");
      await page.getByRole("button", { name: /submit|continue/i }).click();
    }
    await expect(page.getByText(/You can read/)).toBeVisible();
    expect(await page.locator("body").evaluate((body) => body.scrollWidth <= body.clientWidth)).toBe(true);
  });
}
