import { expect, test } from "@playwright/test";

test("learner opens modular path and starts first lesson", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/learn");
  await expect(page.getByRole("heading", { name: "Your lessons" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Script" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Greetings" })).toBeVisible();
  await page.getByRole("link", { name: /Letters 1–7/i }).click();
  await expect(page.getByText(/Exercise 1 of/i)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: /^Continue$/i })).toBeVisible();

  // Complete one exercise so the runner advances
  const choice = page.getByRole("group", { name: "Choose one" }).getByRole("button").first();
  if (await choice.count()) {
    await choice.click();
  } else {
    await page.locator("textarea").fill("ا");
  }
  await page.locator("button.task-continue").click();
  await expect(page.getByText(/Exercise 2 of|Lesson complete|Continue path/i).first()).toBeVisible({
    timeout: 15_000,
  });
});
