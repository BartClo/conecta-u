import { test, expect } from "@playwright/test";

// A full authenticated flow (login → dashboard → create curso) needs a seeded
// Supabase test session; real Google OAuth cannot run headlessly. That is a
// follow-up once a test-user fixture strategy is decided — we do NOT fabricate
// an auth bypass that wouldn't exist in production. This test covers the part
// the middleware guarantees without a session.
test("unauthenticated user visiting a protected route is redirected to /login", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
  await expect(
    page.getByRole("button", { name: /continuar con google/i }),
  ).toBeVisible();
});
