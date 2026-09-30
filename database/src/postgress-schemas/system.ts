import { randomUUID } from "./uuid";
import { sql } from "drizzle-orm";
import { index, integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: varchar("id", { length: 36 }).$defaultFn(() => randomUUID()).primaryKey(),
    actorUserId: varchar("actor_user_id", { length: 36 }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: varchar("entity_id", { length: 36 }),
    beforeJson: text("before_json"),
    afterJson: text("after_json"),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    entityIdx: index("audit_logs_entity_idx").on(table.entityType, table.entityId),
    actorIdx: index("audit_logs_actor_idx").on(table.actorUserId),
    createdAtIdx: index("audit_logs_created_at_idx").on(table.createdAt),
  }),
);

export const syncQueue = pgTable(
  "sync_queue",
  {
    id: varchar("id", { length: 36 }).$defaultFn(() => randomUUID()).primaryKey(),
    tableName: text("table_name").notNull(),
    recordId: varchar("record_id", { length: 36 }).notNull(),
    operation: text("operation", {
      enum: ["insert", "update", "delete"],
    }).notNull(),
    payloadJson: text("payload_json"),
    status: text("status", {
      enum: ["pending", "syncing", "synced", "failed"],
    })
      .notNull()
      .default("pending"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    syncedAt: timestamp("synced_at"),
  },
  (table) => ({
    statusIdx: index("sync_queue_status_idx").on(table.status),
    recordIdx: index("sync_queue_record_idx").on(table.tableName, table.recordId),
  }),
);

export const backups = pgTable(
  "backups",
  {
    id: varchar("id", { length: 36 }).$defaultFn(() => randomUUID()).primaryKey(),
    filePath: text("file_path").notNull(),
    sizeBytes: integer("size_bytes"),
    status: text("status", {
      enum: ["created", "verified", "failed"],
    })
      .notNull()
      .default("created"),
    createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    notes: text("notes"),
  },
  (table) => ({
    statusIdx: index("backups_status_idx").on(table.status),
    createdAtIdx: index("backups_created_at_idx").on(table.createdAt),
  }),
);
