export type InstitutionType =
  "PRIMARY" | "JUNIOR_SECONDARY" | "SENIOR_SECONDARY" | "INTEGRATED";

export type OwnershipType =
  "PUBLIC" | "PRIVATE" | "FAITH_BASED";

export type GenderType = "MIXED" | "BOYS" | "GIRLS";

export type BoardingType = "DAY" | "BOARDING" | "DAY_AND_BOARDING";

export type EmployerType =
  | "GOVERMENT(TSC)"
  | "COUNTY_GOVERNMENT"
  | "SCHOOL_BOARD(BOM)"
  | "PRIVATE_OWNER"
  | "FAITH_BASED"
  | "NGO"
  | "AGENCY";

export type InfrastructureProjectCategory =
  | "CLASSROOMS"
  | "ADMINISTRATION_BLOCK"
  | "STAFF_ROOMS"
  | "LIBRARY"
  | "LABORATORY"
  | "COMPUTER_LABORATORY"
  | "WORKSHOP"
  | "DINING_HALL"
  | "KITCHEN"
  | "DORMITORIES"
  | "TOILETS_SANITATION"
  | "WATER_SUPPLY"
  | "ELECTRICITY_POWER"
  | "ICT_INFRASTRUCTURE"
  | "SPORTS_RECREATION"
  | "PLAYGROUND"
  | "FENCING_SECURITY"
  | "ROADS_ACCESS"
  | "DRAINAGE"
  | "WASTE_MANAGEMENT"
  | "ENVIRONMENTAL"
  | "SPECIAL_NEEDS"
  | "ACCESSIBILITY"
  | "FURNITURE_FITTINGS"
  | "TRANSPORT_FACILITIES"
  | "STAFF_HOUSING"
  | "MAINTENANCE_RENOVATION"
  | "NEW_CONSTRUCTION"
  | "EXPANSION_EXTENSION"
  | "OTHER";

export type DataConfidence = "VERIFIED" | "PARTIAL" | "SECONDARY_SOURCE";
export type SneStatus = "YES" | "NO" | "UNKNOWN";

export type AcademicYear = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isClosed: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RabaiWard = {
  wardName: string;
  wardCode: string;
  county: "Kilifi";
  countyCode: string;
  subCounty: "Rabai";
  subCountyCode: string;
  constituency: "Rabai";
  constituencyCode: string;
};

export type RabaiSchool = {
  id: string;
  schoolCode: string | null;
  uicCode?: string | null;
  officialName: string;
  displayName: string;
  institutionType: InstitutionType;
  sourceInstitutionType: string | null;
  ownershipType: OwnershipType;
  genderType: GenderType;
  boardingType: BoardingType;
  county: "Kilifi";
  subCounty: "Rabai";
  ward: string | null;
  location: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  latitude: number | null;
  longitude: number | null;
  sne: SneStatus;
  isActive: boolean;
  dataConfidence: DataConfidence;
  dataSource: string;
  sourceName: string;
  sourceUrl: string;
  verifiedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type SchoolYearSample = {
  id: string;
  schoolId: string;
  academicYearId: string;
  status: "ACTIVE" | "CLOSED";
  studentCount: number;
  teacherCount: number;
  classCount: number;
  notes: string;
  isDemo: true;
  createdAt: string;
  updatedAt: string;
};
