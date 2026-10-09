import { desc, eq } from "drizzle-orm";
import {
  auditLogs,
  roles,
  schoolSubjectCombinations,
  subcounty,
  syncQueue,
  users,
} from "@scsms/db";
import type { FeatureData } from "@scsms/features/data/feature-data-context";
import type { RabaiSchool } from "@scsms/features/types/enterprise";
import {
  formatInfrastructureFacilityStatus,
  formatInfrastructureProjectStatus,
} from "@scsms/features/schools/infrastructure-display";
import { db } from "@/lib/database";
import {
  listAcademicYears,
  listContacts,
  listEnrollmentGradeRows,
  listEnrollmentSnapshots,
  listInfrastructureFacilityRows,
  listInfrastructureProjects,
  listInfrastructureSnapshots,
  listPerformanceRecords,
  listPerformanceSubjectRows,
  listReportRuns,
  listReportTemplates,
  listSchools,
  listSubCounties,
  listStaff,
  listTerms,
  listWardSummaries,
  listWards,
} from "@/repository";

const display = (value: string | null | undefined) =>
  value ? value.replaceAll("_", " ") : "Not recorded";
const formatEastAfricaTime = (value: string | null | undefined) => {
  if (!value) return "Not available";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return `${new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Nairobi",
  }).format(date)} EAT`;
};
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
  switch (value) {
    case "boys":
      return "BOYS";
    case "girls":
      return "GIRLS";
    case "mixed":
      return "MIXED";
    default:
      return "UNKNOWN";
  }
}

function mapBoarding(value: string | null): RabaiSchool["boardingType"] {
  switch (value) {
    case "boarding":
      return "BOARDING";
    case "day_and_boarding":
      return "DAY_AND_BOARDING";
    case "day":
      return "DAY";
    default:
      return "UNKNOWN";
  }
}

function mapSne(value: string | null): RabaiSchool["sne"] {
  if (value === "yes") return "YES";
  if (value === "no") return "NO";
  return "UNKNOWN";
}

function mapFrequency(value: string) {
  return value.replaceAll("_", " ");
}

