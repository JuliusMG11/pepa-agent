import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("unauthenticated user is redirected to login from /dashboard", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    // Should be redirected to login page
    await expect(page).toHaveURL(/\/(login|auth|sign-in)/, { timeout: 5_000 });
  });

  test("unauthenticated user is redirected to login from /leads", async ({
    page,
  }) => {
    await page.goto("/leads");

    await expect(page).toHaveURL(/\/(login|auth|sign-in)/, { timeout: 5_000 });
  });

  test("unauthenticated user is redirected to login from /properties", async ({
    page,
  }) => {
    await page.goto("/properties");

    await expect(page).toHaveURL(/\/(login|auth|sign-in)/, { timeout: 5_000 });
  });

  test("login page is publicly accessible", async ({ page }) => {
    const response = await page.goto("/login");

    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator("input[type=email]")).toBeVisible({ timeout: 5_000 });
  });
});
