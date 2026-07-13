CREATE TABLE "mistake_states" (
	"user_id" text NOT NULL,
	"track" text NOT NULL,
	"kind" text NOT NULL,
	"ref_id" text NOT NULL,
	"question_id" text NOT NULL,
	"wrong_count" integer NOT NULL,
	"last_wrong_at" timestamp with time zone NOT NULL,
	"cleared_at" timestamp with time zone,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "mistake_states_user_id_kind_ref_id_question_id_pk" PRIMARY KEY("user_id","kind","ref_id","question_id")
);
--> statement-breakpoint
ALTER TABLE "mistake_states" ADD CONSTRAINT "mistake_states_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mistake_states_user_track_idx" ON "mistake_states" USING btree ("user_id","track","last_wrong_at");--> statement-breakpoint
WITH "outcomes" AS (
	SELECT
		a."user_id",
		a."track",
		a."kind",
		a."ref_id",
		q.value->>'id' AS "question_id",
		a."completed_at" AS "occurred_at",
		coalesce((a."answers"->>(q.value->>'id'))::integer = (q.value->>'correctIndex')::integer, false) AS "correct"
	FROM "exercise_attempts" a
	JOIN "reading_exercises" e ON a."kind" = 'reading' AND e."id" = a."ref_id"
	CROSS JOIN LATERAL jsonb_array_elements(e."questions") q(value)
	WHERE a."answers" ? (q.value->>'id')

	UNION ALL

	SELECT
		a."user_id",
		a."track",
		a."kind",
		a."ref_id",
		q.value->>'id' AS "question_id",
		a."completed_at" AS "occurred_at",
		coalesce((a."answers"->>(q.value->>'id'))::integer = (q.value->>'correctIndex')::integer, false) AS "correct"
	FROM "exercise_attempts" a
	JOIN "listening_exercises" e ON a."kind" = 'listening' AND e."id" = a."ref_id"
	CROSS JOIN LATERAL jsonb_array_elements(e."questions") q(value)
	WHERE a."answers" ? (q.value->>'id')

	UNION ALL

	SELECT
		a."user_id",
		a."track",
		'vocab_quiz' AS "kind",
		a."ref_id",
		answer.key AS "question_id",
		a."completed_at" AS "occurred_at",
		answer.value = '1' AS "correct"
	FROM "exercise_attempts" a
	CROSS JOIN LATERAL jsonb_each_text(a."answers") answer(key, value)
	WHERE a."kind" = 'vocab_quiz'

	UNION ALL

	SELECT
		a."user_id",
		a."track",
		'exam' AS "kind",
		a."exam_id" AS "ref_id",
		q.value->>'id' AS "question_id",
		a."completed_at" AS "occurred_at",
		coalesce((a."answers"->>(q.value->>'id'))::integer = (q.value->>'correctIndex')::integer, false) AS "correct"
	FROM "mock_exam_attempts" a
	JOIN "mock_exams" e ON e."id" = a."exam_id"
	CROSS JOIN LATERAL jsonb_array_elements(e."sections") section(value)
	CROSS JOIN LATERAL jsonb_array_elements(section.value->'groups') grp(value)
	CROSS JOIN LATERAL jsonb_array_elements(grp.value->'questions') q(value)
	WHERE a."status" = 'completed' AND a."completed_at" IS NOT NULL
),
"attempt_rollup" AS (
	SELECT
		"user_id",
		"track",
		"kind",
		"ref_id",
		"question_id",
		count(*) FILTER (WHERE NOT "correct")::integer AS "wrong_count",
		max("occurred_at") FILTER (WHERE NOT "correct") AS "last_wrong_at",
		max("occurred_at") FILTER (WHERE "correct") AS "last_correct_at"
	FROM "outcomes"
	GROUP BY "user_id", "track", "kind", "ref_id", "question_id"
	HAVING count(*) FILTER (WHERE NOT "correct") > 0
),
"clear_rollup" AS (
	SELECT "user_id", "kind", "ref_id", "question_id", max("cleared_at") AS "cleared_at"
	FROM "mistake_clears"
	GROUP BY "user_id", "kind", "ref_id", "question_id"
)
INSERT INTO "mistake_states" (
	"user_id", "track", "kind", "ref_id", "question_id", "wrong_count", "last_wrong_at", "cleared_at", "updated_at"
)
SELECT
	a."user_id",
	a."track",
	a."kind",
	a."ref_id",
	a."question_id",
	a."wrong_count",
	a."last_wrong_at",
	greatest(a."last_correct_at", c."cleared_at"),
	now()
FROM "attempt_rollup" a
LEFT JOIN "clear_rollup" c
	ON c."user_id" = a."user_id"
	AND c."kind" = a."kind"
	AND c."ref_id" = a."ref_id"
	AND c."question_id" = a."question_id"
ON CONFLICT ("user_id", "kind", "ref_id", "question_id") DO UPDATE SET
	"track" = excluded."track",
	"wrong_count" = excluded."wrong_count",
	"last_wrong_at" = excluded."last_wrong_at",
	"cleared_at" = excluded."cleared_at",
	"updated_at" = excluded."updated_at";
