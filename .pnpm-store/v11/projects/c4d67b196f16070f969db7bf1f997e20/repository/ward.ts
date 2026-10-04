import { asc, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/database";
import { contacts, schools, staff, wards } from "@scsms/db";
import type {
    AddWardFormValues,
    EditWardRecordFormValues,
} from "@scsms/features/types/forms";

export type Ward = typeof wards.$inferSelect;
export type WardDetails = Ward & {
    schools: Array<typeof schools.$inferSelect>;
    contacts: Array<typeof contacts.$inferSelect>;
    staff: Array<typeof staff.$inferSelect>;
};

export async function listWards() {
    return db.select().from(wards).orderBy(asc(wards.wardName));
}

export async function getWard(id: string) {
    const [ward] = await db
        .select()
        .from(wards)
        .where(eq(wards.id, id))
        .limit(1);

    return ward ?? null;
}

export async function getWardDetails(id: string) {
    const ward = await getWard(id);
    if (!ward) return null;

    const [wardSchools, wardContacts] = await Promise.all([
        db.select().from(schools).where(eq(schools.wardId, id)).orderBy(asc(schools.displayName)),
        db.select().from(contacts).where(eq(contacts.wardId, id)).orderBy(asc(contacts.name)),
    ]);
    const schoolIds = wardSchools.map((school) => school.id);
    const wardStaff = schoolIds.length > 0
        ? await db
            .select()
            .from(staff)
            .where(inArray(staff.schoolId, schoolIds))
            .orderBy(asc(staff.lastName), asc(staff.firstName))
        : [];

    return {
        ...ward,
        schools: wardSchools,
        contacts: wardContacts,
        staff: wardStaff,
    } satisfies WardDetails;
}

export async function createWard(input: AddWardFormValues) {
    const { wardName, wardCode } = input;
    const duplicate = await db
        .select({ id: wards.id })
        .from(wards)
        .where(eq(wards.wardCode, wardCode))
        .limit(1);

    if (duplicate.length > 0) {
        throw new Error(`Ward code ${wardCode} is already in use.`);
    }

    await db.insert(wards).values({
        wardName,
        wardCode,
        isActive: true,
    });
}

export async function updateWard(id: string, input: EditWardRecordFormValues) {
    const { wardName, wardCode } = input.fields;
    const existing = await db
        .select({ id: wards.id })
        .from(wards)
        .where(eq(wards.id, id))
        .limit(1);

    if (existing.length === 0) {
        throw new Error("This ward no longer exists. Refresh the list and try again.");
    }

    const duplicate = await db
        .select({ id: wards.id })
        .from(wards)
        .where(eq(wards.wardCode, wardCode))
        .limit(1);

    if (duplicate.some((ward) => ward.id !== id)) {
        throw new Error(`Ward code ${wardCode} is already in use.`);
    }

    await db
        .update(wards)
        .set({ wardName, wardCode, updatedAt: new Date().toISOString() })
        .where(eq(wards.id, id));
}

export async function deleteWard(id: string) {
    const existing = await db
        .select({ id: wards.id })
        .from(wards)
        .where(eq(wards.id, id))
        .limit(1);

    if (existing.length === 0) {
        throw new Error("This ward no longer exists. Refresh the list and try again.");
    }

    await db.delete(wards).where(eq(wards.id, id));
}
