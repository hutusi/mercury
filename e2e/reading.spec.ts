import { expect, test } from "@playwright/test";
import { answerAllQuestions, registerAndOnboard, t } from "./helpers";

test("reading exercise: answer all, submit, review explanations", async ({ page }) => {
  await registerAndOnboard(page, "toeic");

  await page.goto("/reading");
  await expect(page.getByRole("heading", { name: t.nav.reading })).toBeVisible();

  // Open the first exercise.
  await page.locator('a[href^="/zh/reading/"]').first().click();
  await expect(page.getByText(t.reading.passage)).toBeVisible();

  // Submit stays disabled until every question is answered.
  const submit = page.getByRole("button", { name: new RegExp(t.reading.submitAnswers) });
  await expect(submit).toBeDisabled();

  await answerAllQuestions(page);
  await expect(submit).toBeEnabled();
  await submit.click();

  // Result: score header + per-question explanations now revealed.
  await expect(page.getByText(t.common.accuracy, { exact: false })).toBeVisible();
  await expect(page.getByText(`${t.reading.explanation}：`).first()).toBeVisible();

  // Back on the list, the best score shows up. (The result view renders two
  // identical back-links — header and footer — so take the first.)
  await page
    .getByRole("link", { name: new RegExp(t.reading.backToList) })
    .first()
    .click();
  await expect(page.getByText(new RegExp(`${t.reading.bestScore}:`)).first()).toBeVisible();
});
