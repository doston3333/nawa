import { expect, test, type Page } from "@playwright/test";
import { E2E_PROFILES } from "./global-setup";

async function selectProfile(page: Page, name: string) {
  await page.goto("/profiles");
  await page.getByRole("button", { name, exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function startLesson(page: Page) {
  await page.goto("/learn/script-1");
  const progress = page.getByText(/Exercise \d+ of/i);
  await expect(progress).toBeVisible();
  const match = (await progress.textContent())?.match(/Exercise (\d+) of/i);
  return Number(match?.[1] ?? 1);
}

for (const viewport of [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 375, height: 812 },
]) {
  test(`${viewport.name} keeps two selected profiles isolated across reloads`, async ({ browser }) => {
    const contextA = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    const contextB = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    await selectProfile(pageA, "Amina");
    await selectProfile(pageB, "Omar");
    const startingA = await startLesson(pageA);
    const startingB = await startLesson(pageB);

    await expect(pageA.getByText("Profile: Amina")).toBeVisible();
    await expect(pageB.getByText("Profile: Omar")).toBeVisible();
    const firstChoice = pageA.getByRole("group", { name: "Choose one" }).getByRole("button").first();
    if (await firstChoice.count()) await firstChoice.click();
    else await pageA.locator("textarea").fill("ا");
    await pageA.locator("button.task-continue").click();
    await expect(pageA.getByText(new RegExp(`Exercise ${startingA + 1} of`, "i"))).toBeVisible();

    await pageA.reload();
    await pageB.reload();
    await expect(pageA.getByText(new RegExp(`Exercise ${startingA + 1} of`, "i"))).toBeVisible();
    await expect(pageB.getByText(new RegExp(`Exercise ${startingB} of`, "i"))).toBeVisible();
    await expect(pageA.locator("body")).toContainText("Amina");
    await expect(pageB.locator("body")).toContainText("Omar");

    expect(await pageA.evaluate(() => window.localStorage.getItem("nawa_active_profile_id"))).toBe(E2E_PROFILES.amina);
    expect(await pageB.evaluate(() => window.localStorage.getItem("nawa_active_profile_id"))).toBe(E2E_PROFILES.omar);
    await contextA.close();
    await contextB.close();
  });
}

test("offline lesson attempts survive reload and synchronize once connectivity returns", async ({ page }) => {
  await selectProfile(page, "Amina");
  const startingIndex = await startLesson(page);
  const beforePathResponse = await page.request.get("/api/learn/path");
  const beforePath = await beforePathResponse.json();
  const beforeLesson = beforePath.units.flatMap((unit: { lessons: Array<{ id: string; scoreTotal: number }> }) => unit.lessons)
    .find((item: { id: string }) => item.id === "script-1");

  let offline = false;
  await page.route("**/api/**", (route) => offline ? route.abort("internetdisconnected") : route.continue());
  offline = true;

  const firstChoice = page.getByRole("group", { name: "Choose one" }).getByRole("button").first();
  if (await firstChoice.count()) await firstChoice.click();
  else await page.locator("textarea").fill("ا");
  await page.locator("button.task-continue").click();
  await expect(page.getByText(new RegExp(`Exercise ${startingIndex + 1} of`, "i"))).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("Saved locally · waiting to sync");

  await page.reload();
  await expect(page.getByText(new RegExp(`Exercise ${startingIndex + 1} of`, "i"))).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("Saved locally · waiting to sync");

  offline = false;
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(page.getByRole("status")).toHaveText("Synced", { timeout: 15_000 });

  const response = await page.request.get("/api/learn/path");
  expect(response.ok()).toBeTruthy();
  const path = await response.json();
  const lesson = path.units.flatMap((unit: { lessons: Array<{ id: string; scoreTotal: number }> }) => unit.lessons)
    .find((item: { id: string }) => item.id === "script-1");
  expect(lesson.scoreTotal).toBe((beforeLesson?.scoreTotal ?? 0) + 1);
});

test.describe("production service worker shell", () => {
  test.skip(!process.env.E2E_PRODUCTION, "Run with E2E_PRODUCTION=1 after pnpm build");

  test("renders the cached Learn shell once offline", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await selectProfile(page, "Amina");
    await page.goto("/learn");
    // Wait for the profile-scoped projection, not merely the production shell,
    // so the offline reload exercises IndexedDB rather than a timing race.
    await expect(page.getByRole("heading", { name: "Your lessons" })).toBeVisible();
    await expect.poll(async () => page.evaluate(async (profileId) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("nawa-offline-v1");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      return await new Promise<boolean>((resolve) => {
        const request = database.transaction("progress", "readonly").objectStore("progress").get(`${profileId}:path`);
        request.onsuccess = () => resolve(Boolean(request.result));
        request.onerror = () => resolve(false);
      });
    }, E2E_PROFILES.amina)).toBe(true);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await page.context().setOffline(true);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Your lessons" })).toBeVisible();
    await context.close();
  });
});
