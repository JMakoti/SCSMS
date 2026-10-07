import { randomUUID } from "./uuid";
import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

import { contacts } from "./contact";
import { schools } from "./schools";
import { users } from "./user";
import { staff } from "./staff";

export const subcounty = pgTable(
  "subcounty",
  {
    id: varchar("id", { length: 36 })
      .$defaultFn(() => randomUUID())
      .primaryKey(),

    county: text("county"),
    countyCode: text("county_code"),

    subCounty: text("sub_county"),
    subCountyCode: text("sub_county_code"),

    constituency: text("constituency"),
    constituencyCode: text("constituency_code"),

    notes: text("notes"),

    isActive: boolean("is_active")
      .notNull()
      .default(true),

    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    codeIdx: uniqueIndex("subcounty_code_idx")
      .on(table.countyCode),

    nameIdx: index("subcounty_name_idx")
      .on(table.subCounty),
  }),
);

export const wards = pgTable(
  "wards",
  {
    id: varchar("id", { length: 36 })
      .$defaultFn(() => randomUUID())
      .primaryKey(),

    // Relationship to subcounty
    subCountyId: varchar("sub_county_id", { length: 36 })
      .notNull()
      .references(() => subcounty.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      }),

    // Ward
    wardCode: text("ward_code").notNull(),
    wardName: text("ward_name").notNull(),

    notes: text("notes"),

    isActive: boolean("is_active")
      .notNull()
      .default(true),

    createdAt: timestamp("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    codeIdx: uniqueIndex("wards_code_idx")
      .on(table.wardCode),

    nameIdx: index("wards_name_idx")
      .on(table.wardName),

    subCountyIdx: index("wards_sub_county_idx")
      .on(table.subCountyId),
  }),
);

/**
 * Subcounty → Wards
 */
export const subCountyRelations = relations(
  subcounty,
  ({ many }) => ({
    wards: many(wards),
  }),
);

/**
 * Ward → Subcounty + other entities
 */
export const wardRelations = relations(
  wards,
  ({ one, many }) => ({
    subCounty: one(subcounty, {
      fields: [wards.subCountyId],
      references: [subcounty.id],
    }),

    schools: many(schools),
    contacts: many(contacts),
    users: many(users),
    staff: many(staff),
  }),
);