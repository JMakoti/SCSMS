import { and, eq, ne, sql } from "drizzle-orm";

import { db } from "../postgres";
import { subcounty, wards } from "../postgress-schemas/subcounty_ward";
import { users } from "../postgress-schemas/user";
import { auditLogs, syncQueue } from "../postgress-schemas/system";
import referenceData from "./reference-data.json";

export const subCounties = referenceData.subCounties;

export async function seedSubCounties() {
  await db.transaction(async (tx) => {
    for (const item of [...subCounties].sort((a, b) => Number(b.subCountyCode === "00304") - Number(a.subCountyCode === "00304"))) {
      // Older desktop releases assigned Rabai the code for Kilifi North.
      // Reject ambiguous matches instead of silently changing another area.
      const matches = await tx.select().from(subcounty).where(sql`lower(${subcounty.subCounty}) = lower(${item.subCounty})`);
      if (matches.length > 1) throw new Error(`Multiple sub-counties named ${item.subCounty}; resolve them before seeding.`);
      const existing = matches[0];
      const occupied = await tx.select().from(subcounty).where(and(eq(subcounty.subCountyCode, item.subCountyCode), ne(subcounty.id, existing?.id ?? item.id)));
      if (occupied.length) throw new Error(`Sub-county code ${item.subCountyCode} belongs to another record; resolve it before seeding.`);
      if (existing && existing.id !== item.id) {
        const queued = await tx.select({ id: syncQueue.id }).from(syncQueue).where(sql`${syncQueue.status} <> 'synced' AND (${syncQueue.recordId} = ${existing.id} OR position(${existing.id} in coalesce(${syncQueue.payloadJson}, '')) > 0)`).limit(1);
        if (queued.length) throw new Error(`Pending sync data references ${existing.id}; synchronize it before changing seed IDs.`);
        await tx.update(subcounty).set({ subCountyCode: null }).where(eq(subcounty.id, existing.id));
        const legacyRabai = item.subCountyCode === "00304" && existing.subCountyCode === "00301";
        await tx.insert(subcounty).values({ ...existing, id: item.id, subCountyCode: item.subCountyCode, ...(legacyRabai ? { constituency: item.constituency, constituencyCode: item.constituencyCode } : {}) });
        await tx.update(wards).set({ subCountyId: item.id }).where(eq(wards.subCountyId, existing.id));
        await tx.update(users).set({ subcountyId: item.id }).where(eq(users.subcountyId, existing.id));
        await tx.update(auditLogs).set({ entityId: item.id }).where(and(eq(auditLogs.entityType, "subcounty"), eq(auditLogs.entityId, existing.id)));
        await tx.delete(subcounty).where(eq(subcounty.id, existing.id));
      } else if (existing) {
        await tx.update(subcounty).set({ subCountyCode: item.subCountyCode }).where(eq(subcounty.id, item.id));
      } else {
        await tx.insert(subcounty).values(item);
      }
    }
  });
  console.log("Sub-county seeding complete.");
}
