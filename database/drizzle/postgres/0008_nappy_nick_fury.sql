CREATE TABLE "performance_candidate_subjects" (
	"id" text PRIMARY KEY NOT NULL,
	"candidate_id" text NOT NULL,
	"subject_code" text NOT NULL,
	"subject_name" text NOT NULL,
	"status" text NOT NULL,
	"grade" text,
	"score" real
);
--> statement-breakpoint
CREATE TABLE "performance_candidates" (
	"id" text PRIMARY KEY NOT NULL,
	"performance_record_id" text NOT NULL,
	"examination_number" text NOT NULL,
	"candidate_name" text NOT NULL,
	"gender" text NOT NULL,
	"cohort" text,
	"status" text DEFAULT 'missing' NOT NULL,
	"overall_grade" text,
	"overall_score" real,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "performance_records" ADD COLUMN "examination_type" text;--> statement-breakpoint
ALTER TABLE "performance_records" ADD COLUMN "degree_threshold" text DEFAULT 'C+' NOT NULL;--> statement-breakpoint
ALTER TABLE "performance_candidate_subjects" ADD CONSTRAINT "performance_candidate_subjects_candidate_id_performance_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."performance_candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_candidates" ADD CONSTRAINT "performance_candidates_performance_record_id_performance_records_id_fk" FOREIGN KEY ("performance_record_id") REFERENCES "public"."performance_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "performance_candidate_subject_idx" ON "performance_candidate_subjects" USING btree ("candidate_id","subject_code");--> statement-breakpoint
CREATE INDEX "performance_subject_code_idx" ON "performance_candidate_subjects" USING btree ("subject_code","status");--> statement-breakpoint
CREATE UNIQUE INDEX "performance_candidate_number_idx" ON "performance_candidates" USING btree ("performance_record_id","examination_number");--> statement-breakpoint
CREATE INDEX "performance_candidate_scope_idx" ON "performance_candidates" USING btree ("performance_record_id","gender","status");--> statement-breakpoint
CREATE UNIQUE INDEX "performance_school_year_exam_idx" ON "performance_records" USING btree ("school_id","academic_year_id","examination_type");