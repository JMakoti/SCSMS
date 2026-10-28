import { eq, sql } from "drizzle-orm";
import { users } from "@scsms/db/schema/user";
import { subcounty } from "@scsms/db/schema/subcounty_ward";
import { db } from "./database";

export async function testDatabase() {
    const result = await db.all(
        sql`SELECT 1 AS test`,
    );

    console.log("SQLite result:", result);

    return result;
}

export async function getCurrentUser() {
    const result = await db
        .select({
            id: users.id,
            name: users.name,
            email: users.email,
            status: users.status,
            roleId: users.roleId,
            subcountyId: users.subcountyId,
        })
        .from(users)
        .where(eq(users.email, "admin@scsms.go.ke"))
        .limit(1);

    return result[0] ?? null;
}

export async function getActiveSubCounty() {
    const result = await db
        .select({
            id: subcounty.id,
            county: subcounty.county,
            countyCode: subcounty.countyCode,
            subCounty: subcounty.subCounty,
            subCountyCode: subcounty.subCountyCode,
            constituency: subcounty.constituency,
            constituencyCode: subcounty.constituencyCode,
            notes: subcounty.notes,
            isActive: subcounty.isActive,
        })
        .from(subcounty)
        .where(eq(subcounty.isActive, true))
        .limit(1);

    return result[0] ?? null;
}

