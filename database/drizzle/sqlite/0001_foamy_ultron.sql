CREATE TABLE `school_subject_combinations` (
	`id` text PRIMARY KEY NOT NULL,
	`school_id` text NOT NULL,
	`academic_year_id` text NOT NULL,
	`code` text NOT NULL,
	`combination` text NOT NULL,
	`pathway` text NOT NULL,
	`track` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`school_id`) REFERENCES `schools`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `subject_combinations_school_year_idx` ON `school_subject_combinations` (`school_id`,`academic_year_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `subject_combinations_school_code_idx` ON `school_subject_combinations` (`school_id`,`code`);