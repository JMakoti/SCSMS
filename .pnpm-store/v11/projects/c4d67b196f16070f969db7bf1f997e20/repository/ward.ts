import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/database";
import {
    contacts,
    enrollmentGradeRows,
    enrollmentSnapshots,
    schools,
    staff,
    subcounty,
    wards,
} from "@scsms/db";
import type {
    AddWardFormValues,
    EditWardRecordFormValues,
} from "@scsms/features/types/forms";

export type Ward = typeof wards.$inferSelect;
export type WardDetails = Ward & {
    subCounty: typeof subcounty.$inferSelect | null;
    schools: Array<typeof schools.$inferSelect>;
    contacts: Array<typeof contacts.$inferSelect>;
    staff: Array<typeof staff.$inferSelect>;
};

export async function listWards() {
    return db.select().from(wards).orderBy(asc(wards.wardName));
}

export async function listSubCounties() {
    return db
        .select()
        .from(subcounty)
        .orderBy(asc(subcounty.subCounty));
}

export async function getWard(id: string) {
    const [ward] = await db
        .select()
        .from(wards)
        .where(eq(wards.id, id))
        .limit(1);

    return ward ?? null;
}

export async function getWardByName(name: string) {
    const [ward] = await db
        .select()
        .from(wards)
        .where(eq(wards.wardName, name))
        .limit(1);

    return ward ?? null;
}

export async function getWardDetails(id: string) {
    const ward = await getWard(id);
    if (!ward) return null;

    const [[parentSubCounty], wardSchools, wardContacts] = await Promise.all([
        db
            .select()
            .from(subcounty)
            .where(eq(subcounty.id, ward.subCountyId))
            .limit(1),
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
        subCounty: parentSubCounty ?? null,
        schools: wardSchools,
        contacts: wardContacts,
        staff: wardStaff,
    } satisfies WardDetails;
}

export async function listWardSummaries(academicYearId: string) {
    const wardRecords = await listWards();

    return Promise.all(
        wardRecords.map(async (ward) => {
            const details = await getWardDetails(ward.id);
            if (!details) {
                throw new Error(`Ward ${ward.wardName} could not be loaded.`);
            }

            const schoolIds = details.schools.map((school) => school.id);
            const snapshots = schoolIds.length > 0
                ? await db
                    .select({
                        id: enrollmentSnapshots.id,
                        schoolId: enrollmentSnapshots.schoolId,
                    })
                    .from(enrollmentSnapshots)
                    .where(
                        and(
                            eq(enrollmentSnapshots.academicYearId, academicYearId),
                            inArray(enrollmentSnapshots.schoolId, schoolIds),
                        ),
                    )
                    .orderBy(desc(enrollmentSnapshots.capturedAt))
                : [];
            const latestSnapshotBySchool = new Map<string, string>();
            for (const snapshot of snapshots) {
                if (!latestSnapshotBySchool.has(snapshot.schoolId)) {
                    latestSnapshotBySchool.set(snapshot.schoolId, snapshot.id);
                }
            }
            const snapshotIds = [...latestSnapshotBySchool.values()];
            const gradeRows = snapshotIds.length > 0
                ? await db
                    .select({
                        snapshotId: enrollmentGradeRows.snapshotId,
                        total: enrollmentGradeRows.total,
                    })
                    .from(enrollmentGradeRows)
                    .where(inArray(enrollmentGradeRows.snapshotId, snapshotIds))
                : [];
            const latestSnapshotIds = new Set(snapshotIds);

            return {
                id: ward.id,
                subCountyId: ward.subCountyId,
                name: ward.wardName,
                wardCode: ward.wardCode,
                county: details.subCounty?.county ?? null,
                countyCode: details.subCounty?.countyCode ?? null,
                subCounty: details.subCounty?.subCounty ?? null,
                subCountyCode: details.subCounty?.subCountyCode ?? null,
                constituency: details.subCounty?.constituency ?? null,
                constituencyCode: details.subCounty?.constituencyCode ?? null,
                schoolCount: details.schools.length,
                publicSchools: details.schools.filter(
                    (school) => school.ownershipType === "goverment",
                ).length,
                privateSchools: details.schools.filter(
                    (school) => school.ownershipType === "private",
                ).length,
                primarySchools: details.schools.filter(
                    (school) => school.level === "primary",
                ).length,
                juniorSecondarySchools: details.schools.filter(
                    (school) => school.level === "junior",
                ).length,
                seniorSecondarySchools: details.schools.filter(
                    (school) => school.level === "senior",
                ).length,
                studentCount: gradeRows.reduce(
                    (total, row) =>
                        latestSnapshotIds.has(row.snapshotId)
                            ? total + row.total
                            : total,
                    0,
                ),
                teacherCount: details.staff.filter(
                    (member) =>
                        member.staffType === "teaching" &&
                        member.status === "active",
                ).length,
            };
        }),
    );
}

export async function createWard(input: AddWardFormValues) {
    const { wardName, wardCode, subCountyId } = input;
    const [parentSubCounty] = await db
        .select({ id: subcounty.id })
        .from(subcounty)
        .where(and(eq(subcounty.id, subCountyId), eq(subcounty.isActive, true)))
        .limit(1);
    if (!parentSubCounty) {
        throw new Error("Select an active sub-county before saving the ward.");
    }
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
        subCountyId,
        notes: input.notes || null,
        isActive: true,
    });
}

export async function updateWard(id: string, input: EditWardRecordFormValues) {
    const { wardName, wardCode, subCountyId } = input.fields;
    const existing = await db
        .select({ id: wards.id })
        .from(wards)
        .where(eq(wards.id, id))
        .limit(1);

    if (existing.length === 0) {
        throw new Error("This ward no longer exists. Refresh the list and try again.");
    }

    const [parentSubCounty] = await db
        .select({ id: subcounty.id })
        .from(subcounty)
        .where(eq(subcounty.id, subCountyId))
        .limit(1);
    if (!parentSubCounty) {
        throw new Error("Select an active sub-county before saving the ward.");
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
        .set({
            wardName,
            wardCode,
            subCountyId,
            notes: input.fields.notes || null,
            updatedAt: new Date().toISOString(),
        })
        .where(eq(wards.id, id));

    const [savedWard] = await db
        .select({
            id: wards.id,
            wardName: wards.wardName,
            wardCode: wards.wardCode,
            subCountyId: wards.subCountyId,
        })
        .from(wards)
        .where(eq(wards.id, id))
        .limit(1);

    if (
        !savedWard ||
        savedWard.wardName !== wardName ||
        savedWard.wardCode !== wardCode ||
        savedWard.subCountyId !== subCountyId
    ) {
        throw new Error("Ward changes were not persisted. Please try again.");
    }
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
