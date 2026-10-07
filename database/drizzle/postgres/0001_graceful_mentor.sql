CREATE TABLE "school_subject_combinations" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"school_id" varchar(36) NOT NULL,
	"academic_year_id" varchar(36) NOT NULL,
	"code" text NOT NULL,
	"combination" text NOT NULL,
	"pathway" text NOT NULL,
	"track" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "school_subject_combinations" ADD CONSTRAINT "school_subject_combinations_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_subject_combinations" ADD CONSTRAINT "school_subject_combinations_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "subject_combinations_school_year_idx" ON "school_subject_combinations" USING btree ("school_id","academic_year_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subject_combinations_school_code_idx" ON "school_subject_combinations" USING btree ("school_id","code");