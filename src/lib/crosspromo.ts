import type { Track } from "../content/types";

/**
 * The funnel: exam-track users get nudged toward practical business English
 * (retention), business-track users toward a mini mock exam (benchmarking,
 * and a taste of the exam-prep surface).
 */
export function getCrossPromo(goalTrack: Track): {
  direction: "examToBusiness" | "businessToExam";
  href: string;
} {
  if (goalTrack === "business") {
    return { direction: "businessToExam", href: "/exams" };
  }
  return { direction: "examToBusiness", href: "/reading/biz-r-001" };
}
