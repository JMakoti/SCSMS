ALTER TABLE "schools" ADD COLUMN "location_accuracy" real;--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN "location_source" text;--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN "location_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN "location_verified_at" timestamp;--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN "location_verified_by" varchar(36);--> statement-breakpoint
ALTER TABLE "subcounty" ADD COLUMN "boundary_geojson" text;--> statement-breakpoint
ALTER TABLE "wards" ADD COLUMN "boundary_geojson" text;