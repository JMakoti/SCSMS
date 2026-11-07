import { z } from "zod";
import { candidatureSchema, type Candidature } from "./candidature-model";

export const kcseGrades = ["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "E"];
export const kjseaLevels = ["EE1", "EE2", "ME1", "ME2", "AE1", "AE2", "BE1", "BE2"];
export const kpseaLevels = ["EE", "ME", "AE", "BE"];
export type ExaminationType = "KCSE" | "KJSEA" | "KPSEA";
export function examinationForLevel(level: string): ExaminationType | null {
  if (["senior", "SENIOR_SECONDARY"].includes(level)) return "KCSE";
  if (["junior", "JUNIOR_SECONDARY"].includes(level)) return "KJSEA";
  if (["primary", "PRIMARY"].includes(level)) return "KPSEA";
  return null;
}
export function gradesFor(type: ExaminationType) { return type === "KCSE" ? kcseGrades : type === "KJSEA" ? kjseaLevels : kpseaLevels; }
export function gradePoints(type: ExaminationType, grade: string | null) {
  const grades = gradesFor(type);
  const index = grades.indexOf(grade ?? "");
  return index < 0 ? null : grades.length - index;
}
export function mayAccessExamination(permissions: string[], schoolId: string, sameArea: boolean) {
  const scoped = (name: string) => permissions.includes("*") || permissions.includes(`performance:school:${schoolId}:${name}`) || (sameArea && permissions.includes(`performance:${name}`));
  const canWrite = scoped("write");
  const canViewCandidates = scoped("candidates") || canWrite;
  return { canRead: scoped("read") || canWrite || canViewCandidates, canWrite, canViewCandidates };
}
const optionalScore = z.number().finite().min(0).max(100).nullable();
const resultStatus = z.enum(["missing", "submitted", "absent", "withheld"]);
export const examinationSaveSchema = z.object({
  schoolId: z.string().min(1), academicYearId: z.string().min(1),
  degreeThreshold: z.string().refine((value) => kcseGrades.includes(value)),
  candidature: candidatureSchema.optional(),
  candidate: z.object({
    examinationNumber: z.string().trim().min(1).max(80).transform((value) => value.toUpperCase()), candidateName: z.string().trim().min(1).max(200),
    gender: z.enum(["male", "female", "unknown"]), cohort: z.string().trim().max(100).optional(),
    status: resultStatus, overallGrade: z.string().nullable(), overallScore: optionalScore,
    subjects: z.array(z.object({
      subjectCode: z.string().trim().min(1).max(80).transform((value) => value.toUpperCase()), subjectName: z.string().trim().min(1).max(150),
      status: resultStatus, grade: z.string().nullable(), score: optionalScore,
    })).max(50),
  }).nullable(),
});
export type ExaminationSaveInput = z.infer<typeof examinationSaveSchema>;
export type ExaminationFilters = {
  schoolId: string; academicYearId: string; gender?: string; subject?: string;
  grade?: string; search?: string; page?: number; pageSize?: number;
  order?: "asc" | "desc";
};
export const examinationFiltersSchema = z.object({
  schoolId: z.string().min(1), academicYearId: z.string().min(1),
  gender: z.enum(["all", "male", "female", "unknown"]).optional(), subject: z.string().max(80).optional(),
  grade: z.string().max(10).optional(), search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).max(100000).optional(), pageSize: z.coerce.number().int().min(1).max(500).optional(),
  order: z.enum(["asc", "desc"]).optional(),
});
export type ExaminationAccess = { canRead: boolean; canWrite: boolean; canViewCandidates: boolean };
export type Metric = {
  registered: number; submitted: number; absent: number; missing: number; withheld: number;
  male: number; female: number; mean_points: number | null; mean_marks: number | null; qualified: number;
};
export type GradeCount = { grade: string; count: number; gender?: string; year?: string; subject_code?: string };
export type SubjectMetric = {
  subject_code: string; subject_name: string; registered: number; sat: number; absent: number; missing: number;
  mean_points: number | null; mean_marks: number | null; highest: number | null; lowest: number | null;
  highest_points: number | null; lowest_points: number | null;
  male_mean: number | null; female_mean: number | null;
  previous_year?: string; previous_points?: number | null;
};
export type SubjectHistory = { year: string; subject_code: string; registered: number; submitted: number; mean_points: number | null; mean_marks: number | null };
export type Candidate = {
  id: string; examination_number: string; candidate_name: string; gender: string; cohort: string | null;
  status: string; overall_grade: string | null; overall_score: number | null; updated_at: string;
  subjects: { subject_code: string; subject_name: string; grade: string | null; score: number | null; status: string }[];
};
export type ExaminationDashboard = {
  candidature?: Candidature;
  schoolGender?: string | null;
  school: { id: string; display_name: string; school_code: string; level: string };
  examinationType: ExaminationType; access: ExaminationAccess; yearId: string; yearName: string;
  years: { id: string; name: string }[]; degreeThreshold: string; lastUpdated: string | null;
  summary: Metric; distribution: GradeCount[]; subjects: SubjectMetric[]; subjectGrades: GradeCount[];
  gender: (Metric & { gender: string })[];
  trends: (Metric & { year: string; subject_code?: string })[];
  subjectHistory: SubjectHistory[];
  genderHistory: { year: string; gender: string; registered: number; submitted: number; mean_points: number | null }[];
  gradeHistory: (GradeCount & { year: string })[];
  cohorts: string[]; availableSubjects: string[];
  subjectOptions: { subject_code: string; subject_name: string }[];
  candidates: Candidate[]; candidateCount: number; page: number; pageSize: number;
  legacySummary: { candidates: number; average_score: number | null; assessment_name: string } | null;
};

