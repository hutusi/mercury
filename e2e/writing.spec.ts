import { expect, test } from "@playwright/test";
import { registerAndOnboard, t } from "./helpers";

// Keyless e2e: a submission degrades to self-assessment — the checklist and
// the model answer — and the page still routes forward.
test("writing: the word goal gates submit; a keyless submit lands in self-assessment", async ({
  page,
}) => {
  await registerAndOnboard(page, "toeic");
  await page.goto("/writing");
  await page.locator('a[href^="/zh/writing/"]').first().click();
  await page.waitForURL(/\/zh\/writing\/[^/]+$/);
  const promptPath = new URL(page.url()).pathname;

  const editor = page.getByRole("textbox", { name: t.writing.responseLabel });
  const submit = page.getByRole("button", { name: t.writing.submitForFeedback });
  await editor.fill("Too short.");
  await expect(submit).toBeDisabled();

  // Comfortably past any prompt's minimum (the longest asks for 250).
  await editor.fill(Array.from({ length: 300 }, (_, i) => `word${i}`).join(" "));
  await expect(submit).toBeEnabled();
  await submit.click();

  await page.waitForURL(/\/zh\/writing\/submissions\/[^/]+$/);
  await expect(page.getByRole("heading", { name: t.writing.feedbackTitle })).toBeVisible();
  await expect(page.getByText(t.writing.selfAssessTitle, { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: t.writing.checklist })).toBeVisible();
  await expect(page.getByRole("heading", { name: t.writing.modelAnswer })).toBeVisible();
  await expect(page.getByRole("link", { name: t.writing.rewrite })).toHaveAttribute(
    "href",
    promptPath,
  );

  // Back on the prompt, the submission is listed and the editor starts clean.
  await page.goto(promptPath);
  await expect(page.getByRole("heading", { name: t.writing.pastSubmissions })).toBeVisible();
  await expect(editor).toHaveValue("");
});
