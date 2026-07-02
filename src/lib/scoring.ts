/**
 * Maps mini-exam raw scores to estimated real-exam scores. The mock exams
 * have far fewer questions than the real tests, so we map by percentage
 * through piecewise-linear tables. Always presented as "估算 / estimate".
 */

// % correct → TOEIC scaled section score (each section 5–495).
const TOEIC_SECTION_POINTS: Array<[number, number]> = [
  [0, 5],
  [0.2, 100],
  [0.4, 200],
  [0.6, 300],
  [0.8, 400],
  [0.9, 450],
  [1, 495],
];

// % correct → IELTS band, mirroring the shape of official L/R conversions.
const IELTS_BAND_STEPS: Array<[number, number]> = [
  [0.97, 9],
  [0.89, 8.5],
  [0.82, 8],
  [0.75, 7.5],
  [0.67, 7],
  [0.6, 6.5],
  [0.5, 6],
  [0.42, 5.5],
  [0.35, 5],
  [0.25, 4.5],
  [0.15, 4],
];

function interpolate(points: Array<[number, number]>, pct: number): number {
  const p = Math.min(1, Math.max(0, pct));
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    if (p <= x1) {
      return y0 + ((p - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return points[points.length - 1][1];
}

/** Estimated TOEIC section score (5–495), rounded to the nearest 5. */
export function estimateToeicSection(raw: number, max: number): number {
  if (max <= 0) return 5;
  const scaled = interpolate(TOEIC_SECTION_POINTS, raw / max);
  return Math.min(495, Math.max(5, Math.round(scaled / 5) * 5));
}

export function estimateToeic(
  listening: { raw: number; max: number },
  reading: { raw: number; max: number },
): { listening: number; reading: number; total: number } {
  const l = estimateToeicSection(listening.raw, listening.max);
  const r = estimateToeicSection(reading.raw, reading.max);
  return { listening: l, reading: r, total: l + r };
}

/** Estimated IELTS band (3.5–9.0 in half steps). */
export function estimateIeltsBand(raw: number, max: number): number {
  if (max <= 0) return 3.5;
  const pct = raw / max;
  for (const [threshold, band] of IELTS_BAND_STEPS) {
    if (pct >= threshold) return band;
  }
  return 3.5;
}
