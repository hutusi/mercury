import { describe, expect, test } from "bun:test";
import { enabledSocialProviders } from "./social-providers";

describe("enabledSocialProviders", () => {
  test("empty env enables nothing", () => {
    expect(enabledSocialProviders({})).toEqual([]);
  });

  test("a provider needs both id and secret", () => {
    expect(enabledSocialProviders({ GOOGLE_CLIENT_ID: "id" })).toEqual([]);
    expect(enabledSocialProviders({ GOOGLE_CLIENT_SECRET: "secret" })).toEqual([]);
    expect(
      enabledSocialProviders({ GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "secret" }),
    ).toEqual(["google"]);
  });

  test('empty strings count as unset (playwright blanks vars with "")', () => {
    expect(enabledSocialProviders({ GITHUB_CLIENT_ID: "", GITHUB_CLIENT_SECRET: "" })).toEqual([]);
    expect(enabledSocialProviders({ GITHUB_CLIENT_ID: "id", GITHUB_CLIENT_SECRET: "" })).toEqual(
      [],
    );
  });

  test("providers are independent and ordered stably", () => {
    expect(
      enabledSocialProviders({ GITHUB_CLIENT_ID: "id", GITHUB_CLIENT_SECRET: "secret" }),
    ).toEqual(["github"]);
    expect(
      enabledSocialProviders({
        GITHUB_CLIENT_ID: "id",
        GITHUB_CLIENT_SECRET: "secret",
        GOOGLE_CLIENT_ID: "id",
        GOOGLE_CLIENT_SECRET: "secret",
      }),
    ).toEqual(["google", "github"]);
  });
});
