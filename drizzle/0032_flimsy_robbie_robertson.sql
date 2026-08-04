CREATE TABLE "premium_interest" (
	"user_id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "premium_interest" ADD CONSTRAINT "premium_interest_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;