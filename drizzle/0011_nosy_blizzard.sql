CREATE TABLE "chat_states" (
	"user_id" text PRIMARY KEY NOT NULL,
	"day" text NOT NULL,
	"used_count" integer DEFAULT 0 NOT NULL,
	"next_sequence" integer DEFAULT 1 NOT NULL,
	"claim_id" text,
	"claim_started_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "sequence" integer;--> statement-breakpoint
WITH ranked AS (
	SELECT "id", row_number() OVER (
		PARTITION BY "user_id"
		ORDER BY "created_at", "id"
	)::integer AS "sequence"
	FROM "chat_messages"
)
UPDATE "chat_messages" message
SET "sequence" = ranked."sequence"
FROM ranked
WHERE ranked."id" = message."id";--> statement-breakpoint
ALTER TABLE "chat_messages" ALTER COLUMN "sequence" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_states" ADD CONSTRAINT "chat_states_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "chat_messages_user_sequence_idx" ON "chat_messages" USING btree ("user_id","sequence");--> statement-breakpoint
WITH latest_days AS (
	SELECT DISTINCT ON ("user_id") "user_id", "day"
	FROM "chat_messages"
	ORDER BY "user_id", "sequence" DESC
)
INSERT INTO "chat_states" ("user_id", "day", "used_count", "next_sequence")
SELECT
	latest."user_id",
	latest."day",
	count(*) FILTER (
		WHERE message."role" = 'user' AND message."day" = latest."day"
	)::integer,
	max(message."sequence") + 1
FROM latest_days latest
JOIN "chat_messages" message ON message."user_id" = latest."user_id"
GROUP BY latest."user_id", latest."day";
