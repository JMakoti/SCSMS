import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@scsms/db/postgres";
import { schools, staff } from "@scsms/db/postgress-schemas/index";
import type {
  AddStaffFormValues,
  EditRecordFormValues,
} from "@scsms/features/types/forms";
import { writeSchoolAudit } from "./school-audit-server";

type Staff = typeof staff.$inferSelect;

function required(value: string | undefined, label: string) {
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(`${label} is required to save a staff record.`);
  }

  return normalized;
}

function optional(value: string | undefined) {
  return value?.trim() || null;
}

function splitName(fullName: string) {
  const parts = required(fullName, "Full name").split(/\s+/);
  if (parts.length < 2) {
    throw new Error("Enter both a first name and a last name.");
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

async function resolveSchoolId(schoolNameOrId: string | undefined) {
  const value = required(schoolNameOrId, "Assigned school");
  const [schoolById] = await db
    .select({ id: schools.id })
    .from(schools)
    .where(eq(schools.id, value))
    .limit(1);

  if (schoolById) return schoolById.id;

  const [schoolByName] = await db
    .select({ id: schools.id })
    .from(schools)
    .where(eq(schools.displayName, value))
    .limit(1);

  if (!schoolByName) {
    throw new Error(`School "${value}" was not found in the school registry.`);
  }

  return schoolByName.id;
}

async function resolveSchool(schoolNameOrId: string | undefined) {
  const value = required(schoolNameOrId, "Assigned school");
  const [schoolById] = await db
    .select({ id: schools.id, displayName: schools.displayName })
    .from(schools)
    .where(eq(schools.id, value))
    .limit(1);

  if (schoolById) return schoolById;

  const [schoolByName] = await db
    .select({ id: schools.id, displayName: schools.displayName })
    .from(schools)
    .where(eq(schools.displayName, value))
    .limit(1);

  if (!schoolByName) {
    throw new Error(`School "${value}" was not found in the school registry.`);
  }

  return schoolByName;
}

function getSchoolInitials(schoolName: string) {
  const initials = schoolName
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials || "SCH";
}

async function generateStaffNumber(schoolNameOrId: string | undefined) {
  const school = await resolveSchool(schoolNameOrId);
  const prefix = `STF-${getSchoolInitials(school.displayName)}-`;
  const records = await db
    .select({ staffNumber: staff.staffNumber })
    .from(staff)
    .where(eq(staff.schoolId, school.id));
  const nextNumber =
    records.reduce((max, record) => {
      const current = record.staffNumber ?? "";
      if (!current.startsWith(prefix)) return max;
      const parsed = Number(current.slice(prefix.length));
      return Number.isInteger(parsed) ? Math.max(max, parsed) : max;
    }, 0) + 1;

  return {
    schoolId: school.id,
    staffNumber: `${prefix}${String(nextNumber).padStart(3, "0")}`,
  };
}

function mapEmploymentType(value: string): Staff["employmentType"] {
  const normalized = value.trim().toLowerCase();
  if (normalized === "temporary") return "contract";
  const employmentTypes: Record<string, Staff["employmentType"]> = {
    permanent: "permanent",
    contract: "contract",
    intern: "intern",
    volunteer: "volunteer",
  };
  const employmentType = employmentTypes[normalized];
  if (!employmentType) {
    throw new Error(`Unsupported employment type "${value}".`);
  }

  return employmentType;
}

function mapEmployer(value: string): NonNullable<Staff["employer"]> {
  const employers: Record<string, NonNullable<Staff["employer"]>> = {
    goverment_tsc: "goverment(TSC)",
    "government (tsc)": "goverment(TSC)",
    county_goverment: "county_goverment",
    "county government": "county_goverment",
    school_board_bom: "school_board(BOM)",
    "school board (bom)": "school_board(BOM)",
    private_owner: "private_owner",
    "private owner": "private_owner",
    faith_based: "faith_based_organization",
    faith_based_organization: "faith_based_organization",
    ngo: "NGO",
    agency: "agency",
  };
  const employer = employers[value.trim().toLowerCase()];
  if (!employer) {
    throw new Error(`Unsupported employer "${value}".`);
  }

  return employer;
}

function mapStaffType(designation: string): Staff["staffType"] {
  const normalized = designation.toLowerCase();
  if (/(teacher|instructor)/.test(normalized)) return "teaching";
  if (/(clerk|support|secretary|bursar|driver|cook|guard|cleaner)/.test(normalized)) {
    return "non_teaching";
  }

  return "administrative";
}

export async function getStaffMember(id: string) {
  const [member] = await db
    .select()
    .from(staff)
    .where(eq(staff.id, id))
    .limit(1);

  return member ?? null;
}

export async function createStaffMemberRecord(input: AddStaffFormValues) {
  const { firstName, lastName } = splitName(input.fullName);
  const designation = required(input.designation, "Designation");
  const { schoolId, staffNumber } = await generateStaffNumber(
    input.assignedSchool,
  );

  const values = {
    id: randomUUID(),
    staffNumber,
    firstName,
    lastName,
    schoolId,
    designation,
    staffType: mapStaffType(designation),
    employer: mapEmployer(input.employer),
    employmentType: mapEmploymentType(input.employmentType),
    tscNo: optional(input.tscNo),
    email: optional(input.email),
    phone: optional(input.phone),
    hiredOn: optional(input.dateJoined),
  };
  await db.insert(staff).values(values);
  await writeSchoolAudit("created staff member", schoolId, null, values);
}

export async function updateStaffMemberRecord(
  id: string,
  input: EditRecordFormValues,
) {
  const existing = await getStaffMember(id);
  if (!existing) {
    throw new Error("This staff member no longer exists. Refresh the list and try again.");
  }

  const fields = input.fields;
  const updates: Partial<typeof staff.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (fields["Full name"] !== undefined) {
    Object.assign(updates, splitName(fields["Full name"]));
  }
  if (fields.Designation !== undefined) {
    const designation = required(fields.Designation, "Designation");
    updates.designation = designation;
    updates.staffType = mapStaffType(designation);
  }
  if (fields["Assigned school"] !== undefined) {
    updates.schoolId = await resolveSchoolId(fields["Assigned school"]);
  }
  if (fields["Employment type"] !== undefined) {
    updates.employmentType = mapEmploymentType(fields["Employment type"]);
  }
  if (fields.Employer !== undefined) {
    updates.employer = mapEmployer(fields.Employer);
  }
  if (fields["TSC No."] !== undefined) {
    updates.tscNo = optional(fields["TSC No."]);
  }
  if (fields["Email address"] !== undefined) {
    updates.email = optional(fields["Email address"]);
  }
  if (fields["Phone number"] !== undefined) {
    updates.phone = optional(fields["Phone number"]);
  }
  if (fields["Date joined"] !== undefined) {
    updates.hiredOn = optional(fields["Date joined"]);
  }

  await db.update(staff).set(updates).where(eq(staff.id, id));
  await writeSchoolAudit(
    "updated staff member",
    updates.schoolId ?? existing.schoolId,
    existing,
    { ...existing, ...updates },
  );
}

export async function deleteStaffMemberRecord(id: string) {
  const existing = await getStaffMember(id);
  if (!existing) {
    throw new Error("This staff member no longer exists. Refresh the list and try again.");
  }

  await db.delete(staff).where(eq(staff.id, id));
  await writeSchoolAudit("deleted staff member", existing.schoolId, existing, null);
}
