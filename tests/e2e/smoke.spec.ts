import { test, expect } from "@playwright/test";

test("app abre y muestra header", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "AirPDF" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Abrir PDF" })).toBeVisible();
});
