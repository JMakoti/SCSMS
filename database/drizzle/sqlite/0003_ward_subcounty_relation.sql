ALTER TABLE `wards` ADD `sub_county_id` text;--> statement-breakpoint
INSERT OR IGNORE INTO `subcounty` (
	`id`,
	`county`,
	`county_code`,
	`sub_county`,
	`sub_county_code`,
	`constituency`,
	`constituency_code`,
	`is_active`
)
SELECT
	lower(hex(randomblob(16))),
	w.`county`,
	NULL,
	w.`sub_county`,
	w.`sub_county_code`,
	w.`constituency`,
	w.`constituency_code`,
	1
FROM `wards` w
WHERE trim(COALESCE(w.`sub_county`, '')) != ''
  AND NOT EXISTS (
	SELECT 1
	FROM `subcounty` s
	WHERE lower(trim(s.`sub_county`)) = lower(trim(w.`sub_county`))
	  AND (s.`county` IS w.`county` OR s.`county` IS NULL OR w.`county` IS NULL)
  )
GROUP BY
	w.`county`,
	w.`sub_county`,
	w.`sub_county_code`,
	w.`constituency`,
	w.`constituency_code`;--> statement-breakpoint
INSERT OR IGNORE INTO `subcounty` (
	`id`,
	`sub_county`,
	`notes`,
	`is_active`
)
SELECT
	'00000000-0000-4000-8000-000000000003',
	'Unassigned (legacy ward)',
	'Temporary parent for a ward whose previous sub-county was not recorded.',
	0
WHERE EXISTS (
	SELECT 1
	FROM `wards` w
	WHERE NOT EXISTS (
		SELECT 1
		FROM `subcounty` s
		WHERE lower(trim(s.`sub_county`)) = lower(trim(w.`sub_county`))
		  AND trim(COALESCE(w.`sub_county`, '')) != ''
		  AND (s.`county` IS w.`county` OR s.`county` IS NULL OR w.`county` IS NULL)
	)
);--> statement-breakpoint
UPDATE `wards` AS w
SET `sub_county_id` = (
	COALESCE(
		(
			SELECT s.`id`
			FROM `subcounty` s
			WHERE lower(trim(s.`sub_county`)) = lower(trim(w.`sub_county`))
			  AND trim(COALESCE(w.`sub_county`, '')) != ''
			  AND s.`county` IS w.`county`
			LIMIT 1
		),
		(
			SELECT s.`id`
			FROM `subcounty` s
			WHERE lower(trim(s.`sub_county`)) = lower(trim(w.`sub_county`))
			  AND trim(COALESCE(w.`sub_county`, '')) != ''
			  AND (s.`county` IS NULL OR w.`county` IS NULL)
			LIMIT 1
		)
	)
)
WHERE w.`sub_county_id` IS NULL;--> statement-breakpoint
UPDATE `wards`
SET `sub_county_id` = '00000000-0000-4000-8000-000000000003'
WHERE `sub_county_id` IS NULL;--> statement-breakpoint
CREATE TABLE `wards_v4` (
	`id` text PRIMARY KEY NOT NULL,
	`sub_county_id` text NOT NULL,
	`ward_code` text NOT NULL,
	`ward_name` text NOT NULL,
	`notes` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`sub_county_id`) REFERENCES `subcounty`(`id`) ON UPDATE cascade ON DELETE restrict
);--> statement-breakpoint
INSERT INTO `wards_v4` (
	`id`,
	`sub_county_id`,
	`ward_code`,
	`ward_name`,
	`notes`,
	`is_active`,
	`created_at`,
	`updated_at`
)
SELECT
	`id`,
	`sub_county_id`,
	`ward_code`,
	`ward_name`,
	`notes`,
	`is_active`,
	`created_at`,
	`updated_at`
FROM `wards`;--> statement-breakpoint
DROP TABLE `wards`;--> statement-breakpoint
ALTER TABLE `wards_v4` RENAME TO `wards`;--> statement-breakpoint
CREATE UNIQUE INDEX `wards_code_idx` ON `wards` (`ward_code`);--> statement-breakpoint
CREATE INDEX `wards_name_idx` ON `wards` (`ward_name`);--> statement-breakpoint
CREATE INDEX `wards_sub_county_idx` ON `wards` (`sub_county_id`);
