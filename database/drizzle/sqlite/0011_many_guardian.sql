ALTER TABLE `subcounty` ADD `knec_code` text;--> statement-breakpoint
ALTER TABLE `users` ADD `username` text;--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_idx` ON `users` (`username`);