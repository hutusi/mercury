import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { resolveAudioUrl } from "../src/content/audio-hash";
import { allListening, audioManifest } from "../src/content/load";
import { answerAllQuestions, registerAndOnboard, t } from "./helpers";

// Audio lives on Vercel Blob (ADR 0022), not in the repo, and e2e must stay
// hermetic — so audio requests are fulfilled with a tiny committed MP3. The
// player's behavior (element wiring, playback, maxPlays, degradation) is what
// these specs guard; the bytes are interchangeable.
const FIXTURE_MP3 = fs.readFileSync(path.join(__dirname, "fixtures", "listening-sample.mp3"));

// Expected audio availability per exercise, computed with the exact logic the
// seed uses (resolveAudioUrl): a manifest entry whose hash no longer matches
// the script — the documented keyless edit-without-regenerating state — must
// expect the TTS fallback, same as the runtime. With no generated audio at
// all, the suite still covers the browser-TTS path; no spec needs a key.
const expectedAudio = new Map(
  allListening.map((ex) => [ex.id, resolveAudioUrl(ex.id, ex.script, audioManifest)]),
);
const anyAudio = [...expectedAudio.values()].some(Boolean);

async function openFirstExercise(page: Page): Promise<string> {
  await page.goto("/listening");
  await page.locator('a[href^="/zh/listening/"]').first().click();
  await page.waitForURL(/\/zh\/listening\/[^/]+$/);
  return page.url().split("/").pop() as string;
}

test("listening exercise: player matches generated audio, submit unlocks transcript", async ({
  page,
}) => {
  await page.route("**/audio/listening/**", (route) =>
    route.fulfill({ body: FIXTURE_MP3, contentType: "audio/mpeg" }),
  );
  await registerAndOnboard(page, "toeic");
  const exerciseId = await openFirstExercise(page);

  // Fresh pre-generated audio renders a chrome-less <audio>; without it (none
  // generated, or stale after a script edit) the player is pure browser TTS
  // and no audio element exists.
  if (expectedAudio.get(exerciseId)) {
    const audio = page.locator("audio");
    // Origin-relative without MERCURY_AUDIO_BASE_URL (the e2e default),
    // absolute Blob URL when an environment sets it — accept both.
    await expect(audio).toHaveAttribute("src", /\/audio\/listening\//);
    // Clicking play must actually start playback, not trip the degradation
    // path — an identity-unstable ref cleanup once paused the element on the
    // click's own re-render, rejecting play() and falsely degrading to TTS.
    await page.getByRole("button", { name: t.listening.play }).click();
    await expect
      .poll(() => audio.evaluate((el) => (el as HTMLAudioElement).currentTime))
      .toBeGreaterThan(0);
    await expect(audio.evaluate((el) => (el as HTMLAudioElement).error)).resolves.toBeNull();
    await expect(page.getByText(t.listening.usingBrowserTts, { exact: false })).toHaveCount(0);
    // The short fixture ends on its own; the player must return to a
    // replayable state rather than degrade.
    await expect.poll(() => audio.evaluate((el) => (el as HTMLAudioElement).paused)).toBe(true);
    await expect(page.getByRole("button", { name: t.listening.play })).toBeEnabled();
  } else {
    await expect(page.locator("audio")).toHaveCount(0);
  }
  await expect(page.getByText(t.listening.transcriptLocked)).toBeVisible();

  const submit = page.getByRole("button", { name: new RegExp(t.listening.submitAnswers) });
  await expect(submit).toBeDisabled();
  await answerAllQuestions(page);
  await expect(submit).toBeEnabled();
  await submit.click();

  await expect(page.getByText(t.common.accuracy, { exact: false })).toBeVisible();
  await expect(page.getByRole("heading", { name: t.listening.transcript })).toBeVisible();
});

test("blocked audio degrades to browser TTS with a visible hint", async ({ page }) => {
  test.skip(!anyAudio, "no fresh generated audio committed yet");

  await registerAndOnboard(page, "toeic");
  await page.route("**/audio/listening/**", (route) => route.abort());
  const exerciseId = await openFirstExercise(page);
  test.skip(!expectedAudio.get(exerciseId), "first listed exercise has no fresh audio");

  // preload starts the fetch on mount; the element's error handler flips the
  // player to TTS mode and surfaces the degradation hint without a click.
  await expect(page.getByText(t.listening.usingBrowserTts, { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: t.listening.play })).toBeEnabled();
  await expect(page.locator("audio")).toHaveCount(0);
});
