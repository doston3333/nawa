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
    // A session can contain more than one task in a stage. Drive the actual
    // task sequence instead of assuming one task per stage.
    for (let taskNumber = 0; taskNumber < 24; taskNumber += 1) {
      if (await page.getByText(/You can read/).count()) break;
      const currentStage = await page.getByRole("heading", { level: 1 }).textContent();
      const taskMarker = page.getByText(/Task \d+ of \d+/).first();
      const beforeTask = await taskMarker.textContent();
      const choice = page.getByRole("group", { name: "Choose one" }).getByRole("button").first();
      if (await choice.count()) await choice.click();
      else await page.getByRole("textbox").fill(currentStage === "Close" ? "أَنَا أَتَعَلَّمُ العَرَبِيَّةَ" : "ب");
      await page.getByRole("button", { name: /submit|continue/i }).click();
      await expect.poll(async () =>
        (await page.getByText(/You can read/).count()) > 0 ||
        (await taskMarker.textContent()) !== beforeTask,
      ).toBe(true);
    }
    await expect(page.getByText(/You can read/)).toBeVisible();
    expect(await page.locator("body").evaluate((body) => body.scrollWidth <= body.clientWidth)).toBe(true);
  });
}