export function validateCandidate(input: ExaminationSaveInput, type: ExaminationType, available: string[]) {
  const candidate = input.candidate;
  if (!candidate) return;
  const grades = gradesFor(type);
  if (type !== "KCSE" && candidate.status === "submitted" && !candidate.subjects.some((subject) => subject.status === "submitted")) throw new Error("Enter at least one official learning-area result before marking the assessment submitted.");
  if (["absent", "withheld"].includes(candidate.status) && candidate.subjects.some((subject) => subject.status === "submitted")) throw new Error("An absent or withheld candidate cannot have submitted subject results.");
  if (type !== "KCSE" && (candidate.overallGrade !== null || candidate.overallScore !== null)) throw new Error("This assessment does not use a combined overall mean grade or score.");
  if (type === "KCSE" && candidate.status === "submitted" && !kcseGrades.includes(candidate.overallGrade ?? "")) throw new Error("Enter the candidate's official KCSE mean grade.");
  if (candidate.status !== "submitted" && (candidate.overallGrade !== null || candidate.overallScore !== null)) throw new Error("Missing, absent, or withheld results cannot contain an overall result.");
  if (candidate.overallGrade && !kcseGrades.includes(candidate.overallGrade)) throw new Error("Invalid KCSE mean grade.");
  const codes = new Set<string>();
  for (const subject of candidate.subjects) {
    if (codes.has(subject.subjectCode.toLowerCase())) throw new Error("A subject can only be registered once per candidate.");
    codes.add(subject.subjectCode.toLowerCase());
    if (type === "KCSE" && !available.some((name) => name.toLowerCase() === subject.subjectName.toLowerCase())) throw new Error("Select subjects offered by this senior school for the selected year.");
    if (subject.status === "submitted" && !grades.includes(subject.grade ?? "")) throw new Error("Enter an official subject grade or assessment level.");
    if (subject.status !== "submitted" && (subject.grade !== null || subject.score !== null)) throw new Error("Missing, absent, or withheld subject results cannot contain a grade or marks.");
  }
}
