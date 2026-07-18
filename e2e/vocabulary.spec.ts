import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { resolveVocabAudioUrl } from "../src/content/audio-hash";
import { allVocab, audioManifest } from "../src/content/load";
import { registerAndOnboard, t } from "./helpers";

// The first study card for a fresh toeic user is the lowest-sortOrder unseen
// word; its pre-generated headword audio exists only when the manifest hash
// is fresh (seed parity — see listening.spec.ts).
const firstWord = allVocab.find((w) => w.track === "toeic");
const expectedWordAudio = firstWord
  ? resolveVocabAudioUrl(firstWord.id, firstWord.headword, audioManifest)
  : null;
const FIXTURE_MP3 = fs.readFileSync(path.join(__dirname, "fixtures", "listening-sample.mp3"));

test("flashcard study: flip reveals grading, Good advances, Again re-queues", async ({ page }) => {
  let audioRequested = false;
  await page.route("**/audio/vocab/**", (route) => {
    audioRequested = true;
    return route.fulfill({ body: FIXTURE_MP3, contentType: "audio/mpeg" });
  });
  await registerAndOnboard(page, "toeic");

  await page.goto("/vocabulary/study");

  // A new-word session starts at 1 / N.
  await expect(page.getByText(/^1 \/ \d+$/)).toBeVisible();
  await expect(page.getByText(t.vocab.flipHint)).toBeVisible();
  await expect(page.getByRole("progressbar", { name: t.vocab.sessionProgress })).toBeVisible();

  // Word pronunciation is offered before the flip. With generated headword
  // audio the button must fetch the MP3 (fulfilled hermetically above);
  // without it, presence only — browser TTS is never triggered in e2e.
  await expect(page.getByRole("button", { name: t.vocab.speakWord })).toBeVisible();
  if (expectedWordAudio) {
    await page.getByRole("button", { name: t.vocab.speakWord }).click();
    await expect.poll(() => audioRequested).toBe(true);
  }

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
