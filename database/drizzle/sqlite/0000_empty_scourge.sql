CREATE TABLE `academic_years` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`starts_on` text NOT NULL,
	`ends_on` text NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`is_current` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `academic_years_name_idx` ON `academic_years` (`name`);--> statement-breakpoint
CREATE INDEX `academic_years_status_idx` ON `academic_years` (`status`);--> statement-breakpoint
CREATE TABLE `terms` (
	`id` text PRIMARY KEY NOT NULL,
	`academic_year_id` text NOT NULL,
	`name` text NOT NULL,
	`starts_on` text,
	`ends_on` text,
	`sequence` integer NOT NULL,
	`is_current` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `terms_year_sequence_idx` ON `terms` (`academic_year_id`,`sequence`);--> statement-breakpoint
CREATE UNIQUE INDEX `terms_year_name_idx` ON `terms` (`academic_year_id`,`name`);--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text,
	`ward_id` text,
	`title_type` text NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`phone2` text,
	`email` text,
	`postal_address` text,
	`is_primary` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ward_id`) REFERENCES `wards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `contacts_school_idx` ON `contacts` (`school_id`);--> statement-breakpoint
CREATE INDEX `contacts_ward_idx` ON `contacts` (`ward_id`);--> statement-breakpoint
CREATE INDEX `contacts_type_idx` ON `contacts` (`title_type`);--> statement-breakpoint
CREATE TABLE `dashboard_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`metrics_json` text NOT NULL,
	`generated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dashboard_snapshots_key_idx` ON `dashboard_snapshots` (`key`);--> statement-breakpoint
CREATE TABLE `enrollment_grade_rows` (
	`id` text PRIMARY KEY NOT NULL,
	`snapshot_id` text NOT NULL,
	`grade` text NOT NULL,
	`grade_band` text NOT NULL,
	`male` integer DEFAULT 0 NOT NULL,
	`female` integer DEFAULT 0 NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`snapshot_id`) REFERENCES `enrollment_snapshots`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `enrollment_snapshot_grade_idx` ON `enrollment_grade_rows` (`snapshot_id`,`grade`);--> statement-breakpoint
CREATE TABLE `enrollment_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`academic_year_id` text NOT NULL,
	`term_id` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`captured_by` text,
	`captured_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`verified_at` text,
	`notes` text,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`term_id`) REFERENCES `terms`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `enrollment_school_year_term_idx` ON `enrollment_snapshots` (`school_id`,`academic_year_id`,`term_id`);--> statement-breakpoint
CREATE INDEX `enrollment_year_idx` ON `enrollment_snapshots` (`academic_year_id`);--> statement-breakpoint
CREATE INDEX `enrollment_status_idx` ON `enrollment_snapshots` (`status`);--> statement-breakpoint
CREATE TABLE `infrastructure_facility_rows` (
	`id` text PRIMARY KEY NOT NULL,
	`snapshot_id` text NOT NULL,
	`facility_type` text NOT NULL,
	`available` integer DEFAULT 0 NOT NULL,
	`good` integer DEFAULT 0 NOT NULL,
	`needs_repair` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`notes` text,
	FOREIGN KEY (`snapshot_id`) REFERENCES `infrastructure_snapshots`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `infrastructure_snapshot_facility_idx` ON `infrastructure_facility_rows` (`snapshot_id`,`facility_type`);--> statement-breakpoint
CREATE TABLE `infrastructure_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`academic_year_id` text NOT NULL,
	`project_name` text NOT NULL,
	`project_type` text NOT NULL,
	`project_contractor` text NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`project_conditions` text NOT NULL,
	`budget_amount` real,
	`funding_source` text,
	`starts_on` text,
	`completed_on` text,
	`description` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `infrastructure_projects_school_year_idx` ON `infrastructure_projects` (`school_id`,`academic_year_id`);--> statement-breakpoint
CREATE INDEX `infrastructure_projects_status_idx` ON `infrastructure_projects` (`status`);--> statement-breakpoint
CREATE TABLE `infrastructure_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`academic_year_id` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`captured_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`verified_at` text,
	`notes` text,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `infrastructure_school_year_idx` ON `infrastructure_snapshots` (`school_id`,`academic_year_id`);--> statement-breakpoint
CREATE INDEX `infrastructure_year_idx` ON `infrastructure_snapshots` (`academic_year_id`);--> statement-breakpoint
CREATE INDEX `infrastructure_status_idx` ON `infrastructure_snapshots` (`status`);--> statement-breakpoint
CREATE TABLE `performance_records` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`academic_year_id` text NOT NULL,
	`term_id` text,
	`assessment_name` text NOT NULL,
	`assessment_type` text NOT NULL,
	`grade_band` text,
	`candidates` integer DEFAULT 0 NOT NULL,
	`average_score` real,
	`pass_rate` real,
	`ranking` integer,
	`status` text DEFAULT 'draft' NOT NULL,
	`captured_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`notes` text,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`term_id`) REFERENCES `terms`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `performance_school_year_assessment_idx` ON `performance_records` (`school_id`,`academic_year_id`,`term_id`,`assessment_name`);--> statement-breakpoint
CREATE INDEX `performance_year_idx` ON `performance_records` (`academic_year_id`);--> statement-breakpoint
CREATE INDEX `performance_status_idx` ON `performance_records` (`status`);--> statement-breakpoint
CREATE TABLE `performance_subject_rows` (
	`id` text PRIMARY KEY NOT NULL,
	`performance_record_id` text NOT NULL,
	`subject` text NOT NULL,
	`candidates` integer DEFAULT 0 NOT NULL,
	`average_score` real,
	`pass_rate` real,
	FOREIGN KEY (`performance_record_id`) REFERENCES `performance_records`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `performance_record_subject_idx` ON `performance_subject_rows` (`performance_record_id`,`subject`);--> statement-breakpoint
CREATE TABLE `data_quality_checks` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text,
	`check_key` text NOT NULL,
	`label` text NOT NULL,
	`status` text NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`details` text,
	`checked_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `data_quality_school_idx` ON `data_quality_checks` (`school_id`);--> statement-breakpoint
CREATE INDEX `data_quality_status_idx` ON `data_quality_checks` (`status`);--> statement-breakpoint
CREATE INDEX `data_quality_check_idx` ON `data_quality_checks` (`check_key`);--> statement-breakpoint
CREATE TABLE `report_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`template_id` text NOT NULL,
	`academic_year_id` text NOT NULL,
	`term_id` text,
	`school_id` text,
	`generated_by_user_id` text,
	`status` text DEFAULT 'queued' NOT NULL,
	`format` text NOT NULL,
	`filters_json` text,
	`file_path` text,
	`records_included` integer DEFAULT 0 NOT NULL,
	`generated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`exported_at` text,
	`notes` text,
	FOREIGN KEY (`template_id`) REFERENCES `report_templates`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`term_id`) REFERENCES `terms`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`generated_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `report_runs_template_year_idx` ON `report_runs` (`template_id`,`academic_year_id`);--> statement-breakpoint
CREATE INDEX `report_runs_school_idx` ON `report_runs` (`school_id`);--> statement-breakpoint
CREATE INDEX `report_runs_status_idx` ON `report_runs` (`status`);--> statement-breakpoint
CREATE TABLE `report_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`code` text NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`description` text,
	`frequency` text NOT NULL,
	`default_format` text DEFAULT 'pdf_xlsx' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `report_templates_key_idx` ON `report_templates` (`key`);--> statement-breakpoint
