import { describe, expect, test } from "bun:test";
import { resetPasswordEmail, verificationEmail } from "./templates";

const URL = "https://mercury.ainaive.com/api/auth/verify-email?token=abc&callbackURL=%2Fzh";

describe("email templates", () => {
  for (const [name, build] of [
    ["verificationEmail", verificationEmail],
    ["resetPasswordEmail", resetPasswordEmail],
  ] as const) {
    test(`${name} carries the URL in html and text`, () => {
      const { subject, html, text } = build({ url: URL });
      expect(html).toContain(`href="${URL.replaceAll("&", "&amp;")}"`);
      expect(text).toContain(URL);
      expect(subject.length).toBeGreaterThan(0);
    });

    test(`${name} is bilingual`, () => {
      const { subject, html } = build({ url: URL });
      // zh + en both present in subject and body.
      expect(subject).toMatch(/[一-鿿]/);
      expect(subject).toMatch(/[A-Za-z]/);
      expect(html).toMatch(/[一-鿿]/);
      expect(html).toMatch(/expires in 1 hour/);
    });
  }

  test("html-escapes the interpolated URL", () => {
    const { html } = verificationEmail({ url: 'https://x.test/?a="<b>"' });
    expect(html).not.toContain('"<b>"');
    expect(html).toContain("&quot;&lt;b&gt;&quot;");
  });
});
