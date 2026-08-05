import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { resolveVocabAudioUrl } from "../src/content/audio-hash";
import { allVocab, audioManifest } from "../src/content/load";
import * as dbSchema from "../src/lib/db/schema";
import { srsCards, user, vocabQuizSessions } from "../src/lib/db/schema";
import { e2eDatabaseUrl } from "./db-url";
import { registerAndOnboard, t } from "./helpers";

const pool = new Pool({ connectionString: e2eDatabaseUrl(), max: 2 });
const testDb = drizzle(pool, { schema: dbSchema });

test.afterAll(async () => {
  await pool.end();
});

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

  // Word pronunciation is offered before the flip (manual replay button).
  // The fetch assertion rides the flip below — clicking here first would
  // warm the audio element and mask the auto-play request.
  await expect(page.getByRole("button", { name: t.vocab.speakWord })).toBeVisible();

  // Grade buttons hidden until the card is flipped.
  const goodButton = page.getByRole("button", { name: t.vocab.good, exact: true });
  await expect(goodButton).toBeHidden();

  // Flip card 1: grading appears, plus the example-sentence speaker. The
  // reveal also auto-pronounces the headword (default on), so with generated
  // audio the flip itself must fetch the MP3 (fulfilled hermetically above);
  // without it, browser TTS is never triggered in e2e.
  await page.getByText(t.vocab.flipHint).click();
  await expect(goodButton).toBeVisible();
  await expect(page.getByRole("button", { name: t.vocab.speakExample })).toBeVisible();
  if (expectedWordAudio) {
    await expect.poll(() => audioRequested).toBe(true);
  }
  const againButton = page.getByRole("button", { name: t.vocab.again, exact: true });

  // Interval previews are deliberately gone (scheduler internals stay
  // hidden): the buttons carry exactly their labels — a regressed hint span
  // or its aria-describedby wiring fails these.
  await expect(goodButton).toHaveText(t.vocab.good);
  await expect(againButton).toHaveText(t.vocab.again);
  await expect(goodButton).not.toHaveAttribute("aria-describedby");
  await expect(againButton).not.toHaveAttribute("aria-describedby");

  // Grade "Good": advances, reviewed counter increments.
  await goodButton.click();
  await expect(page.getByText(/^2 \/ \d+$/)).toBeVisible();
  await expect(page.getByText(`${t.vocab.reviewedCount}: 1`)).toBeVisible();

  // Mute the auto-pronounce toggle: flipping card 2 must stay silent.
  const autoSpeakToggle = page.getByRole("button", { name: t.vocab.autoSpeak });
  await expect(autoSpeakToggle).toHaveAttribute("aria-pressed", "true");
  await autoSpeakToggle.click();
  await expect(autoSpeakToggle).toHaveAttribute("aria-pressed", "false");
  audioRequested = false;

  // Flip card 2 and grade "Forgot": the card re-queues, so the total grows.
  const counter = await page.getByText(/^2 \/ \d+$/).textContent();
  const total = Number(counter!.split("/")[1].trim());
  await page.getByText(t.vocab.flipHint).click();
  await expect(againButton).toBeVisible();
  // The flip fires any audio fetch synchronously, so once the answer is
  // visible an untouched flag proves the mute held.
  expect(audioRequested).toBe(false);
  await againButton.click();
  await expect(page.getByText(new RegExp(`^3 / ${total + 1}$`))).toBeVisible();

  // Card 3 grades via the keyboard: key "3" is Good.
  await page.getByText(t.vocab.flipHint).click();
  await expect(goodButton).toBeVisible();
  await page.keyboard.press("3");
  await expect(page.getByText(new RegExp(`^4 / ${total + 1}$`))).toBeVisible();
  await expect(page.getByText(`${t.vocab.reviewedCount}: 3`)).toBeVisible();
});

// The two ADR 0029 study-queue behaviors the UI can't reach without existing
// scheduler state, seeded directly into the scratch DB (the
// integrity-regressions pattern): due reviews cross packs, and the new-word
// top-up spills past an exhausted goal pack.
test("ADR 0029: due reviews cross packs; new words spill over past the goal pack", async ({
  page,
}) => {
  const { email } = await registerAndOnboard(page, "toeic");
  const [account] = await testDb.select({ id: user.id }).from(user).where(eq(user.email, email));

  // A past-due card on a business-pack word: due cards lead the queue, so a
  // toeic-goal learner must still see it first — the round-1 chips would
  // have hidden it behind the goal-track default.
  const bizWord = allVocab.find((w) => w.track === "business")!;
  await testDb.insert(srsCards).values({
    userId: account.id,
    wordId: bizWord.id,
    intervalDays: 1,
    repetitions: 1,
    dueAt: new Date(Date.now() - 60_000),
  });
  await page.goto("/vocabulary/study");
  await expect(page.getByText(bizWord.headword, { exact: true })).toBeVisible();

  // Exhaust the goal pack (cards for every toeic word, none due) and push
  // the business card out of due range: the queue is new-words-only and must
  // spill over to the first ielts-pack word instead of stopping at the goal.
  const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await testDb
    .insert(srsCards)
    .values(
      allVocab
        .filter((w) => w.track === "toeic")
        .map((w) => ({ userId: account.id, wordId: w.id, dueAt: future })),
    );
  await testDb.update(srsCards).set({ dueAt: future }).where(eq(srsCards.userId, account.id));

  const spillWord = allVocab.find((w) => w.track === "ielts")!;
  await page.goto("/vocabulary/study");
  await expect(page.getByText(spillWord.headword, { exact: true })).toBeVisible();
  await expect(page.getByText(t.vocab.fresh, { exact: true })).toBeVisible();
});

test("quiz recovery: an expired session offers restart and the fresh quiz is usable", async ({
  page,
}) => {
  // Regression for the QuizRunner remount: router.refresh() resolves a NEW
  // session, and without key={sessionId} the runner's stale `expired` state
  // kept the restart screen frozen forever.
  const { email } = await registerAndOnboard(page, "toeic");
  await page.goto("/vocabulary/quiz");
  await expect(page.locator("#main-content").getByText("1 / 10")).toBeVisible();

  // Expire the session behind the page's back, then answer — the typed
  // expiry lands and the restart screen replaces the quiz.
  const [account] = await testDb.select({ id: user.id }).from(user).where(eq(user.email, email));
  // Backdate createdAt too — the expiry check constraint requires
  // expires_at > created_at.
  await testDb
    .update(vocabQuizSessions)
    .set({ createdAt: new Date(Date.now() - 60_000), expiresAt: new Date(Date.now() - 1000) })
    .where(eq(vocabQuizSessions.userId, account.id));
  await page.locator("#main-content button").first().click();
  await expect(page.getByText(t.vocab.quizExpired)).toBeVisible();

  // Restart mints a fresh session and a fully usable quiz.
  await page.getByRole("button", { name: t.vocab.quizRestart }).click();
  await expect(page.locator("#main-content").getByText("1 / 10")).toBeVisible();
  await expect(page.locator("#main-content button").first()).toBeEnabled();
});
