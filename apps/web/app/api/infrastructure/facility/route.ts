import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { writeSchoolAudit } from "@/lib/school-audit-server";
import { db } from "@scsms/db/postgres";
import {
  academicYears,
  infrastructureFacilityRows,
  infrastructureSnapshots,
  schools,
} from "@scsms/db/postgress-schemas/index";
import { infrastructureFacilitySaveSchema } from "@scsms/features/schemas/infrastructure-facility-schema";

export async function PATCH(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json(
      { error: "A valid infrastructure facility is required." },
      { status: 400 },
    );
  }

  const parsed = infrastructureFacilitySaveSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ??
          "Invalid infrastructure facility values.",
      },
      { status: 400 },
    );
  }

  const values = parsed.data;
  try {
    const [school, academicYear] = await Promise.all([
      db
        .select({ id: schools.id })
        .from(schools)
        .where(eq(schools.id, values.schoolId))
        .limit(1)
        .then(([record]) => record),
      db
        .select({ id: academicYears.id })
        .from(academicYears)
        .where(eq(academicYears.id, values.academicYearId))
        .limit(1)
        .then(([record]) => record),
    ]);

    if (!school || !academicYear) {
      return NextResponse.json(
        { error: "The selected school or academic year was not found." },
        { status: 404 },
      );
    }

    let auditBefore: unknown = null;
    let auditAfter: unknown = null;
    await db.transaction(async (transaction) => {
      let [snapshot] = await transaction
        .select({ id: infrastructureSnapshots.id })
        .from(infrastructureSnapshots)
        .where(
          and(
            eq(infrastructureSnapshots.schoolId, values.schoolId),
            eq(infrastructureSnapshots.academicYearId, values.academicYearId),
          ),
        )
        .limit(1);

      if (!snapshot) {
        const snapshotId = randomUUID();
        await transaction.insert(infrastructureSnapshots).values({
          id: snapshotId,
          schoolId: values.schoolId,
          academicYearId: values.academicYearId,
          status: "draft",
        });
        snapshot = { id: snapshotId };
      }

      const [existingRow] = await transaction
        .select()
        .from(infrastructureFacilityRows)
        .where(
          and(
            eq(infrastructureFacilityRows.snapshotId, snapshot.id),
            eq(
              infrastructureFacilityRows.facilityType,
              values.previousFacility,
            ),
          ),
        )
        .limit(1);
      const rowValues = {
        facilityType: values.facility,
        available: values.available,
        good: values.good,
        needsRepair: values.needsRepair,
        status: values.status.toLowerCase().replaceAll(" ", "_") as
          | "pending"
          | "active"
          | "completed"
          | "needs_repair"
          | "unavailable",
      };

      if (existingRow) {
        await transaction
          .update(infrastructureFacilityRows)
          .set(rowValues)
          .where(eq(infrastructureFacilityRows.id, existingRow.id));
        auditBefore = existingRow;
        auditAfter = { ...existingRow, ...rowValues };
      } else {
        const inserted = {
          snapshotId: snapshot.id,
          ...rowValues,
        };
        await transaction.insert(infrastructureFacilityRows).values(inserted);
        auditAfter = inserted;
      }
    });
    await writeSchoolAudit(
      "saved infrastructure facility",
      values.schoolId,
      auditBefore,
      auditAfter,
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Could not save infrastructure facility.", error);
    return NextResponse.json(
      { error: "The infrastructure facility could not be saved." },
      { status: 500 },
    );
  }
}
