import { expect, test, type Page } from "@playwright/test";
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
    await page.locator("#main-content button").first().click();
    await page.getByRole("button", { name: i === 9 ? t.common.finish : t.common.next }).click();
  }
  await expect(page.getByRole("heading", { name: t.vocab.quizDone })).toBeVisible();

  // The notebook lists both groups.
  await page.goto("/mistakes");
  await expect(page.getByRole("heading", { name: t.nav.reading })).toBeVisible();
  await expect(page.getByRole("heading", { name: t.vocab.quiz })).toBeVisible();
  await expect(page.getByText(t.mistakes.empty)).not.toBeVisible();

  // Expand the first reading mistake and answer until correct.
  const firstItem = page.locator("li", { has: page.getByText(t.mistakes.lastWrong) }).first();
  await firstItem.getByRole("button").first().click();
  await clearByTrying(page, firstItem);
  await expect(firstItem.getByText(t.mistakes.retestCorrect)).toBeVisible();

  // Clear a vocab mistake: options grade immediately; a wrong pick reveals
  // the correct option, so retry with the revealed answer.
  const vocabItem = page
    .locator("li", { has: page.locator(`text=${t.vocab.quiz}`) })
    .filter({ has: page.getByText(t.mistakes.lastWrong) })
    .first();
  // First click creates the opaque one-question session; the next picks an
  // option. The answer key is revealed only in the grading response.
  await vocabItem.getByRole("button", { name: t.mistakes.retest }).click();
  await vocabItem.locator("button").first().click();
  const vocabOutcome = await Promise.race([
    vocabItem
      .getByText(t.mistakes.retestCorrect)
      .waitFor()
      .then(() => "correct" as const),
    vocabItem
      .getByText(t.mistakes.retestWrong)
      .waitFor()
      .then(() => "wrong" as const),
  ]);
  if (vocabOutcome === "wrong") {
    const correctText = (await vocabItem.locator("button.border-foreground").textContent())!;
    await vocabItem.getByRole("button", { name: t.common.tryAgain }).click();
    await expect(vocabItem.getByRole("button", { name: correctText.trim() })).toBeVisible();
    await vocabItem.getByRole("button", { name: correctText.trim() }).click();
  }
  await expect(vocabItem.getByText(t.mistakes.retestCorrect)).toBeVisible();

  // The cleared view now holds the cleared items.
  await page.getByRole("button", { name: t.mistakes.showCleared }).click();
  await expect(page.getByText(t.mistakes.emptyCleared)).not.toBeVisible();
});

/** Try options A→D; a wrong grade offers tryAgain, a correct one clears. */
async function clearByTrying(page: Page, item: ReturnType<Page["locator"]>) {
  for (let option = 0; option < 4; option++) {
    // QuestionsForm DOM contract: li > div > button per option.
    await item.locator("li > div > button").nth(option).click();
    await item.getByRole("button", { name: t.common.submit }).click();
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
    if (outcome === "correct") return;
    await item.getByRole("button", { name: t.common.tryAgain }).click();
  }
  throw new Error("no option cleared the mistake");
}
