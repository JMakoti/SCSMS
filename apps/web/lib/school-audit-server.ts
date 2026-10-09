import { randomUUID } from "node:crypto";
import { db } from "@scsms/db/postgres";
import { auditLogs } from "@scsms/db/postgress-schemas/index";

export async function writeSchoolAudit(
  action: string,
  schoolId: string | null | undefined,
  before: unknown,
  after: unknown,
) {
  if (!schoolId) return;

  await db.insert(auditLogs).values({
    id: randomUUID(),
    action,
    entityType: "school",
    entityId: schoolId,
    beforeJson: before ? JSON.stringify(before) : null,
    afterJson: after ? JSON.stringify(after) : null,
  });
}
