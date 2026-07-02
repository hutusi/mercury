import { expect, test } from "@playwright/test";
import { registerAndOnboard, t } from "./helpers";

test("speaking prompt renders with recorder or unsupported gate", async ({ page }) => {
  await registerAndOnboard(page, "toeic");

  await page.goto("/speaking");
  await page.locator('a[href^="/zh/speaking/"]').first().click();

  // Bilingual prompt is shown.
  await expect(page.getByText(t.speaking.prep, { exact: false }).first()).toBeVisible();

  // Headless Chromium's SpeechRecognition availability varies by environment:
  // accept either the recorder UI or the graceful unsupported gate.
  const recorder = page.getByRole("button", { name: new RegExp(t.speaking.startPrep) });
  const gate = page.getByText(t.speaking.unsupported);
  await expect(recorder.or(gate).first()).toBeVisible();
});
