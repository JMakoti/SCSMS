CREATE TABLE "academic_years" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"starts_on" text NOT NULL,
	"ends_on" text NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "terms" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"academic_year_id" varchar(36) NOT NULL,
	"name" text NOT NULL,
	"starts_on" text,
	"ends_on" text,
	"sequence" integer NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"school_id" varchar(36),
	"ward_id" varchar(36),
	"title_type" text NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"phone2" text,
	"email" text,
	"postal_address" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboard_snapshots" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"metrics_json" text NOT NULL,
	"generated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enrollment_grade_rows" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"snapshot_id" varchar(36) NOT NULL,
	"grade" text NOT NULL,
	"grade_band" text NOT NULL,
	"male" integer DEFAULT 0 NOT NULL,
	"female" integer DEFAULT 0 NOT NULL,
	"total" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enrollment_snapshots" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"school_id" varchar(36) NOT NULL,
	"academic_year_id" varchar(36) NOT NULL,
	"term_id" varchar(36),
	"status" text DEFAULT 'draft' NOT NULL,
	"captured_by" text,
	"captured_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"verified_at" timestamp,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "infrastructure_facility_rows" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"snapshot_id" varchar(36) NOT NULL,
	"facility_type" text NOT NULL,
	"available" integer DEFAULT 0 NOT NULL,
	"good" integer DEFAULT 0 NOT NULL,
	"needs_repair" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "infrastructure_projects" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"school_id" varchar(36) NOT NULL,
	"academic_year_id" varchar(36) NOT NULL,
	"project_name" text NOT NULL,
	"project_type" text NOT NULL,
	"project_contractor" text NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"project_conditions" text NOT NULL,
	"budget_amount" real,
	"funding_source" text,
	"starts_on" text,
	"completed_on" text,
	"description" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "infrastructure_snapshots" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"school_id" varchar(36) NOT NULL,
	"academic_year_id" varchar(36) NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"captured_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"verified_at" timestamp,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "performance_records" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"school_id" varchar(36) NOT NULL,
	"academic_year_id" varchar(36) NOT NULL,
	"term_id" varchar(36),
	"assessment_name" text NOT NULL,
	"assessment_type" text NOT NULL,
	"grade_band" text,
	"candidates" integer DEFAULT 0 NOT NULL,
	"average_score" real,
	"pass_rate" real,
	"ranking" integer,
	"status" text DEFAULT 'draft' NOT NULL,
	"captured_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "performance_subject_rows" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"performance_record_id" varchar(36) NOT NULL,
	"subject" text NOT NULL,
	"candidates" integer DEFAULT 0 NOT NULL,
	"average_score" real,
	"pass_rate" real
);
--> statement-breakpoint
CREATE TABLE "data_quality_checks" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"school_id" varchar(36),
	"check_key" text NOT NULL,
	"label" text NOT NULL,
	"status" text NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"details" text,
	"checked_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_runs" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"template_id" varchar(36) NOT NULL,
	"academic_year_id" varchar(36) NOT NULL,
	"term_id" varchar(36),
	"school_id" varchar(36),
	"generated_by_user_id" varchar(36),
	"status" text DEFAULT 'queued' NOT NULL,
	"format" text NOT NULL,
	"filters_json" text,
	"file_path" text,
	"records_included" integer DEFAULT 0 NOT NULL,
	"generated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"exported_at" timestamp,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "report_templates" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"frequency" text NOT NULL,
	"default_format" text DEFAULT 'pdf_xlsx' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schools" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"school_code" text NOT NULL,
	"uic_code" text NOT NULL,
	"nemis_code" text,
	"knec_code" text,
	"tsc_code" text,
	"registration_number" text,
	"official_name" text NOT NULL,
	"display_name" text NOT NULL,
	"institution_type" text NOT NULL,
	"level" text NOT NULL,
	"ownership_type" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"registration_status" text,
	"boarding_type" text,
	"gender_type" text,
	"title_deed" text,
	"latitude" real,
	"longitude" real,
	"ward_id" varchar(36) NOT NULL,
	"location" text,
	"address" text,
	"phone" text,
	"email" text,
	"sne" text,
	"opened_on" text,
	"completeness_score" integer DEFAULT 0 NOT NULL,
	"last_verified_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text,
	"value_type" text DEFAULT 'string' NOT NULL,
	"group" text DEFAULT 'general' NOT NULL,
	"description" text,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"staff_number" text,
	"tsc_no" text,
	"school_id" varchar(36) NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"gender" text,
	"staff_type" text NOT NULL,
	"designation" text NOT NULL,
	"employer" text NOT NULL,
	"employment_type" text NOT NULL,
	"phone" text,
	"email" text,
	"status" text DEFAULT 'active' NOT NULL,
	"hired_on" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"actor_user_id" varchar(36),
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" varchar(36),
	"before_json" text,
	"after_json" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "backups" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"file_path" text NOT NULL,
	"size_bytes" integer,
	"status" text DEFAULT 'created' NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "sync_queue" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"table_name" text NOT NULL,
	"record_id" varchar(36) NOT NULL,
	"operation" text NOT NULL,
	"payload_json" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"synced_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"permissions_json" text DEFAULT '[]' NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"role_id" varchar(36) NOT NULL,
	"subcounty_id" varchar(36),
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"password_hash" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subcounty" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"county" text,
	"county_code" text,
	"sub_county" text,
	"sub_county_code" text,
	"constituency" text,
	"constituency_code" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wards" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"ward_code" text NOT NULL,
	"ward_name" text NOT NULL,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "terms" ADD CONSTRAINT "terms_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_ward_id_wards_id_fk" FOREIGN KEY ("ward_id") REFERENCES "public"."wards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollment_grade_rows" ADD CONSTRAINT "enrollment_grade_rows_snapshot_id_enrollment_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."enrollment_snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollment_snapshots" ADD CONSTRAINT "enrollment_snapshots_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollment_snapshots" ADD CONSTRAINT "enrollment_snapshots_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollment_snapshots" ADD CONSTRAINT "enrollment_snapshots_term_id_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infrastructure_facility_rows" ADD CONSTRAINT "infrastructure_facility_rows_snapshot_id_infrastructure_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."infrastructure_snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infrastructure_projects" ADD CONSTRAINT "infrastructure_projects_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infrastructure_projects" ADD CONSTRAINT "infrastructure_projects_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infrastructure_snapshots" ADD CONSTRAINT "infrastructure_snapshots_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "infrastructure_snapshots" ADD CONSTRAINT "infrastructure_snapshots_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_records" ADD CONSTRAINT "performance_records_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_records" ADD CONSTRAINT "performance_records_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_records" ADD CONSTRAINT "performance_records_term_id_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_subject_rows" ADD CONSTRAINT "performance_subject_rows_performance_record_id_performance_records_id_fk" FOREIGN KEY ("performance_record_id") REFERENCES "public"."performance_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_quality_checks" ADD CONSTRAINT "data_quality_checks_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_runs" ADD CONSTRAINT "report_runs_template_id_report_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."report_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_runs" ADD CONSTRAINT "report_runs_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_runs" ADD CONSTRAINT "report_runs_term_id_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_runs" ADD CONSTRAINT "report_runs_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_runs" ADD CONSTRAINT "report_runs_generated_by_user_id_users_id_fk" FOREIGN KEY ("generated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schools" ADD CONSTRAINT "schools_ward_id_wards_id_fk" FOREIGN KEY ("ward_id") REFERENCES "public"."wards"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_subcounty_id_subcounty_id_fk" FOREIGN KEY ("subcounty_id") REFERENCES "public"."subcounty"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "academic_years_name_idx" ON "academic_years" USING btree ("name");--> statement-breakpoint
CREATE INDEX "academic_years_status_idx" ON "academic_years" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "terms_year_sequence_idx" ON "terms" USING btree ("academic_year_id","sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "terms_year_name_idx" ON "terms" USING btree ("academic_year_id","name");--> statement-breakpoint
CREATE INDEX "contacts_school_idx" ON "contacts" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "contacts_ward_idx" ON "contacts" USING btree ("ward_id");--> statement-breakpoint
CREATE INDEX "contacts_type_idx" ON "contacts" USING btree ("title_type");--> statement-breakpoint
CREATE UNIQUE INDEX "dashboard_snapshots_key_idx" ON "dashboard_snapshots" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "enrollment_snapshot_grade_idx" ON "enrollment_grade_rows" USING btree ("snapshot_id","grade");--> statement-breakpoint
CREATE UNIQUE INDEX "enrollment_school_year_term_idx" ON "enrollment_snapshots" USING btree ("school_id","academic_year_id","term_id");--> statement-breakpoint
CREATE INDEX "enrollment_year_idx" ON "enrollment_snapshots" USING btree ("academic_year_id");--> statement-breakpoint
CREATE INDEX "enrollment_status_idx" ON "enrollment_snapshots" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "infrastructure_snapshot_facility_idx" ON "infrastructure_facility_rows" USING btree ("snapshot_id","facility_type");--> statement-breakpoint
CREATE INDEX "infrastructure_projects_school_year_idx" ON "infrastructure_projects" USING btree ("school_id","academic_year_id");--> statement-breakpoint
CREATE INDEX "infrastructure_projects_status_idx" ON "infrastructure_projects" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "infrastructure_school_year_idx" ON "infrastructure_snapshots" USING btree ("school_id","academic_year_id");--> statement-breakpoint
CREATE INDEX "infrastructure_year_idx" ON "infrastructure_snapshots" USING btree ("academic_year_id");--> statement-breakpoint
CREATE INDEX "infrastructure_status_idx" ON "infrastructure_snapshots" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "performance_school_year_assessment_idx" ON "performance_records" USING btree ("school_id","academic_year_id","term_id","assessment_name");--> statement-breakpoint
CREATE INDEX "performance_year_idx" ON "performance_records" USING btree ("academic_year_id");--> statement-breakpoint
CREATE INDEX "performance_status_idx" ON "performance_records" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "performance_record_subject_idx" ON "performance_subject_rows" USING btree ("performance_record_id","subject");--> statement-breakpoint
CREATE INDEX "data_quality_school_idx" ON "data_quality_checks" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "data_quality_status_idx" ON "data_quality_checks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "data_quality_check_idx" ON "data_quality_checks" USING btree ("check_key");--> statement-breakpoint
CREATE INDEX "report_runs_template_year_idx" ON "report_runs" USING btree ("template_id","academic_year_id");--> statement-breakpoint
CREATE INDEX "report_runs_school_idx" ON "report_runs" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "report_runs_status_idx" ON "report_runs" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "report_templates_key_idx" ON "report_templates" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "report_templates_code_idx" ON "report_templates" USING btree ("code");--> statement-breakpoint
CREATE INDEX "report_templates_category_idx" ON "report_templates" USING btree ("category");--> statement-breakpoint
CREATE UNIQUE INDEX "schools_code_idx" ON "schools" USING btree ("school_code");--> statement-breakpoint
CREATE UNIQUE INDEX "schools_nemis_code_idx" ON "schools" USING btree ("nemis_code");--> statement-breakpoint
CREATE INDEX "schools_ward_idx" ON "schools" USING btree ("ward_id");--> statement-breakpoint
CREATE INDEX "schools_level_idx" ON "schools" USING btree ("level");--> statement-breakpoint
CREATE INDEX "schools_status_idx" ON "schools" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "settings_key_idx" ON "settings" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_number_idx" ON "staff" USING btree ("staff_number");--> statement-breakpoint
CREATE INDEX "staff_school_idx" ON "staff" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "staff_type_idx" ON "staff" USING btree ("staff_type");--> statement-breakpoint
CREATE INDEX "staff_status_idx" ON "staff" USING btree ("status");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "backups_status_idx" ON "backups" USING btree ("status");--> statement-breakpoint
CREATE INDEX "backups_created_at_idx" ON "backups" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sync_queue_status_idx" ON "sync_queue" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sync_queue_record_idx" ON "sync_queue" USING btree ("table_name","record_id");--> statement-breakpoint
CREATE UNIQUE INDEX "roles_name_idx" ON "roles" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "users_subcounty_idx" ON "users" USING btree ("subcounty_id");--> statement-breakpoint
CREATE INDEX "users_status_idx" ON "users" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "subcounty_code_idx" ON "subcounty" USING btree ("county_code");--> statement-breakpoint
CREATE INDEX "subcounty_name_idx" ON "subcounty" USING btree ("sub_county");--> statement-breakpoint
CREATE UNIQUE INDEX "wards_code_idx" ON "wards" USING btree ("ward_code");--> statement-breakpoint
CREATE INDEX "wards_name_idx" ON "wards" USING btree ("ward_name");