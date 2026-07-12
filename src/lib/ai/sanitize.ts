/**
 * Learner-originated text is untrusted: neutralize angle brackets so it cannot
 * close our delimiter tags and smuggle instructions into a prompt. Full-width
 * equivalents keep the text readable for the model. Lives in its own module
 * (not client.ts) so DB-free pure modules can reuse it without pulling in the
 * provider transports.
 */
export function sanitizeUntrusted(text: string): string {
  return text.replace(/</g, "＜").replace(/>/g, "＞");
}
