import { expect, test } from "@playwright/test";
import { allReading, allVocab } from "../src/content/load";
import { buildGlossPattern, segmentGlossText } from "../src/lib/gloss-core";
import { apiSignUpAndOnboard } from "./api-helpers";
import { t } from "./helpers";

// A word reviewed on flashcards today is underlined where it reappears in a
// reading passage; tapping it shows the gloss. The pair (exercise, word) is
// found with the same matcher the app uses, so the test can't drift from
// the content.
const pair = (() => {
  for (const exercise of allReading.filter((e) => e.track === "toeic")) {
    for (const word of allVocab) {
      const glosses = [
        {
          wordId: word.id,
          headword: word.headword,
          translationZh: word.translationZh,
          ipa: word.ipa,
          pos: word.pos,
        },
      ];
      const hit = segmentGlossText(exercise.passage, buildGlossPattern(glosses)).find(
        (s) => typeof s !== "string",
      );
      if (hit && typeof hit !== "string") return { exercise, word, text: hit.text };
    }
  }
  return null;
})();

test("words reviewed today are highlighted in reading passages", async ({ page, request }) => {
  test.skip(!pair, "no TOEIC passage contains a seeded headword");
  const { exercise, word, text } = pair!;

  // Review the word today over the API, then sign in as that learner.
  const user = await apiSignUpAndOnboard(request, "toeic");
  const graded = await request.post("/api/v1/vocab/grade", {
    headers: user.authHeaders,
    data: { wordId: word.id, grade: 5 },
  });
  expect(graded.ok(), await graded.text()).toBeTruthy();

  await page.goto("/login");
  await page.locator("#email").fill(user.email);
  await page.locator("#password").fill(user.password);
  await page.getByRole("button", { name: t.auth.signIn }).click();
  await page.waitForURL("**/dashboard");

  await page.goto(`/reading/${exercise.id}`);
  await expect(page.getByText(t.reading.legend)).toBeVisible();
  await page.getByRole("button", { name: text, exact: true }).first().click();
  await expect(page.getByText(word.translationZh).first()).toBeVisible();
});
