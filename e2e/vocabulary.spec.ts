import { expect, test } from "@playwright/test";
import { registerAndOnboard, t } from "./helpers";

test("flashcard study: flip reveals grading, Good advances, Again re-queues", async ({ page }) => {
  await registerAndOnboard(page, "toeic");

  await page.goto("/vocabulary/study");

  // A new-word session starts at 1 / N.
  await expect(page.getByText(/^1 \/ \d+$/)).toBeVisible();
  await expect(page.getByText(t.vocab.flipHint)).toBeVisible();

  // Grade buttons hidden until the card is flipped.
  const goodButton = page.getByRole("button", { name: t.vocab.good, exact: true });
  await expect(goodButton).toBeHidden();

  // Flip card 1 and grade "Good": advances, reviewed counter increments.
  await page.getByText(t.vocab.flipHint).click();
  await expect(goodButton).toBeVisible();
  await goodButton.click();
  await expect(page.getByText(/^2 \/ \d+$/)).toBeVisible();
  await expect(page.getByText(`${t.vocab.reviewedCount}: 1`)).toBeVisible();

  // Flip card 2 and grade "Again": the card re-queues, so the total grows.
  const counter = await page.getByText(/^2 \/ \d+$/).textContent();
  const total = Number(counter!.split("/")[1].trim());
  await page.getByText(t.vocab.flipHint).click();
  const againButton = page.getByRole("button", { name: t.vocab.again, exact: true });
  await expect(againButton).toBeVisible();
  await againButton.click();
  await expect(page.getByText(new RegExp(`^3 / ${total + 1}$`))).toBeVisible();
});
