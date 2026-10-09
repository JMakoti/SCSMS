"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import type { AcademicYear, RabaiSchool } from "../types/enterprise";
import type {
  DashboardGenderDistribution,
  DashboardRecentActivity,
  InfrastructureFacilityRow,
  InfrastructureProjectRecord,
  ProfileDefaults,
  SchoolContactGroup,
  SchoolHistoryActivity,
  StaffRecord,
} from "../types/fixtures";

export type WardSummary = {
  id: string;
  subCountyId: string;
  name: string;
  wardCode: string | null;
  county: string | null;
  countyCode: string | null;
  subCounty: string | null;
  subCountyCode: string | null;
  constituency: string | null;
  constituencyCode: string | null;
  schoolCount: number;
  publicSchools: number;
  privateSchools: number;
  primarySchools: number;
  juniorSecondarySchools: number;
  seniorSecondarySchools: number;
  studentCount: number;
  teacherCount: number;
};

export type WardDetailRecord = Pick<
  WardSummary,
  | "id"
  | "name"
  | "wardCode"
  | "county"
  | "countyCode"
  | "subCounty"
  | "subCountyCode"
  | "constituency"
  | "constituencyCode"
>;

export type FeatureSubCounty = {
  id: string;
  county: string | null;
  countyCode: string | null;
  subCounty: string | null;
  subCountyCode: string | null;
  constituency: string | null;
  constituencyCode: string | null;
  isActive: boolean;
};

export type FeatureWardOption = Pick<
  WardSummary,
  | "id"
  | "subCountyId"
  | "name"
  | "wardCode"
  | "county"
  | "subCounty"
> & {
  isActive: boolean;
};

export type FeatureStaffRecord = StaffRecord & {
  id: string;
  staffNumber: string;
  schoolId: string;
  assignedSchool: string;
  employmentType: string;
  employer: string;
  tscNo: string;
  email: string;
  dateJoined: string;
};

export type FeatureSchoolYear = {
  id: string;
  schoolId: string;
  academicYearId: string;
  studentCount: number;
  teacherCount: number;
  classCount: number;
  maleCount: number;
  femaleCount: number;
};

export type FeatureTerm = {
  id: string;
  academicYearId: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  status?: string;
};

export type FeaturePerformanceRecord = {
  id: string;
  schoolId: string;
  school: string;
  assessmentName: string;
  assessmentType: string;
  gradeBand: string;
  candidates: number;
  averageScore: number | null;
  passRate: number | null;
  status: string;
  year: string;
};

export type FeatureReport = {
  id: string;
  key: string;
  title: string;
  code: string;
  category: string;
  description: string;
  frequency: string;
  recordsIncluded: number;
  lastGenerated: string | null;
  status: string;
};

export type FeaturePerformanceSubject = {
  id: string;
  performanceRecordId: string;
  subject: string;
  candidates: number;
  averageScore: number | null;
  passRate: number | null;
};

export type FeatureSyncRecord = {
  id: string;
  tableName: string;
  recordId: string;
  operation: string;
  status: string;
  createdAt: string;
  syncedAt: string | null;
  lastError: string | null;
  label: string;
};

export type FeatureAuditLogRecord = {
  id: string;
  title: string;
  schoolName: string;
  time: string;
  entityType: string;
  entityId: string;
};

export type FeatureSubjectCombination = {
  id: string;
  schoolId: string;
  academicYearId: string;
  code: string;
  combination: string;
  pathway: string;
  track: string;
  isActive: boolean;
};

export type FeatureSchoolHistoryActivity = SchoolHistoryActivity & {
  schoolId: string;
};

export type FeatureData = {
  schools: RabaiSchool[];
  schoolYears: FeatureSchoolYear[];
  terms: FeatureTerm[];
  enrollmentRows: Array<{
    schoolId: string;
    academicYearId: string;
    termId: string | null;
    grade: string;
    gradeBand: string;
    male: number;
    female: number;
    total: number;
  }>;
  academicYears: AcademicYear[];
  staff: FeatureStaffRecord[];
  contacts: Array<
    SchoolContactGroup & {
      id: string;
      schoolId: string;
      role: string;
      phone: string;
      phone2: string;
      isActive: boolean;
    }
  >;
  infrastructureFacilities: Array<
    InfrastructureFacilityRow & {
      schoolId: string;
      academicYearId: string;
    }
  >;
  infrastructureProjects: InfrastructureProjectRecord[];
  performanceRecords: FeaturePerformanceRecord[];
  performanceSubjects: FeaturePerformanceSubject[];
  dashboardGenderDistribution: DashboardGenderDistribution[];
  dashboardRecentActivities: DashboardRecentActivity[];
  auditLogRecords: FeatureAuditLogRecord[];
  pendingSyncCount: number;
  syncRecords: FeatureSyncRecord[];
  subjectCombinations: FeatureSubjectCombination[];
  schoolHistoryActivities: FeatureSchoolHistoryActivity[];
  profile: ProfileDefaults;
  wards: WardSummary[];
  subCounties: FeatureSubCounty[];
  wardOptions: FeatureWardOption[];
  moduleRecords: Record<string, string[]>;
  reportTemplates: FeatureReport[];
};

const emptyFeatureData: FeatureData = {
  schools: [],
  schoolYears: [],
  terms: [],
  enrollmentRows: [],
  academicYears: [],
  staff: [],
  contacts: [],
  infrastructureFacilities: [],
  infrastructureProjects: [],
  performanceRecords: [],
  performanceSubjects: [],
  dashboardGenderDistribution: [],
  dashboardRecentActivities: [],
  auditLogRecords: [],
  pendingSyncCount: 0,
  syncRecords: [],
  subjectCombinations: [],
  schoolHistoryActivities: [],
  profile: { email: "", phone: "", department: "", location: "" },
  wards: [],
  subCounties: [],
  wardOptions: [],
  moduleRecords: {},
  reportTemplates: [],
};

const FeatureDataContext = createContext<FeatureData>(emptyFeatureData);

export function FeatureDataProvider({
  children,
  data,
}: {
  children: ReactNode;
  data: FeatureData;
}) {
  return (
    <FeatureDataContext.Provider value={data}>
      {children}
    </FeatureDataContext.Provider>
  );
}

export function useFeatureData() {
  return useContext(FeatureDataContext);
}

export function isFeatureData(value: unknown): value is FeatureData {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  const collectionFields = [
    "schools",
    "schoolYears",
    "terms",
    "enrollmentRows",
    "academicYears",
    "staff",
    "contacts",
    "infrastructureFacilities",
    "infrastructureProjects",
    "performanceRecords",
    "performanceSubjects",
    "dashboardGenderDistribution",
    "dashboardRecentActivities",
    "auditLogRecords",
    "schoolHistoryActivities",
    "wards",
    "subCounties",
    "wardOptions",
    "reportTemplates",
    "syncRecords",
    "subjectCombinations",
  ];

  return (
    collectionFields.every((field) => Array.isArray(data[field])) &&
    typeof data.pendingSyncCount === "number" &&
    Boolean(data.profile && typeof data.profile === "object") &&
    Boolean(data.moduleRecords && typeof data.moduleRecords === "object")
  );
}
