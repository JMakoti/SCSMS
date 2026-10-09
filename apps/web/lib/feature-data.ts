import { desc, eq } from "drizzle-orm";
import { db } from "@scsms/db/postgres";
import {
  academicYears,
  auditLogs,
  contacts as contactTable,
  enrollmentGradeRows,
  enrollmentSnapshots,
  infrastructureFacilityRows,
  infrastructureProjects as infrastructureProjectTable,
  infrastructureSnapshots,
  performanceRecords as performanceRecordTable,
  performanceSubjectRows,
  reportRuns,
  reportTemplates as reportTemplateTable,
  roles as roleTable,
  schools as schoolTable,
  schoolSubjectCombinations as subjectCombinationTable,
  staff as staffTable,
  subcounty as subCountyTable,
  syncQueue,
  terms as termTable,
  users as userTable,
  wards as wardTable,
} from "@scsms/db/postgress-schemas/index";
import type { FeatureData } from "@scsms/features/data/feature-data-context";
import type { RabaiSchool } from "@scsms/features/types/enterprise";
import {
  formatInfrastructureFacilityStatus,
  formatInfrastructureProjectStatus,
} from "@scsms/features/schools/infrastructure-display";

const display = (value: string | null | undefined) =>
  value ? value.replaceAll("_", " ") : "Not recorded";
const iso = (value: Date | string | null | undefined) =>
  value instanceof Date ? value.toISOString() : value ?? "";
const readAuditSchoolId = (record: {
  entityType: string;
  entityId: string | null;
  beforeJson: string | null;
  afterJson: string | null;
}) => {
  if (record.entityType === "school") return record.entityId ?? "";

  for (const json of [record.afterJson, record.beforeJson]) {
    if (!json) continue;
    try {
      const parsed: unknown = JSON.parse(json);
      if (
        parsed &&
        typeof parsed === "object" &&
        "schoolId" in parsed &&
        typeof parsed.schoolId === "string"
      ) {
        return parsed.schoolId;
      }
    } catch {
      // Ignore legacy audit payloads that were not stored as JSON.
    }
  }

  return "";
};
const auditIcon = (entityType: string) => {
  if (entityType.includes("infrastructure")) return "Building2" as const;
  if (entityType.includes("staff")) return "UserCog" as const;
  if (entityType.includes("enrollment")) return "Users" as const;
  return "Pencil" as const;
};

function mapInstitutionType(level: string) {
  if (level === "junior") return "JUNIOR_SECONDARY" as const;
  if (level === "senior") return "SENIOR_SECONDARY" as const;
  return "PRIMARY" as const;
}

function mapOwnership(value: string) {
  if (value === "private") return "PRIVATE" as const;
  if (value === "faith_based" || value === "NGO_organization") {
    return "FAITH_BASED" as const;
  }
  return "PUBLIC" as const;
}

function mapGender(value: string | null): RabaiSchool["genderType"] {
  if (value === "boys") return "BOYS";
  if (value === "girls") return "GIRLS";
  if (value === "mixed") return "MIXED";
  return "UNKNOWN";
}

function mapBoarding(value: string | null): RabaiSchool["boardingType"] {
  if (value === "boarding") return "BOARDING";
  if (value === "day_and_boarding") return "DAY_AND_BOARDING";
  if (value === "day") return "DAY";
  return "UNKNOWN";
}

function mapSne(value: string | null): RabaiSchool["sne"] {
  if (value === "yes") return "YES";
  if (value === "no") return "NO";
  return "UNKNOWN";
}

