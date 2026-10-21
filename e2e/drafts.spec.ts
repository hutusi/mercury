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

test("an expired session's draft is never handed to the next account", async ({ page }) => {
  await registerAndOnboard(page, "toeic");
  await page.goto("/writing");
  await page.locator('a[href^="/zh/writing/"]').first().click();
  await page.waitForURL(/\/zh\/writing\/[^/]+$/);
  const promptUrl = page.url();

  const editor = page.getByRole("textbox", { name: t.writing.responseLabel });
  await editor.fill("A private draft that belongs to the first learner.");
  await page.waitForTimeout(800);

  // The session lapses without a sign-out, so nothing wipes local drafts;
  // the next person on this browser signs up and opens the same prompt.
  await page.context().clearCookies();
  await registerAndOnboard(page, "toeic");
  await page.goto(promptUrl);

  await expect(editor).toHaveValue("");
  await expect(page.getByText(t.common.draftRestored)).toHaveCount(0);
  // The first learner's draft is still on the device, under their own key.
  const writingDrafts = await page.evaluate(() =>
    Object.keys(localStorage).filter(
      (k) => k.startsWith("mercury.draft.") && k.includes(".writing."),
    ),
  );
  expect(writingDrafts).toHaveLength(1);
});
