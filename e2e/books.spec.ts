import { expect, test } from "@playwright/test";
import { registerAndOnboard, t } from "./helpers";

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

  // Chapter 1 reads normally.
  await page.goto("/books/book-oz/chapters/oz-ch-01");
  await expect(page.getByRole("heading", { name: "The Cyclone" })).toBeVisible();

  // Check-in: choosing an option reveals the key + explanation, and the
  // options lock. Option A on the first check-in is a distractor, so the
  // "not quite" state must show — proving the reveal round-trip, not a guess.
  const checkIn = page.getByRole("complementary", { name: t.books.checkInLabel }).first();
  await checkIn.getByRole("button").first().click();
  await expect(checkIn.getByText(`${t.reading.explanation}：`)).toBeVisible();
  await expect(checkIn.getByText(t.books.checkInIncorrect)).toBeVisible();
  await expect(checkIn.getByRole("button").first()).toBeDisabled();

  // The end-of-chapter quiz gate is present.
  await expect(page.getByRole("button", { name: t.books.startQuiz })).toBeVisible();
});
