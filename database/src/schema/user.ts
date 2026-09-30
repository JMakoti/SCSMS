import { randomUUID } from "./uuid";
import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { reportRuns } from "./reports";
import { subcounty } from "./subcounty_ward";

export const roles = sqliteTable(
  "roles",
  {
    id: text("id").$defaultFn(() => randomUUID()).primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    permissionsJson: text("permissions_json").notNull().default("[]"),
    isSystem: integer("is_system", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    nameIdx: uniqueIndex("roles_name_idx").on(table.name),
  }),
);

export const users = sqliteTable(
  "users",
  {
    id: text("id").$defaultFn(() => randomUUID()).primaryKey(),
    roleId: text("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "restrict" }),
    subcountyId: text("subcounty_id").references(() => subcounty.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    passwordHash: text("password_hash").notNull(),
    status: text("status", {
      enum: ["active", "inactive", "locked"],
    })
      .notNull()
      .default("active"),
    lastLoginAt: text("last_login_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    emailIdx: uniqueIndex("users_email_idx").on(table.email),
    roleIdx: index("users_role_idx").on(table.roleId),
    subcountyIdx: index("users_subcounty_idx").on(table.subcountyId),
    statusIdx: index("users_status_idx").on(table.status),
  }),
);

export const roleRelations = relations(roles, ({ many }) => ({
  users: many(users),
}));

export const userRelations = relations(users, ({ one, many }) => ({
  role: one(roles, {
    fields: [users.roleId],
    references: [roles.id],
  }),
  subcounty: one(subcounty, {
    fields: [users.subcountyId],
    references: [subcounty.id],
  }),
  reportRuns: many(reportRuns),
}));
