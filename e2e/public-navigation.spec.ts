import { expect, test } from "@playwright/test";

test("landing page and public navigation render without a server error", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBeLessThan(500);
  await expect(page).toHaveTitle(/MergifyPDF/i);
  await expect(page.locator("body")).toBeVisible();
});

test("login page is reachable", async ({ page }) => {
  const response = await page.goto("/login");
  expect(response?.status()).toBeLessThan(500);
  await expect(page.locator("body")).toContainText(/log in|sign in/i);
});

test("protected routes return a safe response for a guest", async ({ request }) => {
  for (const route of ["/projects/all", "/account", "/signature-center", "/studio"]) {
    const response = await request.get(route, { maxRedirects: 0 });
    expect(response.status(), route).toBeLessThan(500);
  }
});
