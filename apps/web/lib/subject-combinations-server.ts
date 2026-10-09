import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@scsms/db/postgres";
import {
  auditLogs,
  schoolSubjectCombinations,
} from "@scsms/db/postgress-schemas/index";
import type { SubjectCombinationFormValues } from "@scsms/features/types/forms";

type SubjectCombination = typeof schoolSubjectCombinations.$inferSelect;

function clean(input: SubjectCombinationFormValues) {
  return {
    schoolId: input.schoolId.trim(),
    academicYearId: input.academicYearId.trim(),
    code: input.code.trim(),
    combination: input.combination.trim(),
    pathway: input.pathway.trim(),
    track: input.track.trim(),
  };
}

async function writeAudit(
  action: string,
  schoolId: string,
  subjectCombinationId: string,
  before: SubjectCombination | null,
  after: (SubjectCombination | SubjectCombinationFormValues) | null,
) {
  await db.insert(auditLogs).values({
    id: randomUUID(),
    action,
    entityType: "school",
    entityId: schoolId,
    beforeJson: before ? JSON.stringify(before) : null,
    afterJson: after
      ? JSON.stringify({ ...after, subjectCombinationId })
      : JSON.stringify({ subjectCombinationId }),
  });
}

export async function createSubjectCombinationRecord(
  input: SubjectCombinationFormValues,
) {
  const values = clean(input);
  const [existing] = await db
    .select()
    .from(schoolSubjectCombinations)
    .where(
      and(
        eq(schoolSubjectCombinations.schoolId, values.schoolId),
        eq(schoolSubjectCombinations.code, values.code),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .update(schoolSubjectCombinations)
      .set({
        ...values,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(schoolSubjectCombinations.id, existing.id));
    await writeAudit(
      "updated subject combination",
      values.schoolId,
      existing.id,
      existing,
      values,
    );
    return existing.id;
  }

  const id = randomUUID();
  await db.insert(schoolSubjectCombinations).values({
    id,
    ...values,
    isActive: true,
  });
  await writeAudit("created subject combination", values.schoolId, id, null, values);
  return id;
}

export async function updateSubjectCombinationRecord(
  id: string,
  input: SubjectCombinationFormValues,
) {
  const [existing] = await db
    .select()
    .from(schoolSubjectCombinations)
    .where(eq(schoolSubjectCombinations.id, id))
    .limit(1);
  if (!existing) {
    throw new Error(
      "This subject combination no longer exists. Refresh the list and try again.",
    );
  }

  const values = clean(input);
  await db
    .update(schoolSubjectCombinations)
    .set({
      ...values,
      isActive: true,
      updatedAt: new Date(),
    })
    .where(eq(schoolSubjectCombinations.id, id));
  await writeAudit(
    "updated subject combination",
    values.schoolId,
    id,
    existing,
    values,
  );
}

export async function deleteSubjectCombinationRecord(id: string) {
  const [existing] = await db
    .select()
    .from(schoolSubjectCombinations)
    .where(eq(schoolSubjectCombinations.id, id))
    .limit(1);
  if (!existing) {
    throw new Error(
      "This subject combination no longer exists. Refresh the list and try again.",
    );
  }

  await db
    .update(schoolSubjectCombinations)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(schoolSubjectCombinations.id, id));
  await writeAudit("deleted subject combination", existing.schoolId, id, existing, {
    ...existing,
    isActive: false,
  });
}
