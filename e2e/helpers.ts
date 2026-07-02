import { expect, type Page } from "@playwright/test";
import { dictionaries } from "../src/lib/i18n/dictionaries";

/** Default locale is zh (no cookie set) — assert against the zh dictionary. */
export const t = dictionaries.zh;

let userCounter = 0;

/** Register a fresh user through the UI; lands on /onboarding. */
export async function registerUser(page: Page): Promise<{ email: string; password: string }> {
  userCounter += 1;
  const email = `user-${Date.now()}-${userCounter}@example.com`;
  const password = "password123";

  await page.goto("/register");
  await page.locator("#name").fill("E2E User");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: t.auth.signUp }).click();

  // Client pushes /dashboard; the (app) layout bounces to /onboarding
  // because no track is set yet.
  await page.waitForURL("**/onboarding");
  return { email, password };
}

/** Pick a track on the onboarding screen; lands on /dashboard. */
export async function pickTrack(page: Page, track: "toeic" | "ielts" | "business" = "toeic") {
  const label = t.tracks[track];
  await page.getByRole("button", { name: new RegExp(label) }).click();
  await page.getByRole("button", { name: t.onboarding.confirm }).click();
  await page.waitForURL("**/dashboard");
}

/** Register + onboard in one step. */
export async function registerAndOnboard(
  page: Page,
  track: "toeic" | "ielts" | "business" = "toeic",
) {
  const creds = await registerUser(page);
  await pickTrack(page, track);
  return creds;
}

/**
 * Answer every visible MCQ by clicking its first option.
 * QuestionsForm renders each question as li > (p stem, div of option buttons),
 * so `li > div > button:first-child` is exactly one button per question.
 */
export async function answerAllQuestions(page: Page) {
  const firstOptions = page.locator("li > div > button:first-child");
  const count = await firstOptions.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    await firstOptions.nth(i).click();
  }
}
