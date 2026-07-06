/**
 * Vocab quiz question generation, shared by the quiz page and the mistakes
 * notebook (which regenerates a fresh question per wrong word — original
 * distractors are never persisted). DB-free and rng-injectable for tests.
 */

export interface QuizWordInput {
  id: string;
  headword: string;
  translationZh: string;
}

export interface QuizQuestion {
  wordId: string;
  direction: "en2zh" | "zh2en";
  prompt: string;
  options: { wordId: string; text: string }[];
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
): QuizQuestion {
  const distractors = shuffle(
    pool.filter((w) => w.id !== word.id),
    rng,
  ).slice(0, 3);
  const options = shuffle(
    [word, ...distractors].map((w) => ({
      wordId: w.id,
      text: direction === "en2zh" ? w.translationZh : w.headword,
    })),
    rng,
  );
  return {
    wordId: word.id,
    direction,
    prompt: direction === "en2zh" ? word.headword : word.translationZh,
    options,
  };
}
