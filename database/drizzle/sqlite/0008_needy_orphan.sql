CREATE TABLE `performance_candidature_summaries` (
	`id` text PRIMARY KEY NOT NULL,
	`performance_record_id` text NOT NULL,
	`summary_json` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`performance_record_id`) REFERENCES `performance_records`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `performance_candidature_record_idx` ON `performance_candidature_summaries` (`performance_record_id`);