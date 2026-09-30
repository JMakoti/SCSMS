import { randomUUID } from "./uuid";
import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id").$defaultFn(() => randomUUID()).primaryKey(),
    actorUserId: text("actor_user_id"),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    beforeJson: text("before_json"),
    afterJson: text("after_json"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    entityIdx: index("audit_logs_entity_idx").on(table.entityType, table.entityId),
    actorIdx: index("audit_logs_actor_idx").on(table.actorUserId),
    createdAtIdx: index("audit_logs_created_at_idx").on(table.createdAt),
  }),
);

export const syncQueue = sqliteTable(
  "sync_queue",
  {
    id: text("id").$defaultFn(() => randomUUID()).primaryKey(),
    tableName: text("table_name").notNull(),
    recordId: text("record_id").notNull(),
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
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    syncedAt: text("synced_at"),
  },
  (table) => ({
    statusIdx: index("sync_queue_status_idx").on(table.status),
    recordIdx: index("sync_queue_record_idx").on(table.tableName, table.recordId),
  }),
);

export const backups = sqliteTable(
  "backups",
  {
    id: text("id").$defaultFn(() => randomUUID()).primaryKey(),
    filePath: text("file_path").notNull(),
    sizeBytes: integer("size_bytes"),
    status: text("status", {
      enum: ["created", "verified", "failed"],
    })
      .notNull()
      .default("created"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    notes: text("notes"),
  },
  (table) => ({
    statusIdx: index("backups_status_idx").on(table.status),
    createdAtIdx: index("backups_created_at_idx").on(table.createdAt),
  }),
);
