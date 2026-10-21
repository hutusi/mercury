import { expect, test } from "@playwright/test";
import { registerAndOnboard, t } from "./helpers";

const SPOKEN = "I would like to talk about a book that changed how I plan my working week";

test("speaking prompt renders with recorder or unsupported gate", async ({ page }) => {
  await registerAndOnboard(page, "toeic");

  await page.goto("/speaking");
  await page.locator('a[href^="/zh/speaking/"]').first().click();

  // Bilingual prompt is shown.
  await expect(page.getByRole("heading", { name: t.speaking.promptLabel })).toBeVisible();

  // Headless Chromium's SpeechRecognition availability varies by environment:
  // accept either the recorder UI or the graceful unsupported gate.
  const recorder = page.getByRole("button", { name: new RegExp(t.speaking.startPrep) });
  const gate = page.getByText(t.speaking.unsupported);
  await expect(recorder.or(gate).first()).toBeVisible();
});

test("speaking: record, review the transcript, submit into self-assessment", async ({ page }) => {
  // A scripted recognizer: one final phrase shortly after start(), onend on
  // stop() — the runner's whole flow without a microphone.
  await page.addInitScript((spoken) => {
    class FakeRecognition {
      lang = "en-US";
      continuous = true;
      interimResults = true;
      onresult: ((e: unknown) => void) | null = null;
      onerror: ((e: { error: string }) => void) | null = null;
      onend: (() => void) | null = null;
      start() {
        setTimeout(() => {
          this.onresult?.({
            resultIndex: 0,
            results: [{ isFinal: true, 0: { transcript: spoken } }],
          });
        }, 200);
      }
      stop() {
        setTimeout(() => this.onend?.(), 50);
      }
      abort() {}
    }
    (window as unknown as Record<string, unknown>).SpeechRecognition = FakeRecognition;
  }, SPOKEN);

  await registerAndOnboard(page, "toeic");
  await page.goto("/speaking");
  await page.locator('a[href^="/zh/speaking/"]').first().click();
  await page.waitForURL(/\/zh\/speaking\/[^/]+$/);

  await page.getByRole("button", { name: t.speaking.startPrep }).click();
  // Prompts with preparation time count down first; skip it.
  const skip = page.getByRole("button", { name: t.speaking.skipPrep });
  const stop = page.getByRole("button", { name: t.speaking.stop });
  await expect(skip.or(stop).first()).toBeVisible();
  if (await skip.isVisible()) await skip.click();

  await expect(page.getByText(t.speaking.recording)).toBeVisible();
  await expect(page.getByText(SPOKEN)).toBeVisible();
  await stop.click();

  // Review: the transcript is what gets graded.
  await expect(
    page.getByRole("heading", { name: new RegExp(t.speaking.transcript) }),
  ).toBeVisible();
  await page.getByRole("button", { name: t.speaking.submitForFeedback }).click();

  // Keyless: self-assessment, then a way on.
  await expect(page.getByText(t.speaking.selfAssessTitle, { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: t.speaking.checklist })).toBeVisible();
  await expect(page.getByRole("button", { name: t.speaking.again })).toBeVisible();
  await expect(page.getByRole("link", { name: t.reading.backToList })).toHaveAttribute(
    "href",
    "/zh/speaking",
  );
});
