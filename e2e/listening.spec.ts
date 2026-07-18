import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { answerAllQuestions, registerAndOnboard, t } from "./helpers";

// The audio manifest ships with the MP3s (ADR 0021) and the seeded audioUrl
// mirrors it, so the specs read it to know which player mode to expect. With
// no generated audio committed, the suite still covers the browser-TTS path —
// generation never runs in CI and no spec needs a DashScope key.
const manifestPath = path.join(process.cwd(), "content", "audio-manifest.json");
const manifest: Record<string, { file: string }> = fs.existsSync(manifestPath)
  ? (JSON.parse(fs.readFileSync(manifestPath, "utf8")) as Record<string, { file: string }>)
  : {};

async function openFirstExercise(page: Page): Promise<string> {
  await page.goto("/listening");
  await page.locator('a[href^="/zh/listening/"]').first().click();
  await page.waitForURL(/\/zh\/listening\/[^/]+$/);
  return page.url().split("/").pop() as string;
}

test("listening exercise: player matches generated audio, submit unlocks transcript", async ({
  page,
}) => {
  await registerAndOnboard(page, "toeic");
  const exerciseId = await openFirstExercise(page);

  // Pre-generated audio renders a chrome-less <audio>; without it the player
  // is pure browser TTS and no audio element exists.
  if (manifest[`listening:${exerciseId}`]) {
    const audio = page.locator("audio");
    await expect(audio).toHaveAttribute("src", /^\/audio\/listening\//);
    // Clicking play must actually start playback, not trip the degradation
    // path — an identity-unstable ref cleanup once paused the element on the
    // click's own re-render, rejecting play() and falsely degrading to TTS.
    await page.getByRole("button", { name: t.listening.play }).click();
    await expect
      .poll(() => audio.evaluate((el) => (el as HTMLAudioElement).currentTime))
      .toBeGreaterThan(0);
    await expect(audio.evaluate((el) => (el as HTMLAudioElement).error)).resolves.toBeNull();
    await expect(page.getByText(t.listening.usingBrowserTts, { exact: false })).toHaveCount(0);
    await page.getByRole("button", { name: t.listening.pause }).click();
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
  test.skip(Object.keys(manifest).length === 0, "no generated audio committed yet");

  await registerAndOnboard(page, "toeic");
  await page.route("**/audio/listening/**", (route) => route.abort());
  const exerciseId = await openFirstExercise(page);
  test.skip(!manifest[`listening:${exerciseId}`], "first listed exercise has no audio");

  // preload starts the fetch on mount; the element's error handler flips the
  // player to TTS mode and surfaces the degradation hint without a click.
  await expect(page.getByText(t.listening.usingBrowserTts, { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: t.listening.play })).toBeEnabled();
  await expect(page.locator("audio")).toHaveCount(0);
});
