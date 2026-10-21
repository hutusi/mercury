import { expect, test, type Locator } from "@playwright/test";
import { answerAllQuestions, registerAndOnboard, t } from "./helpers";

/**
 * Seeds mistakes by completing a reading exercise picking every first option
 * (mostly wrong against the seeded content), then clears one from the
 * notebook. A wrong re-test reveals the correct answer and offers a retry,
 * so the clear loop is deterministic without knowing the answer key.
 */
test("mistakes notebook: seed wrong answers, retest until cleared", async ({ page }) => {
  await registerAndOnboard(page, "toeic");

  // Fresh account: empty notebook.
  await page.goto("/mistakes");
  await expect(page.getByRole("heading", { name: t.nav.mistakes })).toBeVisible();
  await expect(page.getByText(t.mistakes.empty)).toBeVisible();

  // Seed: complete a reading exercise with first-option answers.
  await page.goto("/reading");
  await page.locator('a[href^="/zh/reading/"]').first().click();
  // Wait for the exercise page itself — t.reading.passage ("文章") also
  // substring-matches the list page's subtitle, so it can't gate navigation.
  await page.waitForURL(/\/zh\/reading\/.+/);
  const submit = page.getByRole("button", { name: new RegExp(t.reading.submitAnswers) });
  await expect(submit).toBeVisible();
  await answerAllQuestions(page);
  await submit.click();
  await expect(page.getByText(t.common.accuracy, { exact: false })).toBeVisible();

  // Seed vocab mistakes: run the quiz clicking the first option each time
  // (options are shuffled, so at least one wrong is a statistical certainty).
  await page.goto("/vocabulary/quiz");
  for (let i = 0; i < 10; i++) {
    await expect(page.locator("#main-content").getByText(`${i + 1} / 10`)).toBeVisible();
    await page.locator("[data-quiz-option]").first().click();
    await page.getByRole("button", { name: i === 9 ? t.common.finish : t.common.next }).click();
  }
  await expect(page.getByRole("heading", { name: t.vocab.quizDone })).toBeVisible();

  // The notebook lists both kinds as cards.
  await page.goto("/mistakes");
  const readingCards = page.locator('li[data-mistake-kind="reading"]');
  const vocabCards = page.locator('li[data-mistake-kind="vocab_quiz"]');
  await expect(readingCards.first()).toBeVisible();
  await expect(vocabCards.first()).toBeVisible();
  await expect(page.getByText(t.mistakes.empty)).not.toBeVisible();
  const readingBefore = await readingCards.count();

  // Re-answer a reading mistake until correct: tapping an option grades it,
  // and a wrong pick reveals the key, so the retry is deterministic.
  const firstItem = readingCards.first();
  await firstItem.getByRole("button", { name: t.mistakes.retest }).click();
  await clearByRetrying(firstItem);
  // "Continue" moves the cleared card out of the active list.
  await firstItem.getByRole("button", { name: t.mistakes.next }).click();
  await expect(readingCards).toHaveCount(readingBefore - 1);

  // Same for a vocab mistake — its retry draws a fresh one-question session.
  const vocabItem = vocabCards.first();
  await vocabItem.getByRole("button", { name: t.mistakes.retest }).click();
  await clearByRetrying(vocabItem);

  // The cleared tab now holds both.
  await page.getByRole("radio", { name: new RegExp(t.mistakes.clearedLabel) }).click();
  await expect(page.locator("li[data-mistake-cleared]")).toHaveCount(2);
});

/**
 * Pick the first option; on a miss, read the revealed key, retry, and pick
 * it (matched by text — a vocab retry reshuffles the options).
 */
async function clearByRetrying(item: Locator) {
  const options = item.locator("[data-option-state]");
  await options.first().click();
  const outcome = await Promise.race([
    item
      .getByText(t.mistakes.retestCorrect)
      .waitFor()
      .then(() => "correct" as const),
    item
      .getByText(t.mistakes.retestWrong)
      .waitFor()
      .then(() => "wrong" as const),
  ]);
  if (outcome === "wrong") {
    // The option text is the last span (MCQ options lead with a letter badge).
    const key = (
      await item.locator('[data-option-state="correct"] span').last().innerText()
    ).trim();
    await item.getByRole("button", { name: t.mistakes.retestAgain }).click();
    await item.locator('[data-option-state="idle"]', { hasText: key }).first().click();
  }
  await expect(item.getByText(t.mistakes.retestCorrect)).toBeVisible();
}
