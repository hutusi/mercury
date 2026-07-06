CREATE TABLE "mistake_clears" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"ref_id" text NOT NULL,
	"question_id" text NOT NULL,
	"cleared_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mistake_clears" ADD CONSTRAINT "mistake_clears_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "mistake_clears_user_question_idx" ON "mistake_clears" USING btree ("user_id","kind","ref_id","question_id");