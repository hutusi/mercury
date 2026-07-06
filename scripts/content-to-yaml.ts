import fs from "node:fs";
import path from "node:path";
import { Document, Scalar, visit, YAMLMap, YAMLSeq } from "yaml";
import { z } from "zod";
import { ieltsMiniExam } from "../src/content/exams/ielts-mini";
import { toeicMiniExam } from "../src/content/exams/toeic-mini";
import { businessListening } from "../src/content/listening/business";
import { ieltsListening } from "../src/content/listening/ielts";
import { toeicListening } from "../src/content/listening/toeic";
import { businessReading } from "../src/content/reading/business";
import { ieltsReading } from "../src/content/reading/ielts";
import { toeicReading } from "../src/content/reading/toeic";
import { businessSpeaking } from "../src/content/speaking/business";
import { ieltsSpeaking } from "../src/content/speaking/ielts";
import { toeicSpeaking } from "../src/content/speaking/toeic";
import {
  ListeningExerciseSchema,
  MockExamSchema,
  ReadingExerciseSchema,
  SpeakingPromptSchema,
  VocabWordSchema,
  WritingPromptSchema,
} from "../src/content/types";
import { businessVocab } from "../src/content/vocab/business";
import { ieltsVocab } from "../src/content/vocab/ielts";
import { toeicVocab } from "../src/content/vocab/toeic";
import { businessWriting } from "../src/content/writing/business";
import { ieltsWriting } from "../src/content/writing/ielts";
import { toeicWriting } from "../src/content/writing/toeic";

/**
 * One-off converter: serializes the inline TS content to content/**.yaml.
 * Deleted together with the TS data files once the round-trip test
 * (src/content/roundtrip.test.ts) proves the YAML is lossless.
 */

/** Re-key objects recursively to the zod schema's declared shape order, so all
 *  files share one canonical key order regardless of how the TS literal was written. */
function ordered(value: unknown, schema: z.ZodType): unknown {
  if (schema instanceof z.ZodOptional) return ordered(value, schema.unwrap() as z.ZodType);
  if (schema instanceof z.ZodArray && Array.isArray(value)) {
    return value.map((v) => ordered(v, schema.element as z.ZodType));
  }
  if (schema instanceof z.ZodObject && value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(schema.shape)) {
      if (key in record) out[key] = ordered(record[key], schema.shape[key] as z.ZodType);
    }
    return out;
  }
  return value;
}

// Topic dividers from the vocab TS files, re-emitted as YAML comments.
const TOPIC_LABELS: Record<string, string> = {
  office: "办公",
  finance: "财务",
  travel: "差旅",
  contracts: "合同",
  hr: "人事",
  environment: "环境",
  education: "教育",
  technology: "科技",
  society: "社会",
  research: "学术研究",
  meetings: "会议",
  negotiation: "谈判",
  email: "邮件",
  presentations: "演示汇报",
  strategy: "战略运营",
};

function addTopicComments(doc: Document, items: { topic: string }[]): void {
  const seq = doc.contents;
  if (!(seq instanceof YAMLSeq)) throw new Error("expected a sequence document");
  let prevTopic: string | undefined;
  seq.items.forEach((node, i) => {
    const topic = items[i].topic;
    if (topic !== prevTopic) {
      if (!(node instanceof YAMLMap)) throw new Error("expected a map item");
      const label = TOPIC_LABELS[topic];
      if (!label) throw new Error(`no label for topic ${topic}`);
      node.commentBefore = ` ${topic} (${label})`;
      prevTopic = topic;
    }
  });
}

function toYaml(data: unknown, schemaRef: string, vocabItems?: { topic: string }[]): string {
  const doc = new Document(data);
  visit(doc, {
    Scalar(_key, node) {
      // Multi-paragraph prose reads best as literal blocks (|-). The library
      // falls back to a quoted style for values a block can't represent
      // (e.g. trailing spaces) — the round-trip test is the referee.
      if (typeof node.value === "string" && node.value.includes("\n")) {
        node.type = Scalar.BLOCK_LITERAL;
      }
    },
  });
  if (vocabItems) addTopicComments(doc, vocabItems);
  // lineWidth 0 disables folding so long prose stays on one line: diffs stay
  // one-edit-per-change and prettier (proseWrap: preserve) leaves them alone.
  return `# yaml-language-server: $schema=${schemaRef}\n${doc.toString({ lineWidth: 0 })}`;
}

type Job = {
  out: string;
  data: unknown;
  schema: z.ZodType;
  ref: string;
  vocabItems?: { topic: string }[];
};

const collection = (s: z.ZodType) => z.array(s);
const jobs: Job[] = [
  ...(
    [
      ["toeic", toeicVocab],
      ["ielts", ieltsVocab],
      ["business", businessVocab],
    ] as const
  ).map(([track, data]) => ({
    out: `content/vocab/${track}.yaml`,
    data,
    schema: collection(VocabWordSchema),
    ref: "../.schemas/vocab.schema.json",
    vocabItems: data,
  })),
  ...(
    [
      ["toeic", toeicReading],
      ["ielts", ieltsReading],
      ["business", businessReading],
    ] as const
  ).map(([track, data]) => ({
    out: `content/reading/${track}.yaml`,
    data,
    schema: collection(ReadingExerciseSchema),
    ref: "../.schemas/reading.schema.json",
  })),
  ...(
    [
      ["toeic", toeicListening],
      ["ielts", ieltsListening],
      ["business", businessListening],
    ] as const
  ).map(([track, data]) => ({
    out: `content/listening/${track}.yaml`,
    data,
    schema: collection(ListeningExerciseSchema),
    ref: "../.schemas/listening.schema.json",
  })),
  ...(
    [
      ["toeic", toeicWriting],
      ["ielts", ieltsWriting],
      ["business", businessWriting],
    ] as const
  ).map(([track, data]) => ({
    out: `content/writing/${track}.yaml`,
    data,
    schema: collection(WritingPromptSchema),
    ref: "../.schemas/writing.schema.json",
  })),
  ...(
    [
      ["toeic", toeicSpeaking],
      ["ielts", ieltsSpeaking],
      ["business", businessSpeaking],
    ] as const
  ).map(([track, data]) => ({
    out: `content/speaking/${track}.yaml`,
    data,
    schema: collection(SpeakingPromptSchema),
    ref: "../.schemas/speaking.schema.json",
  })),
  { out: "content/exams/toeic-mini.yaml", data: toeicMiniExam, schema: MockExamSchema, ref: "../.schemas/exam.schema.json" },
  { out: "content/exams/ielts-mini.yaml", data: ieltsMiniExam, schema: MockExamSchema, ref: "../.schemas/exam.schema.json" },
];

for (const job of jobs) {
  const canonical = ordered(job.data, job.schema);
  const file = path.join(process.cwd(), job.out);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, toYaml(canonical, job.ref, job.vocabItems));
  console.log(`wrote ${job.out}`);
}
