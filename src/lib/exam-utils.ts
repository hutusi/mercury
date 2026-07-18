import type {
  ExamGroup,
  ExamSection,
  ExamTrack,
  SanitizedQuestion,
  ScriptLine,
} from "../content/types";
import { composeAudioUrl } from "./audio-url";
import { estimateIeltsBand, estimateToeic } from "./scoring";

export interface SectionScoreResult {
  sectionId: string;
  kind: "listening" | "reading";
  raw: number;
  max: number;
}

export type ExamEstimateResult =
  | { kind: "toeic"; listening: number; reading: number; total: number }
  | { kind: "ielts"; band: number };

export function gradeExam(
  track: ExamTrack,
  sections: ExamSection[],
  answers: Record<string, number>,
): {
  sectionScores: SectionScoreResult[];
  rawScore: number;
  maxScore: number;
  estimate: ExamEstimateResult;
} {
  const sectionScores = sections.map((s) => {
    let raw = 0;
    let max = 0;
    for (const group of s.groups) {
      for (const q of group.questions) {
        max += 1;
        if (answers[q.id] === q.correctIndex) raw += 1;
      }
    }
    return { sectionId: s.id, kind: s.kind, raw, max };
  });
  const rawScore = sectionScores.reduce((n, s) => n + s.raw, 0);
  const maxScore = sectionScores.reduce((n, s) => n + s.max, 0);

  let estimate: ExamEstimateResult;
  if (track === "toeic") {
    const sum = (kind: "listening" | "reading") => {
      const xs = sectionScores.filter((s) => s.kind === kind);
      return { raw: xs.reduce((n, s) => n + s.raw, 0), max: xs.reduce((n, s) => n + s.max, 0) };
    };
    estimate = { kind: "toeic", ...estimateToeic(sum("listening"), sum("reading")) };
  } else {
    estimate = { kind: "ielts", band: estimateIeltsBand(rawScore, maxScore) };
  }

  return { sectionScores, rawScore, maxScore, estimate };
}

export function sectionQuestionIds(section: ExamSection): Set<string> {
  return new Set(section.groups.flatMap((g) => g.questions.map((q) => q.id)));
}

/**
 * Merge submitted/autosaved answers for one section: only questions belonging
 * to the section are accepted, and nothing is accepted past the deadline's
 * grace window — late answers are discarded. Returns the `existing` object
 * itself when nothing was accepted so callers can cheaply detect a no-op.
 */
export function acceptSectionAnswers(
  section: ExamSection,
  deadline: { expiresAt: number } | undefined,
  now: number,
  existing: Record<string, number>,
  incoming: Record<string, number>,
  graceMs: number,
): Record<string, number> {
  const onTime = deadline ? now <= deadline.expiresAt + graceMs : false;
  if (!onTime) return existing;
  const valid = sectionQuestionIds(section);
  const merged: Record<string, number> = { ...existing };
  for (const [qid, choice] of Object.entries(incoming)) {
    if (valid.has(qid)) merged[qid] = choice;
  }
  return merged;
}

/**
 * Exam content as seeded: the DB's sections jsonb (and every attempt's
 * immutable snapshot copied from it) may carry generated-audio paths on
 * listening groups (ADR 0023). Kept out of the content ExamGroupSchema so the
 * authoring JSON Schemas never advertise a machine-written field.
 */
export type SeededExamGroup = ExamGroup & { audioUrl?: string | null };
export type SeededExamSection = Omit<ExamSection, "groups"> & { groups: SeededExamGroup[] };

export interface SanitizedExamGroup {
  id: string;
  passage?: string;
  script?: ScriptLine[];
  audioUrl?: string | null;
  questions: SanitizedQuestion[];
}

export interface SanitizedExamSection {
  id: string;
  kind: "listening" | "reading";
  title: string;
  titleZh: string;
  durationSeconds: number;
  groups: SanitizedExamGroup[];
}

export function sanitizeSections(sections: SeededExamSection[]): SanitizedExamSection[] {
  return sections.map((section) => ({
    id: section.id,
    kind: section.kind,
    title: section.title,
    titleZh: section.titleZh,
    durationSeconds: section.durationSeconds,
    groups: section.groups.map((group) => ({
      id: group.id,
      passage: group.passage,
      // Listening scripts must reach the client for TTS fallback; answers
      // never do. audioUrl points at the group's pre-generated render
      // (snapshots taken before audio existed simply lack it → TTS).
      script: group.script,
      audioUrl: composeAudioUrl(group.audioUrl),
      questions: group.questions.map(({ id, stem, options }) => ({ id, stem, options })),
    })),
  }));
}
