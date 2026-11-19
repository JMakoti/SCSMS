import { and, eq, sql } from "drizzle-orm";

import { db } from "../postgres";
import { roles, users } from "../postgress-schemas/user";
import { auditLogs, syncQueue } from "../postgress-schemas/system";
import referenceData from "./reference-data.json";

export async function seedAdministratorRole() {
  const item = referenceData.administratorRole;
  await db.transaction(async (tx) => {
    const [existing] = await tx.select().from(roles).where(eq(roles.name, item.name));
    if (existing && existing.id !== item.id) {
      const queued = await tx.select({ id: syncQueue.id }).from(syncQueue).where(sql`${syncQueue.status} <> 'synced' AND (${syncQueue.recordId} = ${existing.id} OR position(${existing.id} in coalesce(${syncQueue.payloadJson}, '')) > 0)`).limit(1);
      if (queued.length) throw new Error(`Pending sync data references ${existing.id}; synchronize it before changing seed IDs.`);
      // Free the unique name while preserving existing role settings.
      await tx.update(roles).set({ name: `__seed_migration_${existing.id}` }).where(eq(roles.id, existing.id));
      await tx.insert(roles).values({ ...existing, id: item.id, name: item.name });
      await tx.update(users).set({ roleId: item.id }).where(eq(users.roleId, existing.id));
      await tx.update(auditLogs).set({ entityId: item.id }).where(and(eq(auditLogs.entityType, "roles"), eq(auditLogs.entityId, existing.id)));
      await tx.delete(roles).where(eq(roles.id, existing.id));
    } else if (!existing) {
      await tx.insert(roles).values(item);
    }
  });
  console.log("Administrator role seeding complete.");
}

export async function seedScdeRole() {
  const item = referenceData.scdeRole;
  await db.insert(roles).values(item).onConflictDoNothing();
  const [existing] = await db.select({ id: roles.id }).from(roles).where(eq(roles.name, item.name));
  if (!existing) throw new Error("Unable to create the SCDE role: its ID is already used by another role.");
  console.log("SCDE role seeding complete.");
}
