DROP INDEX "subcounty_code_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "subcounty_code_idx" ON "subcounty" USING btree ("sub_county_code");