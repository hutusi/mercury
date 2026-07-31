ALTER TABLE "books" ADD COLUMN "sort_order" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_sort_order_check" CHECK ("books"."sort_order" >= 1);