export async function loadDesktopFeatureData(
  userEmail: string,
): Promise<FeatureData> {
  const [
    academicYearRecords,
    termRecords,
    schoolRecords,
    subCountyRecords,
    staffRecords,
    contactRecords,
    enrollmentSnapshots,
    infrastructureProjects,
    infrastructureSnapshots,
    performanceRecords,
    reportTemplates,
    reportRuns,
    wardRecords,
    auditRecords,
    syncQueueRecords,
    subjectCombinationRecords,
  ] = await Promise.all([
    listAcademicYears(),
    listTerms(),
    listSchools(),
    listSubCounties(),
    listStaff(),
    listContacts(),
    listEnrollmentSnapshots(),
    listInfrastructureProjects(),
    listInfrastructureSnapshots(),
    listPerformanceRecords(),
    listReportTemplates(),
    listReportRuns(),
    listWards(),
    db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)),
    db.select().from(syncQueue),
    db.select().from(schoolSubjectCombinations),
  ]);
  const [currentUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, userEmail))
    .limit(1);
  const [[role], [subCounty]] = currentUser
    ? await Promise.all([
        db.select().from(roles).where(eq(roles.id, currentUser.roleId)).limit(1),
        currentUser.subcountyId
          ? db
              .select()
              .from(subcounty)
              .where(eq(subcounty.id, currentUser.subcountyId))
              .limit(1)
          : Promise.resolve([]),
      ])
    : [[], []];

  const currentAcademicYearRecord =
    academicYearRecords.find((year) => year.isCurrent) ??
    academicYearRecords[0];
  const [wardSummaries, gradeRowsBySnapshot, facilitiesBySnapshot, subjectsByRecord] =
    await Promise.all([
      currentAcademicYearRecord
        ? listWardSummaries(currentAcademicYearRecord.id)
        : Promise.resolve([]),
      Promise.all(
        enrollmentSnapshots.map((snapshot) =>
          listEnrollmentGradeRows(snapshot.id).then((rows) => [
            snapshot.id,
            rows,
          ] as const),
        ),
      ),
      Promise.all(
        infrastructureSnapshots.map((snapshot) =>
          listInfrastructureFacilityRows(snapshot.id).then((rows) => [
            snapshot.id,
            rows,
          ] as const),
        ),
      ),
      Promise.all(
        performanceRecords.map((record) =>
          listPerformanceSubjectRows(record.id).then((rows) => [
            record.id,
            rows,
          ] as const),
        ),
      ),
    ]);

  const schoolsById = new Map(schoolRecords.map((school) => [school.id, school]));
  const subCountiesById = new Map(
    subCountyRecords.map((record) => [record.id, record]),
  );
  const wardsById = new Map(wardRecords.map((ward) => [ward.id, ward]));
  const readAuditEntityName = (record: {
    entityType: string;
    entityId: string | null;
    beforeJson: string | null;
    afterJson: string | null;
  }) => {
    const schoolId = readAuditSchoolId(record) || record.entityId || "";
    const schoolName = schoolsById.get(schoolId)?.displayName;
    if (schoolName) return schoolName;

    for (const json of [record.afterJson, record.beforeJson]) {
      if (!json) continue;
      try {
        const parsed: unknown = JSON.parse(json);
        if (!parsed || typeof parsed !== "object") continue;
        const data = parsed as Record<string, unknown>;
        for (const field of ["displayName", "officialName", "name", "projectName"]) {
          if (typeof data[field] === "string" && data[field].trim()) {
            return data[field];
          }
        }
      } catch {
        // Ignore legacy audit payloads that were not stored as JSON.
      }
    }

    return display(record.entityType);
  };
  const yearsById = new Map(
    academicYearRecords.map((year) => [year.id, year]),
  );
  const gradeRows = new Map(gradeRowsBySnapshot);
  const latestSnapshots = new Map<
    string,
    (typeof enrollmentSnapshots)[number]
  >();
  for (const snapshot of [...enrollmentSnapshots].sort((a, b) =>
    b.capturedAt.localeCompare(a.capturedAt),
  )) {
    const key = `${snapshot.schoolId}:${snapshot.academicYearId}`;
    if (!latestSnapshots.has(key)) latestSnapshots.set(key, snapshot);
  }
  const schoolYears = [...latestSnapshots.values()].map((snapshot) => {
    const rows = gradeRows.get(snapshot.id) ?? [];
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

  const enrollmentRows = enrollmentSnapshots.flatMap((snapshot) =>
    (gradeRows.get(snapshot.id) ?? []).map((row) => ({
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
      logoPath: school.logoPath,
      registrationNumber: school.registrationNumber,
      registrationStatus: school.registrationstatus,
      titleDeed: school.titleDeed,
      officialName: school.officialName,
      displayName: school.displayName,
      institutionType: mapInstitutionType(school.level),
      sourceInstitutionType: school.institutionType,
      ownershipType: mapOwnership(school.ownershipType),
      clusterLevel: school.clusterLevel,
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
      verifiedAt: school.lastVerifiedAt,
      createdAt: school.createdAt,
      updatedAt: school.updatedAt,
    };
  });

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

  const staff = staffRecords.map((member) => {
    const school = schoolsById.get(member.schoolId);
    return {
      name: `${member.firstName} ${member.lastName}`.trim(),
      role: member.designation,
      type: member.staffType === "teaching" ? "Teaching" as const : "Non-teaching" as const,
      phone: member.phone ?? "",
      status: member.status === "active" ? "Active" as const : "In Active" as const,
      id: member.id,
      staffNumber: member.staffNumber ?? "",
      schoolId: member.schoolId,
      assignedSchool: school?.displayName ?? "",
      employmentType: display(member.employmentType),
      employer: display(member.employer),
      tscNo: member.tscNo ?? "",
      email: member.email ?? "",
      dateJoined: member.hiredOn ?? "",
    };
  });

  const latestInfrastructureSnapshotBySchool = new Map<
    string,
    (typeof infrastructureSnapshots)[number]
  >();
  for (const snapshot of [...infrastructureSnapshots].sort((a, b) =>
    b.capturedAt.localeCompare(a.capturedAt),
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
  const infrastructureFacilities = facilitiesBySnapshot
    .filter(([snapshotId]) => latestInfrastructureSnapshotIds.has(snapshotId))
    .flatMap(([snapshotId, rows]) => {
      const snapshot = infrastructureSchoolBySnapshotId.get(snapshotId);
      if (!snapshot) return [];

      return rows.map((row) => ({
        schoolId: snapshot.schoolId,
        academicYearId: snapshot.academicYearId,
        facility: display(row.facilityType),
        available: row.available,
        good: row.good,
        needsRepair: row.needsRepair,
        status: formatInfrastructureFacilityStatus(row.status),
      }));
    });
  const projects = infrastructureProjects.map((project) => ({
    id: project.id,
    schoolId: project.schoolId,
    academicYearId: project.academicYearId,
    name: project.projectName,
    school: schoolsById.get(project.schoolId)?.displayName ?? "",
    year: yearsById.get(project.academicYearId)?.name ?? "",
    termId: project.termId,
    term:
      termRecords.find((term) => term.id === project.termId)?.name ??
      "Not recorded",
    status: formatInfrastructureProjectStatus(project.status),
    budget: project.budgetAmount?.toString() ?? "Not recorded",
    detail: project.description ?? project.projectConditions,
    category: project.projectType,
    contractor: project.projectContractor,
    condition: project.projectConditions,
    dateStarted: project.startsOn,
    dateCompleted: project.completedOn,
  }));

  const performanceSubjects = subjectsByRecord.flatMap(([, rows]) =>
    rows.map((subject) => ({
      id: subject.id,
      performanceRecordId: subject.performanceRecordId,
      subject: subject.subject,
      candidates: subject.candidates,
      averageScore: subject.averageScore,
      passRate: subject.passRate,
    })),
  );
  const performance = performanceRecords.map((record) => ({
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

  const templates = reportTemplates.map((template) => {
    const latestRun = reportRuns
      .filter((run) => run.templateId === template.id)
      .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0];
    return {
      id: template.id,
      key: template.key,
      title: template.title,
      code: template.code,
      category: template.category,
      description: template.description ?? "",
      frequency: mapFrequency(template.frequency),
      recordsIncluded: latestRun?.recordsIncluded ?? 0,
      lastGenerated: latestRun?.generatedAt ?? null,
      status: latestRun ? display(latestRun.status) : "Not generated",
    };
  });

  const dashboardRecentActivities = auditRecords.slice(0, 5).map((record) => ({
    id: record.id,
    icon: record.action.toLowerCase().includes("create") ? "Plus" as const : "Pencil" as const,
    title: display(record.action),
    entity: readAuditEntityName(record),
    time: formatEastAfricaTime(record.createdAt),
    tone: "blue",
  }));
  const schoolHistoryActivities = auditRecords
    .map((record) => ({
      schoolId: readAuditSchoolId(record),
      title: display(record.action),
      detail: display(record.entityType),
      time: formatEastAfricaTime(record.createdAt),
      icon: auditIcon(record.entityType),
    }))
    .filter((activity) => activity.schoolId);

  const dashboardYearId = currentAcademicYearRecord?.id;
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
  const syncRecords = syncQueueRecords.map((record) => {
    const recordLabel =
      record.tableName === "schools"
        ? schoolsById.get(record.recordId)?.displayName
        : record.tableName === "staff"
          ? staff.find((member) => member.id === record.recordId)?.name
          : record.tableName === "infrastructure_projects"
            ? infrastructureProjects.find(
                (project) => project.id === record.recordId,
              )?.projectName
            : undefined;
    return {
      id: record.id,
      tableName: record.tableName,
      recordId: record.recordId,
      operation: record.operation,
      status: record.status,
      createdAt: record.createdAt,
      syncedAt: record.syncedAt,
      lastError: record.lastError,
      label: recordLabel ?? `${record.tableName} · ${record.recordId}`,
    };
  });

  return {
    schools,
    schoolYears,
    terms: termRecords.map((term) => ({
      id: term.id,
      academicYearId: term.academicYearId,
      name: term.name,
      startDate: term.startsOn,
      endDate: term.endsOn,
    })),
    enrollmentRows,
    academicYears: academicYearRecords.map((year) => ({
      id: year.id,
      name: year.name,
      startDate: year.startsOn,
      endDate: year.endsOn,
      isActive: year.isCurrent || year.status === "active",
      isClosed: year.status === "closed" || year.status === "archived",
      createdAt: year.createdAt,
      updatedAt: year.updatedAt,
    })),
    staff,
    contacts,
    infrastructureFacilities,
    infrastructureProjects: projects,
    performanceRecords: performance,
    performanceSubjects,
    dashboardGenderDistribution,
    dashboardRecentActivities,
    pendingSyncCount: syncRecords.filter(
      (record) => record.status === "pending" || record.status === "failed",
    ).length,
    syncRecords,
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
      email: currentUser?.email ?? userEmail,
      phone: currentUser?.phone ?? "",
      department: role?.name ?? "",
      location: subCounty?.subCounty ?? "",
    },
    wards: wardSummaries.map((ward) => ({ ...ward })),
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
      Enrollment: [...new Set(enrollmentSnapshots.map((snapshot) =>
        schoolsById.get(snapshot.schoolId)?.displayName ?? "",
      ))].filter(Boolean),
      Staff: staff.map((member) => member.name),
      Infrastructure: projects.map((project) => project.name),
      Ward: wardSummaries.map((ward) => ward.name),
      "School Contacts": contacts.map((contact) => contact.person.name),
      Reports: templates.map((template) => template.title),
      "Data Quality": schools.map((school) => school.displayName),
      "Audit Logs": auditRecords.map(
        (record) =>
          `${display(record.action)} - ${readAuditEntityName(record)} - ${formatEastAfricaTime(record.createdAt)}`,
      ),
      "School Performance": [...new Set(performance.map((record) => record.school))],
      "Users & Roles": [],
      Settings: [],
      "System Information": [],
      Backup: [],
      Exports: [],
    },
    reportTemplates: templates,
  };
}
