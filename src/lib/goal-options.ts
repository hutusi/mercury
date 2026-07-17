/**
 * Goal-form option lists shared by onboarding and the settings goal editor.
 * IELTS values are band×10 (65 = 6.5) — the learner_profiles encoding.
 */
export const TARGET_OPTIONS: Record<"toeic" | "ielts", { value: number; label: string }[]> = {
  toeic: [600, 700, 800, 900].map((value) => ({ value, label: String(value) })),
  ielts: [55, 60, 65, 70, 75].map((value) => ({ value, label: (value / 10).toFixed(1) })),
};

export const MINUTE_OPTIONS = [10, 15, 20, 30, 45, 60];
