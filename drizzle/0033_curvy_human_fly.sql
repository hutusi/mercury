CREATE TABLE "book_chat_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"book_id" text NOT NULL,
	"chapter_id" text NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"model" text,
	"day" text NOT NULL,
	"sequence" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "book_chat_messages_role_check" CHECK ("book_chat_messages"."role" in ('user', 'assistant')),
	CONSTRAINT "book_chat_messages_day_check" CHECK ("book_chat_messages"."day" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
	CONSTRAINT "book_chat_messages_sequence_check" CHECK ("book_chat_messages"."sequence" >= 1),
	CONSTRAINT "book_chat_messages_model_check" CHECK (("book_chat_messages"."role" = 'user' and "book_chat_messages"."model" is null) or "book_chat_messages"."role" = 'assistant')
);
--> statement-breakpoint
CREATE TABLE "book_chat_states" (
	"user_id" text NOT NULL,
	"book_id" text NOT NULL,
	"day" text NOT NULL,
	"used_count" integer DEFAULT 0 NOT NULL,
	"next_sequence" integer DEFAULT 1 NOT NULL,
	"claim_id" text,
	"claim_started_at" timestamp with time zone,
	CONSTRAINT "book_chat_states_user_id_book_id_pk" PRIMARY KEY("user_id","book_id"),
	CONSTRAINT "book_chat_states_day_check" CHECK ("book_chat_states"."day" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
	CONSTRAINT "book_chat_states_counts_check" CHECK ("book_chat_states"."used_count" >= 0 and "book_chat_states"."next_sequence" >= 1),
	CONSTRAINT "book_chat_states_claim_check" CHECK (("book_chat_states"."claim_id" is null and "book_chat_states"."claim_started_at" is null) or ("book_chat_states"."claim_id" is not null and "book_chat_states"."claim_started_at" is not null))
);
--> statement-breakpoint
ALTER TABLE "book_chat_messages" ADD CONSTRAINT "book_chat_messages_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_chat_messages" ADD CONSTRAINT "book_chat_messages_book_chapter_fk" FOREIGN KEY ("book_id","chapter_id") REFERENCES "public"."book_chapters"("book_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_chat_states" ADD CONSTRAINT "book_chat_states_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_chat_states" ADD CONSTRAINT "book_chat_states_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "book_chat_messages_user_book_sequence_idx" ON "book_chat_messages" USING btree ("user_id","book_id","sequence");--> statement-breakpoint
CREATE INDEX "book_chat_messages_chapter_idx" ON "book_chat_messages" USING btree ("book_id","chapter_id");--> statement-breakpoint
CREATE INDEX "book_chat_states_book_idx" ON "book_chat_states" USING btree ("book_id");