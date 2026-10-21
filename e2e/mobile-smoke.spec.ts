import { expect, test } from "@playwright/test";
import { registerAndOnboard, t } from "./helpers";

// The phone chrome end to end (Pixel 7 project): bottom tabs, a learning
// flow without navigation, the saved-progress exit, the reading tabs, and
// the mistakes badge.
test("phone: tabs → practice → a flow without chrome → saved exit → mistakes badge", async ({
  page,
}) => {
  await registerAndOnboard(page, "toeic");
  const tabs = page.locator("nav[data-bottom-nav]");
  await expect(tabs).toBeVisible();
  // No mistakes yet: no badge on the tab.
  await expect(tabs.getByRole("link", { name: t.nav.mistakes })).not.toContainText(/\d/);

  // Practice tab → the vocabulary skill → a flashcard session.
  await tabs.getByRole("link", { name: t.nav.practice }).click();
  await page.waitForURL("**/practice");
  await page.locator('#main-content a[href="/zh/vocabulary"]').first().click();
  await page.waitForURL("**/vocabulary");
  await page.getByRole("link", { name: new RegExp(t.vocab.study) }).click();
  await page.waitForURL("**/vocabulary/study");

  // Sessions hide navigation; the flow bar carries the exit.
  await expect(tabs).toHaveCount(0);
  await page.getByText(t.vocab.flipHint).click();
  await page.getByRole("button", { name: t.vocab.good, exact: true }).click();
  await expect(page.getByText(/^2 \/ \d+$/)).toBeVisible();

  // Leaving mid-session confirms the progress is kept, back in the shell.
  await page.getByRole("button", { name: t.flow.exit }).click();
  await expect(page.getByText(t.flow.saved)).toBeVisible();
  await expect(tabs).toBeVisible();

  // Reading on a phone: Passage / Questions tabs. First-option answers make
  // at least one mistake.
  await page.goto("/reading/toeic-r-002");
  await page.getByRole("button", { name: t.reading.toQuestions }).click();
  const firstOptions = page.locator("li > div > button:first-child");
  await firstOptions.first().waitFor();
  for (let i = 0; i < (await firstOptions.count()); i++) await firstOptions.nth(i).click();
  await page.getByRole("button", { name: new RegExp(t.reading.submitAnswers) }).click();
  await expect(page.getByText(t.common.accuracy, { exact: false })).toBeVisible();

  // The mistakes tab now carries a count.
  await page.goto("/dashboard");
  await expect(tabs.getByRole("link", { name: new RegExp(t.nav.mistakes) })).toContainText(/\d/);
});
