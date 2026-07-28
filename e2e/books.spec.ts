import { expect, test } from "@playwright/test";
import { answerAllQuestions, registerAndOnboard, t } from "./helpers";

test("book reading: library → detail, chapter lock, check-in reveal", async ({ page }) => {
  await registerAndOnboard(page);

  // Library: track-agnostic list with the seeded book.
  await page.goto("/books");
  await expect(page.getByRole("heading", { name: t.nav.books })).toBeVisible();
  await expect(page.getByText("绿野仙踪", { exact: false })).toBeVisible();

  // Book detail: chapter 1 open, later chapters locked.
  await page.locator('a[href^="/zh/books/"]').first().click();
  await page.waitForURL(/\/zh\/books\/[^/]+$/);
  await expect(page.getByRole("heading", { name: "The Wonderful Wizard of Oz" })).toBeVisible();
  await expect(page.getByText(t.books.locked).first()).toBeVisible();

  // The lock is server-enforced: a deep link to chapter 2 bounces back.
  await page.goto("/books/book-oz/chapters/oz-ch-02");
  await page.waitForURL("**/books/book-oz");

  // Chapter 1 reads normally — and the payload is sanitized: no answer key
  // or explanation may appear anywhere in the HTML/flight data pre-answer.
  await page.goto("/books/book-oz/chapters/oz-ch-01");
  await expect(page.getByRole("heading", { name: "The Cyclone" })).toBeVisible();
  expect(await page.content()).not.toContain("correctIndex");

  // Check-in: choosing an option reveals the key + explanation, and the
  // options lock. Option A on the first check-in is a distractor, so the
  // "not quite" state must show — proving the reveal round-trip, not a guess.
  const checkIn = page.getByRole("complementary", { name: t.books.checkInLabel }).first();
  await checkIn.getByRole("button").first().click();
  await expect(checkIn.getByText(`${t.reading.explanation}：`)).toBeVisible();
  await expect(checkIn.getByText(t.books.checkInIncorrect)).toBeVisible();
  await expect(checkIn.getByRole("button").first()).toBeDisabled();

  // End-of-chapter quiz: entering it hides the prose (recall, book closed).
  await page.getByRole("button", { name: t.books.startQuiz }).click();
  await expect(page.getByText("Dorothy lived in the midst")).toBeHidden();

  const submit = page.getByRole("button", { name: new RegExp(t.common.submit) });
  await expect(submit).toBeDisabled();
  await answerAllQuestions(page);
  await expect(submit).toBeEnabled();
  await submit.click();

  // Graded result with explanations; first-option answers miss some
  // questions on purpose so the mistakes notebook has something to show.
  await expect(page.getByText(t.common.accuracy, { exact: false })).toBeVisible();
  await expect(page.getByText(`${t.reading.explanation}：`).first()).toBeVisible();

  // Submission completed the chapter: chapter 2 unlocked, best score shown.
  await expect(page.getByRole("link", { name: new RegExp(t.books.nextChapter) })).toHaveAttribute(
    "href",
    "/zh/books/book-oz/chapters/oz-ch-02",
  );
  await page.goto("/books/book-oz");
  await expect(page.getByText(new RegExp(`${t.reading.bestScore}:`)).first()).toBeVisible();
  // Two links now target chapter 2 (header continue button + its row) —
  // the unlock is what matters, not which link.
  await expect(page.locator('a[href="/zh/books/book-oz/chapters/oz-ch-02"]').first()).toBeVisible();

  // Missed quiz questions land in the notebook under the books group.
  await page.goto("/mistakes");
  await expect(page.getByRole("heading", { name: t.nav.books })).toBeVisible();

  // With a book in progress, the daily plan offers to continue it,
  // deep-linking to the now-current chapter 2.
  await page.goto("/dashboard");
  const planBookItem = page.getByRole("link", { name: new RegExp(t.plan.itemBookChapter) });
  await expect(planBookItem).toBeVisible();
  await expect(planBookItem).toHaveAttribute("href", "/zh/books/book-oz/chapters/oz-ch-02");
});
