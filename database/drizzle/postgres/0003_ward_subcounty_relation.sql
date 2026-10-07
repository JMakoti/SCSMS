ALTER TABLE "wards" ADD COLUMN "sub_county_id" varchar(36);--> statement-breakpoint
INSERT INTO "subcounty" (
	"id",
	"county",
	"county_code",
	"sub_county",
	"sub_county_code",
	"constituency",
	"constituency_code",
	"is_active"
)
SELECT DISTINCT
	md5(concat_ws('|',
		COALESCE(w."county", ''),
		COALESCE(w."sub_county", ''),
		COALESCE(w."sub_county_code", ''),
		COALESCE(w."constituency", ''),
		COALESCE(w."constituency_code", '')
	))::uuid::varchar,
	w."county",
	NULL,
	w."sub_county",
	w."sub_county_code",
	w."constituency",
	w."constituency_code",
	true
FROM "wards" w
WHERE btrim(COALESCE(w."sub_county", '')) <> ''
  AND NOT EXISTS (
	SELECT 1
	FROM "subcounty" s
	WHERE lower(btrim(s."sub_county")) = lower(btrim(w."sub_county"))
	  AND (s."county" IS NOT DISTINCT FROM w."county" OR s."county" IS NULL OR w."county" IS NULL)
  )
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "subcounty" (
	"id",
	"sub_county",
	"notes",
	"is_active"
)
SELECT
	'00000000-0000-4000-8000-000000000003',
	'Unassigned (legacy ward)',
	'Temporary parent for a ward whose previous sub-county was not recorded.',
	false
WHERE EXISTS (
	SELECT 1
	FROM "wards" w
	WHERE NOT EXISTS (
		SELECT 1
		FROM "subcounty" s
		WHERE lower(btrim(s."sub_county")) = lower(btrim(w."sub_county"))
		  AND btrim(COALESCE(w."sub_county", '')) <> ''
		  AND (s."county" IS NOT DISTINCT FROM w."county" OR s."county" IS NULL OR w."county" IS NULL)
	)
)
ON CONFLICT DO NOTHING;--> statement-breakpoint
UPDATE "wards" w
SET "sub_county_id" = COALESCE(
	(
		SELECT s."id"
		FROM "subcounty" s
		WHERE lower(btrim(s."sub_county")) = lower(btrim(w."sub_county"))
		  AND btrim(COALESCE(w."sub_county", '')) <> ''
		  AND s."county" IS NOT DISTINCT FROM w."county"
		LIMIT 1
	),
	(
		SELECT s."id"
		FROM "subcounty" s
		WHERE lower(btrim(s."sub_county")) = lower(btrim(w."sub_county"))
		  AND btrim(COALESCE(w."sub_county", '')) <> ''
		  AND (s."county" IS NULL OR w."county" IS NULL)
		LIMIT 1
	)
)
WHERE w."sub_county_id" IS NULL;--> statement-breakpoint
UPDATE "wards"
SET "sub_county_id" = '00000000-0000-4000-8000-000000000003'
WHERE "sub_county_id" IS NULL;--> statement-breakpoint
ALTER TABLE "wards" ALTER COLUMN "sub_county_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "wards" ADD CONSTRAINT "wards_sub_county_id_subcounty_id_fk"
	FOREIGN KEY ("sub_county_id") REFERENCES "subcounty"("id")
	ON DELETE RESTRICT ON UPDATE CASCADE;--> statement-breakpoint
CREATE INDEX "wards_sub_county_idx" ON "wards" USING btree ("sub_county_id");--> statement-breakpoint
ALTER TABLE "wards" DROP COLUMN "county";--> statement-breakpoint
ALTER TABLE "wards" DROP COLUMN "county_code";--> statement-breakpoint
ALTER TABLE "wards" DROP COLUMN "sub_county";--> statement-breakpoint
ALTER TABLE "wards" DROP COLUMN "sub_county_code";--> statement-breakpoint
ALTER TABLE "wards" DROP COLUMN "constituency";--> statement-breakpoint
ALTER TABLE "wards" DROP COLUMN "constituency_code";
