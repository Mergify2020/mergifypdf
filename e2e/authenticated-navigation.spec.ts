import { expect, test } from "@playwright/test";

const email = process.env.E2E_USER_EMAIL ?? "developer.fixture@example.test";
const password = process.env.E2E_USER_PASSWORD ?? "Synthetic-Test-Password-123!";

test.skip(
  process.env.E2E_AUTH_ENABLED !== "1",
  "Authenticated checks require the disposable CI test database.",
);

test("synthetic user can sign in and navigate without guest-shell flashes", async ({ page }) => {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/projects\/all/, { timeout: 20_000 });

  for (const route of ["/", "/projects/all", "/account", "/signature-center", "/studio"]) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBeLessThan(500);
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/sign in to access your workspace/i);
  }
});
