DROP INDEX `subcounty_code_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `subcounty_code_idx` ON `subcounty` (`sub_county_code`);