import { db } from "@/lib/database";
import { auditLogs } from "@scsms/db";
import { createLocalId } from "./helpers";

export async function writeSchoolAudit(
  action: string,
  schoolId: string | null | undefined,
  before: unknown,
  after: unknown,
) {
  if (!schoolId) return;

  await db.insert(auditLogs).values({
    id: createLocalId(),
    action,
    entityType: "school",
    entityId: schoolId,
    beforeJson: before ? JSON.stringify(before) : null,
    afterJson: after ? JSON.stringify(after) : null,
  });
}
