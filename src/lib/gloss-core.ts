/**
 * Pure matching for "words you reviewed today" in a passage (dotted
 * underline, tap for the gloss). The learner just met these words on
 * flashcards; seeing them again in context is the point. DB-free and
 * unit-tested; the client component is components/reading/GlossedText.
 */

export interface GlossEntry {
  wordId: string;
  headword: string;
  translationZh: string;
  ipa: string;
  pos: string;
}

export type GlossSegment = string | { text: string; wordId: string };

const VOWELS = "aeiou";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Inflected forms of one word: plural/3sg, past, -ing (over-generating is harmless). */
function wordForms(word: string): string[] {
  const w = word.toLowerCase();
  const forms = new Set([w, `${w}s`, `${w}es`, `${w}ed`, `${w}ing`]);
  const last = w.at(-1) ?? "";
  const beforeLast = w.at(-2) ?? "";
  if (last === "e") {
    forms.add(`${w}d`);
    forms.add(`${w.slice(0, -1)}ing`);
  }
  if (last === "y" && beforeLast && !VOWELS.includes(beforeLast)) {
    forms.add(`${w.slice(0, -1)}ies`);
    forms.add(`${w.slice(0, -1)}ied`);
  }
  // Short consonant-vowel-consonant words double their final consonant
  // (plan → planned, planning); harmless when they don't.
  const cvc =
    w.length >= 3 &&
    !VOWELS.includes(last) &&
    !"wxy".includes(last) &&
    VOWELS.includes(beforeLast) &&
    !VOWELS.includes(w.at(-3) ?? "");
  if (cvc) {
    forms.add(`${w}${last}ed`);
    forms.add(`${w}${last}ing`);
  }
  return [...forms];
}

/**
 * Surface forms of a headword as word lists. Multi-word headwords inflect
 * either end: phrasal verbs on the first word ("circled back"), compound
 * nouns on the last ("action items"). Separated phrasal verbs ("follow it
 * up") are not matched.
 */
function headwordForms(headword: string): string[][] {
  const words = headword
    .trim()
    .split(/\s+/)
    .map((w) => w.toLowerCase());
  if (words.length === 1) return wordForms(words[0]).map((w) => [w]);
  const forms = new Map<string, string[]>();
  for (const first of wordForms(words[0])) {
    const form = [first, ...words.slice(1)];
    forms.set(form.join(" "), form);
  }
  for (const last of wordForms(words[words.length - 1])) {
    const form = [...words.slice(0, -1), last];
    forms.set(form.join(" "), form);
  }
  return [...forms.values()];
}

/** Regex alternatives for a headword; words may be separated by any whitespace. */
export function headwordVariants(headword: string): string[] {
  return headwordForms(headword).map((form) => form.map(escapeRegex).join("\\s+"));
}

export interface GlossPattern {
  regex: RegExp;
  /** Normalized matched text (lowercase, single spaces) → word id. */
  lookup: Map<string, string>;
}

/** One case-insensitive pattern for all entries, longest alternatives first. */
export function buildGlossPattern(entries: readonly GlossEntry[]): GlossPattern | null {
  if (entries.length === 0) return null;
  const lookup = new Map<string, string>();
  const alternatives: string[] = [];
  for (const entry of entries) {
    for (const form of headwordForms(entry.headword)) lookup.set(form.join(" "), entry.wordId);
    alternatives.push(...headwordVariants(entry.headword));
  }
  alternatives.sort((a, b) => b.length - a.length);
  // Unicode letter boundaries, so "plan" never matches inside "planet" and
  // "résumé" works.
  const regex = new RegExp(
    `(?<![\\p{L}\\p{M}'’-])(?:${alternatives.join("|")})(?![\\p{L}\\p{M}'’-])`,
    "giu",
  );
  return { regex, lookup };
}

/** Split text into plain strings and matched words. Joining the strings and matched texts gives back the input exactly. */
export function segmentGlossText(text: string, pattern: GlossPattern | null): GlossSegment[] {
  if (!pattern) return [text];
  const segments: GlossSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(pattern.regex)) {
    const index = match.index ?? 0;
    const wordId = pattern.lookup.get(match[0].toLowerCase().replace(/\s+/g, " "));
    if (!wordId) continue;
    if (index > last) segments.push(text.slice(last, index));
    segments.push({ text: match[0], wordId });
    last = index + match[0].length;
  }
  if (last < text.length) segments.push(text.slice(last));
  return segments;
}
