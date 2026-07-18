import { expect, test } from "@playwright/test";
import { registerAndOnboard, t } from "./helpers";

test("flashcard study: flip reveals grading, Good advances, Again re-queues", async ({ page }) => {
  await registerAndOnboard(page, "toeic");

  await page.goto("/vocabulary/study");

  // A new-word session starts at 1 / N.
  await expect(page.getByText(/^1 \/ \d+$/)).toBeVisible();
  await expect(page.getByText(t.vocab.flipHint)).toBeVisible();
  await expect(page.getByRole("progressbar", { name: t.vocab.sessionProgress })).toBeVisible();

  // Word pronunciation is offered before the flip (headless Chromium exposes
  // speechSynthesis; presence only — never trigger playback in e2e).
  await expect(page.getByRole("button", { name: t.vocab.speakWord })).toBeVisible();

  // Grade buttons hidden until the card is flipped.
  const goodButton = page.getByRole("button", { name: t.vocab.good, exact: true });
  await expect(goodButton).toBeHidden();

  // Flip card 1: grading appears with truthful SM-2 interval hints for a new
  // card, plus the example-sentence speaker.
  await page.getByText(t.vocab.flipHint).click();
  await expect(goodButton).toBeVisible();
  await expect(page.getByRole("button", { name: t.vocab.speakExample })).toBeVisible();
  const againButton = page.getByRole("button", { name: t.vocab.again, exact: true });
  await expect(againButton).toContainText(`10 ${t.vocab.intervalMinutesUnit}`);
  await expect(goodButton).toContainText(`1 ${t.vocab.intervalDaysUnit}`);

  // Grade "Good": advances, reviewed counter increments.
  await goodButton.click();
  await expect(page.getByText(/^2 \/ \d+$/)).toBeVisible();
  await expect(page.getByText(`${t.vocab.reviewedCount}: 1`)).toBeVisible();

  // Flip card 2 and grade "Forgot": the card re-queues, so the total grows.
  const counter = await page.getByText(/^2 \/ \d+$/).textContent();
  const total = Number(counter!.split("/")[1].trim());
  await page.getByText(t.vocab.flipHint).click();
  await expect(againButton).toBeVisible();
  await againButton.click();
  await expect(page.getByText(new RegExp(`^3 / ${total + 1}$`))).toBeVisible();

  // Card 3 grades via the keyboard: key "3" is Good.
  await page.getByText(t.vocab.flipHint).click();
  await expect(goodButton).toBeVisible();
  await page.keyboard.press("3");
  await expect(page.getByText(new RegExp(`^4 / ${total + 1}$`))).toBeVisible();
  await expect(page.getByText(`${t.vocab.reviewedCount}: 3`)).toBeVisible();
});
