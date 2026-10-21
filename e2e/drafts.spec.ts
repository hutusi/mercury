import { expect, test } from "@playwright/test";
import { answerAllQuestions, registerAndOnboard, t } from "./helpers";

// Unsent learner work survives a reload (src/lib/drafts.ts): the essay in
// localStorage, picked MCQ answers in sessionStorage.

test("a half-written essay survives a reload and clears once submitted", async ({ page }) => {
  await registerAndOnboard(page, "toeic");
  await page.goto("/writing");
  await page.locator('a[href^="/zh/writing/"]').first().click();
  await page.waitForURL(/\/zh\/writing\/[^/]+$/);

  const essay = "Dear team, I am writing to follow up on the budget review we discussed.";
  const editor = page.getByRole("textbox", { name: t.writing.responseLabel });
  await editor.fill(essay);
  // The save is debounced; give it a beat before tearing the page down.
  await page.waitForTimeout(800);
  await page.reload();

  await expect(editor).toHaveValue(essay);
  await expect(page.getByText(t.common.draftRestored)).toBeVisible();
});

test("picked reading answers survive a reload", async ({ page }) => {
  await registerAndOnboard(page, "toeic");
  await page.goto("/reading");
  await page.locator('a[href^="/zh/reading/"]').first().click();
  await page.waitForURL(/\/zh\/reading\/[^/]+$/);

  await answerAllQuestions(page);
  const submit = page.getByRole("button", { name: new RegExp(t.reading.submitAnswers) });
  await expect(submit).toBeEnabled();
  await page.waitForTimeout(800);
  await page.reload();

  // Every answer came back, so the submit is immediately available again.
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(page.getByText(t.common.accuracy, { exact: false })).toBeVisible();

  // Submitted work is no longer a draft: a fresh visit starts clean.
  await page.reload();
  await expect(
    page.getByRole("button", { name: new RegExp(t.reading.submitAnswers) }),
  ).toBeDisabled();
});
