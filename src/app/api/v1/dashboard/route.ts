import { requireOnboardedApi } from "@/lib/api/auth";
import { apiHandler } from "@/lib/api/handler";
import { getDashboardData } from "@/lib/queries/dashboard";

export const GET = apiHandler(async (req) => {
  const { user, goalTrack, timeZone } = await requireOnboardedApi(req);
  const data = await getDashboardData(user.id, timeZone);

  // Raw values only — the client owns labels and formatting.
  const recentScores = [
    ...data.recentExercises.map((a) => ({
      kind: a.kind,
      at: a.completedAt,
      score: a.score,
      total: a.total,
    })),
    ...data.recentWriting.map((s) => ({
      kind: "writing" as const,
      at: s.createdAt,
      scoreLabel: s.feedback?.scoreLabel ?? null,
    })),
    ...data.recentSpeaking.map((s) => ({
      kind: "speaking" as const,
      at: s.createdAt,
      scoreLabel: s.feedback?.scoreLabel ?? null,
    })),
    ...data.recentExams.map((a) => ({
      kind: "exam" as const,
      at: a.completedAt ?? a.startedAt,
      estimate: a.estimate,
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 5);

  return Response.json({
    goalTrack,
    streak: data.streak,
    dueWords: data.dueCount,
    activeMistakes: data.activeMistakes,
    isNewUser: data.isNewUser,
    inProgressExamId: data.inProgressExam?.examId ?? null,
    lastExamEstimate: data.lastExam?.estimate ?? null,
    recentScores,
  });
});
