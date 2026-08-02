import { expect, test } from "@playwright/test";
import { answerAllQuestions, registerAndOnboard, t } from "./helpers";

/**
 * The track is a per-feature content filter, not an app mode: lists default
 * to the goal track, "all" lifts the filter, and the header has no switcher.
 * Personal collections (vocabulary, mistakes) carry no filter at all
 * (ADR 0029) — they always show everything the learner owns.
 */

test("reading list defaults to the goal track; 全部 reveals other tracks", async ({ page }) => {
  await registerAndOnboard(page, "toeic");

  await page.goto("/reading");
  await expect(page.getByRole("heading", { name: t.nav.reading })).toBeVisible();

  // Goal-track default: TOEIC content only.
  await expect(page.locator('a[href="/zh/reading/toeic-r-001"]')).toBeVisible();
  await expect(page.locator('a[href="/zh/reading/biz-r-001"]')).toHaveCount(0);

  // The 全部 chip lifts the filter and reveals business content.
  const filterNav = page.getByRole("navigation", { name: t.filters.byTrack });
  await filterNav.getByRole("link", { name: t.filters.all }).click();
  await page.waitForURL("**/reading?track=all");
  await expect(page.locator('a[href="/zh/reading/biz-r-001"]')).toBeVisible();
  await expect(page.locator('a[href="/zh/reading/toeic-r-001"]')).toBeVisible();

  // A concrete chip narrows to that track.
  await filterNav.getByRole("link", { name: t.tracks.business }).click();
  await page.waitForURL("**/reading?track=business");
  await expect(page.locator('a[href="/zh/reading/toeic-r-001"]')).toHaveCount(0);
});

test("business goal sees both exam tracks by default; header has no switcher", async ({ page }) => {
  await registerAndOnboard(page, "business");

  await page.goto("/exams");
  await expect(page.getByRole("heading", { name: t.nav.exams })).toBeVisible();
  await expect(page.locator('a[href="/zh/exams/exam-toeic-mini"]')).toBeVisible();
  await expect(page.locator('a[href="/zh/exams/exam-ielts-mini"]')).toBeVisible();

  // No track mode remains in the chrome: the app header carries no switcher
  // control, only the per-page filter nav.
  await expect(page.locator("header").getByRole("combobox")).toHaveCount(0);

  // Narrowing to one exam track hides the other.
  await page
    .getByRole("navigation", { name: t.filters.byTrack })
    .getByRole("link", { name: t.tracks.ielts })
    .click();
  await page.waitForURL("**/exams?track=ielts");
  await expect(page.locator('a[href="/zh/exams/exam-toeic-mini"]')).toHaveCount(0);
  await expect(page.locator('a[href="/zh/exams/exam-ielts-mini"]')).toBeVisible();
});

test("an invalid ?track= degrades to the goal default", async ({ page }) => {
  await registerAndOnboard(page, "ielts");

  await page.goto("/reading?track=gre");
  await expect(page.locator('a[href="/zh/reading/ielts-r-001"]')).toBeVisible();
  await expect(page.locator('a[href="/zh/reading/toeic-r-001"]')).toHaveCount(0);
});

test("personal collections are unfiltered: cross-track mistakes surface, no chips", async ({
  page,
}) => {
  await registerAndOnboard(page, "toeic");

  // Seed business-track mistakes: biz-r-001's q2–q4 answers are not the
  // first option, so first-option answering is deterministically wrong.
  await page.goto("/reading/biz-r-001");
  const submit = page.getByRole("button", { name: new RegExp(t.reading.submitAnswers) });
  await expect(submit).toBeVisible();
  await answerAllQuestions(page);
  await submit.click();
  await expect(page.getByText(t.common.accuracy, { exact: false })).toBeVisible();

  // The notebook shows the business mistakes to this toeic-goal user — a
  // goal-track default would have hidden them — and renders no filter nav.
  await page.goto("/mistakes");
  await expect(page.getByRole("heading", { name: t.nav.mistakes })).toBeVisible();
  await expect(page.getByRole("navigation", { name: t.filters.byTrack })).toHaveCount(0);
  await expect(page.getByText(t.mistakes.lastWrong).first()).toBeVisible();

  // Vocabulary overview and study session carry no filter nav either.
  await page.goto("/vocabulary");
  await expect(page.getByRole("heading", { name: t.nav.vocabulary })).toBeVisible();
  await expect(page.getByRole("navigation", { name: t.filters.byTrack })).toHaveCount(0);
  await page.goto("/vocabulary/study");
  await expect(page.getByRole("heading", { name: t.vocab.study })).toBeVisible();
  await expect(page.getByRole("navigation", { name: t.filters.byTrack })).toHaveCount(0);
});
