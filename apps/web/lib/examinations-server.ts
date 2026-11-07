import { sql, type SQL } from "drizzle-orm";
import { db } from "@scsms/db/postgres";
import { getAuthenticatedUser } from "./auth/session";
import { mayAccessExamination } from "@scsms/features/examinations/model";
import type { Query, ExaminationStore } from "@scsms/features/examinations/service";

function statement(text: string, params: (string | number | null)[]) {
  const result = sql.empty();
  const parts = text.split("?");
  if (parts.length !== params.length + 1) throw new Error("Invalid examination query parameters.");
  parts.forEach((part, index) => {
    result.append(sql.raw(part));
    if (index < params.length) result.append(sql`${params[index]}`);
  });
  return result;
}
function makeQuery(execute: (query: SQL) => Promise<unknown>): Query {
  return async <T extends object>(text: string, params: (string | number | null)[] = []) =>
    await execute(statement(text, params)) as T[];
}
export const examinationStore: ExaminationStore = {
  query: makeQuery((query) => db.execute(query)),
  transaction: (callback) => db.transaction((transaction) => callback(makeQuery((query) => transaction.execute(query)))),
};
export async function examinationAccess(schoolId: string) {
  const user = await getAuthenticatedUser();
  if (!user) return null;
  const [scope] = await examinationStore.query<{ permissions_json: string; school_area: string; user_area: string | null }>(
    `SELECT r.permissions_json,w.sub_county_id AS school_area,u.subcounty_id AS user_area
     FROM users u JOIN roles r ON r.id=u.role_id JOIN schools s ON s.id=? JOIN wards w ON w.id=s.ward_id WHERE u.id=? AND u.status='active'`, [schoolId, user.id]);
  if (!scope) return { canRead: false, canWrite: false, canViewCandidates: false };
  let permissions: string[] = [];
  try { const values: unknown = JSON.parse(scope.permissions_json); if (Array.isArray(values)) permissions = values.filter((value): value is string => typeof value === "string"); } catch { /* Deny malformed role permissions. */ }
  return mayAccessExamination(permissions, schoolId, Boolean(scope.user_area && scope.user_area === scope.school_area));
}
