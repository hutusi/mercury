CREATE TABLE "daily_plans" (
	"user_id" text NOT NULL,
	"day" text NOT NULL,
	"items" jsonb NOT NULL,
	"daily_minutes" integer NOT NULL,
	"skipped_keys" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"stale" boolean DEFAULT false NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "daily_plans_user_id_day_pk" PRIMARY KEY("user_id","day"),
	CONSTRAINT "daily_plans_day_check" CHECK ("daily_plans"."day" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
	CONSTRAINT "daily_plans_items_check" CHECK (jsonb_typeof("daily_plans"."items") = 'array' and jsonb_array_length("daily_plans"."items") <= 6),
	CONSTRAINT "daily_plans_skipped_check" CHECK (jsonb_typeof("daily_plans"."skipped_keys") = 'array'),
	CONSTRAINT "daily_plans_minutes_check" CHECK ("daily_plans"."daily_minutes" between 5 and 180),
	CONSTRAINT "daily_plans_revision_check" CHECK ("daily_plans"."revision" >= 1)
);
--> statement-breakpoint
ALTER TABLE "daily_plans" ADD CONSTRAINT "daily_plans_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;