export async function loadWebFeatureData(userId: string): Promise<FeatureData> {
  const [
    academicYearRecords,
    termRecords,
    schoolRecords,
    staffRecords,
    contactRecords,
    enrollmentSnapshotRecords,
    enrollmentGradeRecords,
    infrastructureProjectRecords,
    infrastructureSnapshotRecords,
    infrastructureFacilityRecords,
    performanceRecordRecords,
    performanceSubjectRecords,
    reportTemplateRecords,
    reportRunRecords,
    wardRecords,
    subCountyRecords,
    auditRecords,
    syncRecords,
    subjectCombinationRecords,
  ] = await Promise.all([
    db.select().from(academicYears),
    db.select().from(termTable),
    db.select().from(schoolTable),
    db.select().from(staffTable),
    db.select().from(contactTable),
    db.select().from(enrollmentSnapshots),
    db.select().from(enrollmentGradeRows),
    db.select().from(infrastructureProjectTable),
    db.select().from(infrastructureSnapshots),
    db.select().from(infrastructureFacilityRows),
    db.select().from(performanceRecordTable),
    db.select().from(performanceSubjectRows),
    db.select().from(reportTemplateTable),
    db.select().from(reportRuns),
    db.select().from(wardTable),
    db.select().from(subCountyTable),
    db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)),
    db.select().from(syncQueue),
    db.select().from(subjectCombinationTable),
  ]);
  const [currentUser] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);
  const [[role], [subCounty]] = currentUser
    ? await Promise.all([
        db.select().from(roleTable).where(eq(roleTable.id, currentUser.roleId)).limit(1),
        currentUser.subcountyId
          ? db
              .select()
              .from(subCountyTable)
              .where(eq(subCountyTable.id, currentUser.subcountyId))
              .limit(1)
          : Promise.resolve([]),
      ])
    : [[], []];

  const yearsById = new Map(
    academicYearRecords.map((year) => [year.id, year]),
  );
  const schoolsById = new Map(schoolRecords.map((school) => [school.id, school]));
  const wardsById = new Map(wardRecords.map((ward) => [ward.id, ward]));
  const subCountiesById = new Map(
    subCountyRecords.map((record) => [record.id, record]),
  );
  const gradeRowsBySnapshot = new Map<string, typeof enrollmentGradeRecords>();
  for (const row of enrollmentGradeRecords) {
    const rows = gradeRowsBySnapshot.get(row.snapshotId) ?? [];
    rows.push(row);
    gradeRowsBySnapshot.set(row.snapshotId, rows);
  }
  const latestSnapshots = new Map<
    string,
    (typeof enrollmentSnapshotRecords)[number]
  >();
  for (const snapshot of [...enrollmentSnapshotRecords].sort((a, b) =>
    iso(b.capturedAt).localeCompare(iso(a.capturedAt)),
  )) {
    const key = `${snapshot.schoolId}:${snapshot.academicYearId}`;
    if (!latestSnapshots.has(key)) latestSnapshots.set(key, snapshot);
  }
  const schoolYears = [...latestSnapshots.values()].map((snapshot) => {
    const rows = gradeRowsBySnapshot.get(snapshot.id) ?? [];
    return {
      id: snapshot.id,
      schoolId: snapshot.schoolId,
      academicYearId: snapshot.academicYearId,
      termId: snapshot.termId,
      studentCount: rows.reduce((sum, row) => sum + row.total, 0),
      teacherCount: staffRecords.filter(
        (member) =>
          member.schoolId === snapshot.schoolId &&
          member.staffType === "teaching" &&
          member.status === "active",
      ).length,
      classCount: new Set(rows.map((row) => row.grade)).size,
      maleCount: rows.reduce((sum, row) => sum + row.male, 0),
      femaleCount: rows.reduce((sum, row) => sum + row.female, 0),
    };
  });
  const schools = schoolRecords.map((school) => {
    const ward = wardsById.get(school.wardId);
    const parentSubCounty = ward
      ? subCountiesById.get(ward.subCountyId)
      : undefined;
    return {
      id: school.id,
      wardId: school.wardId,
      schoolCode: school.schoolCode,
      uicCode: school.uicCode,
      knecCode: school.knecCode,
      tscCode: school.tscCode,
      registrationNumber: school.registrationNumber,
      registrationStatus: school.registrationstatus,
      titleDeed: school.titleDeed,
      officialName: school.officialName,
      displayName: school.displayName,
      institutionType: mapInstitutionType(school.level),
      sourceInstitutionType: school.institutionType,
      ownershipType: mapOwnership(school.ownershipType),
      genderType: mapGender(school.genderType),
      boardingType: mapBoarding(school.boardingType),
      county: parentSubCounty?.county ?? null,
      subCounty: parentSubCounty?.subCounty ?? null,
      ward: ward?.wardName ?? null,
      location: school.location,
      address: school.address,
      phone: school.phone,
      email: school.email,
      latitude: school.latitude,
      longitude: school.longitude,
      sne: mapSne(school.sne),
      isActive: school.status === "active",
      dataConfidence: null,
      dataSource: null,
      sourceName: null,
      sourceUrl: null,
      verifiedAt: iso(school.lastVerifiedAt) || null,
      createdAt: iso(school.createdAt),
      updatedAt: iso(school.updatedAt),
    };
  });
  const staff = staffRecords.map((member) => ({
    name: `${member.firstName} ${member.lastName}`.trim(),
    role: member.designation,
    type: member.staffType === "teaching" ? "Teaching" as const : "Non-teaching" as const,
    phone: member.phone ?? "",
    status: member.status === "active" ? "Active" as const : "In Active" as const,
    id: member.id,
    staffNumber: member.staffNumber ?? "",
    schoolId: member.schoolId,
    assignedSchool: schoolsById.get(member.schoolId)?.displayName ?? "",
    employmentType: display(member.employmentType),
    employer: display(member.employer),
    tscNo: member.tscNo ?? "",
    email: member.email ?? "",
    dateJoined: member.hiredOn ?? "",
  }));
  const contacts = contactRecords.map((contact) => ({
    id: contact.id,
    schoolId: contact.schoolId ?? "",
    role: display(contact.titleType),
    phone: contact.phone,
    phone2: contact.phone2 ?? "",
    isActive: contact.isActive,
    title: display(contact.titleType),
    person: {
      name: contact.name,
      email: contact.email ?? "",
      contacts: [
        { label: "Phone", phone: contact.phone },
        ...(contact.phone2
          ? [{ label: "Alternate phone", phone: contact.phone2 }]
          : []),
      ],
    },
  }));
  const latestInfrastructureSnapshotBySchool = new Map<
    string,
    (typeof infrastructureSnapshotRecords)[number]
  >();
  for (const snapshot of [...infrastructureSnapshotRecords].sort((a, b) =>
    iso(b.capturedAt).localeCompare(iso(a.capturedAt)),
  )) {
    if (!latestInfrastructureSnapshotBySchool.has(snapshot.schoolId)) {
      latestInfrastructureSnapshotBySchool.set(snapshot.schoolId, snapshot);
    }
  }
  const latestInfrastructureSnapshotIds = new Set(
    [...latestInfrastructureSnapshotBySchool.values()].map((snapshot) => snapshot.id),
  );
  const infrastructureSchoolBySnapshotId = new Map(
    [...latestInfrastructureSnapshotBySchool.values()].map((snapshot) => [
      snapshot.id,
      {
        schoolId: snapshot.schoolId,
        academicYearId: snapshot.academicYearId,
      },
    ]),
  );
  const infrastructureFacilities = infrastructureFacilityRecords
    .filter((row) => latestInfrastructureSnapshotIds.has(row.snapshotId))
    .map((row) => ({
      schoolId:
        infrastructureSchoolBySnapshotId.get(row.snapshotId)?.schoolId ?? "",
      academicYearId:
        infrastructureSchoolBySnapshotId.get(row.snapshotId)?.academicYearId ??
        "",
      facility: display(row.facilityType),
      available: row.available,
      good: row.good,
      needsRepair: row.needsRepair,
      status: formatInfrastructureFacilityStatus(row.status),
    }));
  const infrastructureProjects = infrastructureProjectRecords.map((project) => ({
    id: project.id,
    schoolId: project.schoolId,
    academicYearId: project.academicYearId,
    name: project.projectName,
    school: schoolsById.get(project.schoolId)?.displayName ?? "",
    year: yearsById.get(project.academicYearId)?.name ?? "",
    termId: project.termId,
    term: termRecords.find((term) => term.id === project.termId)?.name ?? "Not recorded",
    status: formatInfrastructureProjectStatus(project.status),
    budget: project.budgetAmount?.toString() ?? "Not recorded",
    detail: project.description ?? project.projectConditions,
    category: project.projectType,
    contractor: project.projectContractor,
    condition: project.projectConditions,
    dateStarted: project.startsOn,
    dateCompleted: project.completedOn,
  }));
  const performanceRecords = performanceRecordRecords.map((record) => ({
    id: record.id,
    schoolId: record.schoolId,
    school: schoolsById.get(record.schoolId)?.displayName ?? "",
    assessmentName: record.assessmentName,
    assessmentType: display(record.assessmentType),
    gradeBand: record.gradeBand ?? "",
    candidates: record.candidates,
    averageScore: record.averageScore,
    passRate: record.passRate,
    status: display(record.status),
    year: yearsById.get(record.academicYearId)?.name ?? "",
  }));
  const performanceSubjects = performanceSubjectRecords.map((subject) => ({
    id: subject.id,
    performanceRecordId: subject.performanceRecordId,
    subject: subject.subject,
    candidates: subject.candidates,
    averageScore: subject.averageScore,
    passRate: subject.passRate,
  }));
  const reportTemplates = reportTemplateRecords.map((template) => {
    const latestRun = reportRunRecords
      .filter((run) => run.templateId === template.id)
      .sort((a, b) => iso(b.generatedAt).localeCompare(iso(a.generatedAt)))[0];
    return {
      id: template.id,
      key: template.key,
      title: template.title,
      code: template.code,
      category: template.category,
      description: template.description ?? "",
      frequency: template.frequency.replaceAll("_", " "),
      recordsIncluded: latestRun?.recordsIncluded ?? 0,
      lastGenerated: latestRun ? iso(latestRun.generatedAt) : null,
      status: latestRun ? display(latestRun.status) : "Not generated",
    };
  });
  const enrollmentRows = enrollmentSnapshotRecords.flatMap((snapshot) =>
    (gradeRowsBySnapshot.get(snapshot.id) ?? []).map((row) => ({
      schoolId: snapshot.schoolId,
      academicYearId: snapshot.academicYearId,
      termId: snapshot.termId,
      grade: row.grade,
      gradeBand: row.gradeBand,
      male: row.male,
      female: row.female,
      total: row.total,
    })),
  );
  const wardSummaries = wardRecords.map((ward) => {
    const parentSubCounty = subCountiesById.get(ward.subCountyId);
    const wardSchools = schoolRecords.filter(
      (school) => school.wardId === ward.id,
    );
    const schoolIds = new Set(wardSchools.map((school) => school.id));
    return {
      id: ward.id,
      subCountyId: ward.subCountyId,
      name: ward.wardName,
      wardCode: ward.wardCode,
      county: parentSubCounty?.county ?? null,
      countyCode: parentSubCounty?.countyCode ?? null,
      subCounty: parentSubCounty?.subCounty ?? null,
      subCountyCode: parentSubCounty?.subCountyCode ?? null,
      constituency: parentSubCounty?.constituency ?? null,
      constituencyCode: parentSubCounty?.constituencyCode ?? null,
      schoolCount: wardSchools.length,
      publicSchools: wardSchools.filter(
        (school) => school.ownershipType === "goverment",
      ).length,
      privateSchools: wardSchools.filter(
        (school) => school.ownershipType === "private",
      ).length,
      primarySchools: wardSchools.filter((school) => school.level === "primary").length,
      juniorSecondarySchools: wardSchools.filter((school) => school.level === "junior").length,
      seniorSecondarySchools: wardSchools.filter((school) => school.level === "senior").length,
      studentCount: schoolYears
        .filter(
          (year) =>
            schoolIds.has(year.schoolId) &&
            year.academicYearId === academicYearRecords.find((record) => record.isCurrent)?.id,
        )
        .reduce((sum, year) => sum + year.studentCount, 0),
      teacherCount: staffRecords.filter(
        (member) =>
          schoolIds.has(member.schoolId) &&
          member.staffType === "teaching" &&
          member.status === "active",
      ).length,
    };
  });
  const dashboardRecentActivities = auditRecords.slice(0, 8).map((record) => ({
    icon: record.action.toLowerCase().includes("create") ? "Plus" as const : "Pencil" as const,
    title: display(record.action),
    entity: [record.entityType, record.entityId].filter(Boolean).join(" / "),
    time: iso(record.createdAt),
    tone: "blue",
  }));
  const schoolHistoryActivities = auditRecords
    .map((record) => ({
      schoolId: readAuditSchoolId(record),
      title: display(record.action),
      detail: display(record.entityType),
      time: iso(record.createdAt),
      icon: auditIcon(record.entityType),
    }))
    .filter((activity) => activity.schoolId);
  const dashboardYearId =
    academicYearRecords.find((year) => year.isCurrent)?.id ??
    academicYearRecords[0]?.id;
  const dashboardGenderDistribution = [
    {
      label: "Male" as const,
      value: schoolYears
        .filter((row) => row.academicYearId === dashboardYearId)
        .reduce((sum, row) => sum + row.maleCount, 0),
      tone: "male" as const,
    },
    {
      label: "Female" as const,
      value: schoolYears
        .filter((row) => row.academicYearId === dashboardYearId)
        .reduce((sum, row) => sum + row.femaleCount, 0),
      tone: "female" as const,
    },
  ];
  const featureSyncRecords = syncRecords.map((record) => {
    const recordLabel =
      record.tableName === "schools"
        ? schoolsById.get(record.recordId)?.displayName
        : record.tableName === "staff"
          ? staff.find((member) => member.id === record.recordId)?.name
          : record.tableName === "infrastructure_projects"
            ? infrastructureProjectRecords.find(
                (project) => project.id === record.recordId,
              )?.projectName
            : undefined;
    return {
      id: record.id,
      tableName: record.tableName,
      recordId: record.recordId,
      operation: record.operation,
      status: record.status,
      createdAt: iso(record.createdAt),
      syncedAt: record.syncedAt ? iso(record.syncedAt) : null,
      lastError: record.lastError,
      label:
        recordLabel ??
        `${record.tableName} · ${record.recordId}`,
    };
  });

  return {
    schools,
    schoolYears,
    terms: termRecords.map((term) => ({
      id: term.id,
      academicYearId: term.academicYearId,
      name: term.name,
      startDate: iso(term.startsOn),
      endDate: iso(term.endsOn),
    })),
    enrollmentRows,
    academicYears: academicYearRecords.map((year) => ({
      id: year.id,
      name: year.name,
      startDate: year.startsOn,
      endDate: year.endsOn,
      isActive: year.isCurrent || year.status === "active",
      isClosed: year.status === "closed" || year.status === "archived",
      createdAt: iso(year.createdAt),
      updatedAt: iso(year.updatedAt),
    })),
    staff,
    contacts,
    infrastructureFacilities,
    infrastructureProjects,
    performanceRecords,
    performanceSubjects,
    dashboardGenderDistribution,
    dashboardRecentActivities,
    pendingSyncCount: featureSyncRecords.filter(
      (record) => record.status === "pending" || record.status === "failed",
    ).length,
    syncRecords: featureSyncRecords,
    subjectCombinations: subjectCombinationRecords.map((record) => ({
      id: record.id,
      schoolId: record.schoolId,
      academicYearId: record.academicYearId,
      code: record.code,
      combination: record.combination,
      pathway: record.pathway,
      track: record.track,
      isActive: record.isActive,
    })),
    schoolHistoryActivities,
    profile: {
      email: currentUser?.email ?? "",
      phone: currentUser?.phone ?? "",
      department: role?.name ?? "",
      location: subCounty?.subCounty ?? "",
    },
    wards: wardSummaries,
    subCounties: subCountyRecords.map((record) => ({
        id: record.id,
        county: record.county,
        countyCode: record.countyCode,
        subCounty: record.subCounty,
        subCountyCode: record.subCountyCode,
        constituency: record.constituency,
        constituencyCode: record.constituencyCode,
        isActive: record.isActive,
      })),
    wardOptions: wardRecords
      .filter((ward) => ward.isActive)
      .map((ward) => ({
        id: ward.id,
        subCountyId: ward.subCountyId,
        name: ward.wardName,
        wardCode: ward.wardCode,
        county: subCountiesById.get(ward.subCountyId)?.county ?? null,
        subCounty:
          subCountiesById.get(ward.subCountyId)?.subCounty ?? null,
        isActive: ward.isActive,
      })),
    moduleRecords: {
      Enrollment: [...new Set(enrollmentSnapshotRecords.map((record) =>
        schoolsById.get(record.schoolId)?.displayName ?? "",
      ))].filter(Boolean),
      Staff: staff.map((member) => member.name),
      Infrastructure: infrastructureProjects.map((project) => project.name),
      Ward: wardSummaries.map((ward) => ward.name),
      "School Contacts": contacts.map((contact) => contact.person.name),
      Reports: reportTemplates.map((template) => template.title),
      "Data Quality": schools.map((school) => school.displayName),
      "Audit Logs": auditRecords.map((record) => record.id),
      "School Performance": [...new Set(performanceRecords.map((record) => record.school))],
      "Users & Roles": [],
      Settings: [],
      "System Information": [],
      Backup: [],
      Exports: [],
    },
    reportTemplates,
  };
}