CREATE UNIQUE INDEX `report_templates_code_idx` ON `report_templates` (`code`);--> statement-breakpoint
CREATE INDEX `report_templates_category_idx` ON `report_templates` (`category`);--> statement-breakpoint
CREATE TABLE `schools` (
	`id` text PRIMARY KEY NOT NULL,
	`school_code` text NOT NULL,
	`uic_code` text NOT NULL,
	`nemis_code` text,
	`knec_code` text,
	`tsc_code` text,
	`logo_path` text,
	`registration_number` text,
	`official_name` text NOT NULL,
	`display_name` text NOT NULL,
	`institution_type` text NOT NULL,
	`level` text NOT NULL,
	`ownership_type` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`registration_status` text,
	`boarding_type` text,
	`gender_type` text,
	`title_deed` text,
	`latitude` real,
	`longitude` real,
	`ward_id` text NOT NULL,
	`location` text,
	`address` text,
	`phone` text,
	`email` text,
	`sne` text,
	`opened_on` text,
	`completeness_score` integer DEFAULT 0 NOT NULL,
	`last_verified_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`ward_id`) REFERENCES `wards`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `schools_code_idx` ON `schools` (`school_code`);--> statement-breakpoint
CREATE UNIQUE INDEX `schools_nemis_code_idx` ON `schools` (`nemis_code`);--> statement-breakpoint
CREATE INDEX `schools_ward_idx` ON `schools` (`ward_id`);--> statement-breakpoint
CREATE INDEX `schools_level_idx` ON `schools` (`level`);--> statement-breakpoint
CREATE INDEX `schools_status_idx` ON `schools` (`status`);--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`value` text,
	`value_type` text DEFAULT 'string' NOT NULL,
	`group` text DEFAULT 'general' NOT NULL,
	`description` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `settings_key_idx` ON `settings` (`key`);--> statement-breakpoint
CREATE TABLE `staff` (
	`id` text PRIMARY KEY NOT NULL,
	`staff_number` text,
	`tsc_no` text,
	`school_id` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`gender` text,
	`staff_type` text NOT NULL,
	`designation` text NOT NULL,
	`employer` text NOT NULL,
	`employment_type` text NOT NULL,
	`phone` text,
	`email` text,
	`status` text DEFAULT 'active' NOT NULL,
	`hired_on` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `staff_number_idx` ON `staff` (`staff_number`);--> statement-breakpoint
CREATE INDEX `staff_school_idx` ON `staff` (`school_id`);--> statement-breakpoint
CREATE INDEX `staff_type_idx` ON `staff` (`staff_type`);--> statement-breakpoint
CREATE INDEX `staff_status_idx` ON `staff` (`status`);--> statement-breakpoint
CREATE TABLE `subcounty` (
	`id` text PRIMARY KEY NOT NULL,
	`county` text,
	`county_code` text,
	`sub_county` text,
	`sub_county_code` text,
	`constituency` text,
	`constituency_code` text,
	`notes` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subcounty_code_idx` ON `subcounty` (`county_code`);--> statement-breakpoint
CREATE INDEX `subcounty_name_idx` ON `subcounty` (`sub_county`);--> statement-breakpoint
CREATE TABLE `wards` (
	`id` text PRIMARY KEY NOT NULL,
	`ward_code` text NOT NULL,
	`ward_name` text NOT NULL,
	`notes` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wards_code_idx` ON `wards` (`ward_code`);--> statement-breakpoint
CREATE INDEX `wards_name_idx` ON `wards` (`ward_name`);--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_user_id` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`before_json` text,
	`after_json` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_logs_entity_idx` ON `audit_logs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_actor_idx` ON `audit_logs` (`actor_user_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_created_at_idx` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE TABLE `backups` (
	`id` text PRIMARY KEY NOT NULL,
	`file_path` text NOT NULL,
	`size_bytes` integer,
	`status` text DEFAULT 'created' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`notes` text
);
--> statement-breakpoint
CREATE INDEX `backups_status_idx` ON `backups` (`status`);--> statement-breakpoint
CREATE INDEX `backups_created_at_idx` ON `backups` (`created_at`);--> statement-breakpoint
CREATE TABLE `sync_queue` (
	`id` text PRIMARY KEY NOT NULL,
	`table_name` text NOT NULL,
	`record_id` text NOT NULL,
	`operation` text NOT NULL,
	`payload_json` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`synced_at` text
);
--> statement-breakpoint
CREATE INDEX `sync_queue_status_idx` ON `sync_queue` (`status`);--> statement-breakpoint
CREATE INDEX `sync_queue_record_idx` ON `sync_queue` (`table_name`,`record_id`);--> statement-breakpoint
CREATE TABLE `roles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`permissions_json` text DEFAULT '[]' NOT NULL,
	`is_system` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `roles_name_idx` ON `roles` (`name`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`role_id` text NOT NULL,
	`subcounty_id` text,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`password_hash` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`last_login_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`subcounty_id`) REFERENCES `subcounty`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_role_idx` ON `users` (`role_id`);--> statement-breakpoint
CREATE INDEX `users_subcounty_idx` ON `users` (`subcounty_id`);--> statement-breakpoint
CREATE INDEX `users_status_idx` ON `users` (`status`);