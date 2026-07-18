/**
 * The DB and exam snapshots store audio paths origin-relative; files live on
 * Vercel Blob (ADR 0022), so the fetchable URL is composed server-side from
 * the store origin. Unset base (dev/CI without Blob) keeps the relative path —
 * served from the gitignored local render cache when present, degrading to
 * browser TTS otherwise. Server-only: reads env at call time.
 */
export function composeAudioUrl(audioPath: string | null | undefined): string | null {
  if (!audioPath) return null;
  const base = process.env.MERCURY_AUDIO_BASE_URL;
  return base ? `${base.replace(/\/$/, "")}${audioPath}` : audioPath;
}
