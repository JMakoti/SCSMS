ALTER TABLE `schools` ADD `location_accuracy` real;--> statement-breakpoint
ALTER TABLE `schools` ADD `location_source` text;--> statement-breakpoint
ALTER TABLE `schools` ADD `location_verified` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `schools` ADD `location_verified_at` text;--> statement-breakpoint
ALTER TABLE `schools` ADD `location_verified_by` text;--> statement-breakpoint
ALTER TABLE `subcounty` ADD `boundary_geojson` text;--> statement-breakpoint
ALTER TABLE `wards` ADD `boundary_geojson` text;