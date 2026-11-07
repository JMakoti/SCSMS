CREATE TABLE "performance_candidature_summaries" (
	"id" text PRIMARY KEY NOT NULL,
	"performance_record_id" text NOT NULL,
	"summary_json" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "performance_candidature_summaries" ADD CONSTRAINT "performance_candidature_summaries_performance_record_id_performance_records_id_fk" FOREIGN KEY ("performance_record_id") REFERENCES "public"."performance_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "performance_candidature_record_idx" ON "performance_candidature_summaries" USING btree ("performance_record_id");