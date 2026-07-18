import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { resolveExamAudioUrl } from "../src/content/audio-hash";
import { allExams, audioManifest } from "../src/content/load";
import { answerAllQuestions, registerAndOnboard, t } from "./helpers";

// Same seed-parity gating as listening.spec.ts: the exam's listening groups
// carry audio only when their manifest hash matches the current script.
const miniToeic = allExams.find((e) => e.id === "exam-toeic-mini");
const firstScriptGroup = miniToeic?.sections
  .flatMap((s) => s.groups)
  .find((g) => g.script !== undefined);
const expectedExamAudio =
  miniToeic && firstScriptGroup?.script
    ? resolveExamAudioUrl(miniToeic.id, firstScriptGroup.id, firstScriptGroup.script, audioManifest)
    : null;
const FIXTURE_MP3 = fs.readFileSync(path.join(__dirname, "fixtures", "listening-sample.mp3"));

test("mini-TOEIC: both sections, submit, score report", async ({ page }) => {
  await page.route("**/audio/exams/**", (route) =>
    route.fulfill({ body: FIXTURE_MP3, contentType: "audio/mpeg" }),
  );
  await registerAndOnboard(page, "toeic");

  // Exam list → intro.
  await page.goto("/exams");
  await page.locator('a[href="/zh/exams/exam-toeic-mini"]').first().click();
  await expect(page.getByText(t.exams.rules)).toBeVisible();

  // Start: creates the attempt with a server-issued deadline.
  await page.getByRole("button", { name: t.exams.startExam }).click();
  await page.waitForURL("**/exams/exam-toeic-mini/take");

  // Section 1 (listening): countdown ticks and the player renders.
  await expect(page.getByText(new RegExp(`1/2 · ${t.exams.listeningSection}`))).toBeVisible();
  await expect(page.getByText(/\d{2}:\d{2}/)).toBeVisible();
  await expect(page.getByText(t.exams.audioOnce)).toBeVisible();

  // With fresh generated audio the group renders a chrome-less <audio> aimed
  // at the exam render; without it, pure browser TTS (no element).
  if (expectedExamAudio) {
    await expect(page.locator("audio").first()).toHaveAttribute("src", /\/audio\/exams\//);
  } else {
    await expect(page.locator("audio")).toHaveCount(0);
  }

  // Answer everything (independent of audio playback) and submit the section.
  await answerAllQuestions(page);
  await page.getByRole("button", { name: new RegExp(t.exams.submitSection) }).click();
  await expect(page.getByText(t.exams.confirmSubmitSection)).toBeVisible();
  await page.getByRole("button", { name: t.exams.nextSection }).click();

  // Section 2 (reading): fresh timer, passages visible.
  await expect(page.getByText(new RegExp(`2/2 · ${t.exams.readingSection}`))).toBeVisible();
  await answerAllQuestions(page);
  await page.getByRole("button", { name: new RegExp(t.exams.submitSection) }).click();
  await page.getByRole("button", { name: t.common.finish, exact: true }).click();

  // Score report: TOEIC estimate hero + section breakdown + review.
  await page.waitForURL("**/exams/attempts/**");
  await expect(page.getByText(t.exams.totalEstimate)).toBeVisible();
  await expect(page.getByText("/ 495").first()).toBeVisible();
  await expect(page.getByText(t.exams.sectionBreakdown)).toBeVisible();
  await expect(page.getByText(t.exams.reviewTitle)).toBeVisible();

  // The funnel: the business cross-promo sits on the score report.
  await expect(page.getByText(t.crosspromo.examToBusinessTitle)).toBeVisible();

  // History shows the completed attempt.
  await page.goto("/exams");
  await expect(page.getByText(new RegExp("TOEIC \\d+")).first()).toBeVisible();
});
