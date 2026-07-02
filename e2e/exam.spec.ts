import { expect, test } from "@playwright/test";
import { answerAllQuestions, registerAndOnboard, t } from "./helpers";

test("mini-TOEIC: both sections, submit, score report", async ({ page }) => {
  await registerAndOnboard(page, "toeic");

  // Exam list → intro.
  await page.goto("/exams");
  await page.locator('a[href="/exams/exam-toeic-mini"]').first().click();
  await expect(page.getByText(t.exams.rules)).toBeVisible();

  // Start: creates the attempt with a server-issued deadline.
  await page.getByRole("button", { name: t.exams.startExam }).click();
  await page.waitForURL("**/exams/exam-toeic-mini/take");

  // Section 1 (listening): countdown ticks and the TTS player renders.
  await expect(page.getByText(new RegExp(`1/2 · ${t.exams.listeningSection}`))).toBeVisible();
  await expect(page.getByText(/\d{2}:\d{2}/)).toBeVisible();
  await expect(page.getByText(t.exams.audioOnce)).toBeVisible();

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
