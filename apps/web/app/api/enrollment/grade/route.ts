import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { db } from "@scsms/db/postgres";
import {
  academicYears,
  enrollmentGradeRows,
  enrollmentSnapshots,
  schools,
  terms,
} from "@scsms/db/postgress-schemas/index";
import { enrollmentGradeSaveSchema } from "@scsms/features/schemas/enrollment-grade-schema";

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
      { error: "A valid enrollment grade is required." },
      { status: 400 },
    );
  }

  const parsed = enrollmentGradeSaveSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ?? "Invalid enrollment grade values.",
      },
      { status: 400 },
    );
  }

  const values = parsed.data;
  try {
    const [school, year, term] = await Promise.all([
      db
        .select({ id: schools.id })
        .from(schools)
        .where(eq(schools.id, values.schoolId))
        .limit(1)
        .then(([result]) => result),
      db
        .select({ id: academicYears.id })
        .from(academicYears)
        .where(eq(academicYears.id, values.academicYearId))
        .limit(1)
        .then(([result]) => result),
      db
        .select({ id: terms.id })
        .from(terms)
        .where(
          and(
            eq(terms.id, values.termId),
            eq(terms.academicYearId, values.academicYearId),
          ),
        )
        .limit(1)
        .then(([result]) => result),
    ]);

    if (!school || !year || !term) {
      return NextResponse.json(
        { error: "The selected school, academic year, or term was not found." },
        { status: 404 },
      );
    }

    await db.transaction(async (transaction) => {
      let [snapshot] = await transaction
        .select({ id: enrollmentSnapshots.id })
        .from(enrollmentSnapshots)
        .where(
          and(
            eq(enrollmentSnapshots.schoolId, values.schoolId),
            eq(enrollmentSnapshots.academicYearId, values.academicYearId),
            eq(enrollmentSnapshots.termId, values.termId),
          ),
        )
        .limit(1);

      if (!snapshot) {
        const snapshotId = randomUUID();
        await transaction.insert(enrollmentSnapshots).values({
          id: snapshotId,
          schoolId: values.schoolId,
          academicYearId: values.academicYearId,
          termId: values.termId,
          status: "draft",
        });
        snapshot = { id: snapshotId };
      }

      await transaction
        .insert(enrollmentGradeRows)
        .values({
          snapshotId: snapshot.id,
          grade: values.grade,
          gradeBand: values.gradeBand,
          male: values.male,
          female: values.female,
          total: values.male + values.female,
        })
        .onConflictDoUpdate({
          target: [enrollmentGradeRows.snapshotId, enrollmentGradeRows.grade],
          set: {
            gradeBand: values.gradeBand,
            male: values.male,
            female: values.female,
            total: values.male + values.female,
          },
        });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Could not save enrollment grade.", error);
    return NextResponse.json(
      { error: "The enrollment grade could not be saved." },
      { status: 500 },
    );
  }
}
