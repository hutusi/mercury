CREATE TABLE "memberships" (
	"user_id" text PRIMARY KEY NOT NULL,
	"tier" text NOT NULL,
	"expires_at" timestamp with time zone,
	"granted_by" text,
	"source" text DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "memberships_tier_check" CHECK ("memberships"."tier" in ('premium')),
	CONSTRAINT "memberships_source_check" CHECK ("memberships"."source" in ('manual'))
);
--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_granted_by_user_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;