/**
 * Vocab quiz generation and serialization. Stored questions keep stable,
 * opaque option ids plus the hidden word ids needed for grading; the public
 * shape deliberately contains no value that identifies the correct option.
 */

export interface QuizWordInput {
  id: string;
  headword: string;
  translationZh: string;
}

export interface StoredQuizQuestion {
  id: string;
  wordId: string;
  direction: "en2zh" | "zh2en";
  prompt: string;
  options: { id: string; wordId: string; text: string }[];
}

export interface QuizQuestion {
  id: string;
  direction: "en2zh" | "zh2en";
  prompt: string;
  options: { id: string; text: string }[];
}

export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * One correct option + 3 distractors drawn from `pool` (the word itself is
 * excluded if present). Caller guarantees the pool holds ≥3 other words.
 */
export function buildQuizQuestion(
  word: QuizWordInput,
  pool: QuizWordInput[],
  direction: "en2zh" | "zh2en",
  rng: () => number = Math.random,
  idFactory: () => string = () => crypto.randomUUID(),
): StoredQuizQuestion {
  const distractors = shuffle(
    pool.filter((w) => w.id !== word.id),
    rng,
  ).slice(0, 3);
  const options = shuffle(
    [word, ...distractors].map((w) => ({
      id: idFactory(),
      wordId: w.id,
      text: direction === "en2zh" ? w.translationZh : w.headword,
    })),
    rng,
  );
  return {
    id: idFactory(),
    wordId: word.id,
    direction,
    prompt: direction === "en2zh" ? word.headword : word.translationZh,
    options,
  };
}

/** Only this shape may cross the quiz-session interface before grading. */
export function sanitizeQuizQuestion(question: StoredQuizQuestion): QuizQuestion {
  return {
    id: question.id,
    direction: question.direction,
    prompt: question.prompt,
    options: question.options.map(({ id, text }) => ({ id, text })),
  };
}

export function gradeQuizAnswer(
  question: StoredQuizQuestion,
  optionId: string,
): { correct: boolean; correctOptionId: string } | null {
  const chosen = question.options.find((option) => option.id === optionId);
  const correct = question.options.find((option) => option.wordId === question.wordId);
  if (!chosen || !correct) return null;
  return { correct: chosen.wordId === question.wordId, correctOptionId: correct.id };
}
