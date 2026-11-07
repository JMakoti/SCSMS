import { z } from "zod";
import { gradesFor, type ExaminationType } from "./model";

const count = z.number().int().min(0).max(100000);
export const attendanceSchema = z.object({
  registered: count, present: count, absent: count, submitted: count, withheld: count,
  reasons: z.array(z.object({ reason: z.string().trim().min(1).max(300), count: count.min(1) })).max(100),
}).superRefine((value, context) => {
  if (value.present + value.absent !== value.registered) context.addIssue({ code: "custom", message: "Present plus absent must equal registered candidature." });
  if (value.submitted + value.withheld > value.present) context.addIssue({ code: "custom", message: "Submitted plus withheld results cannot exceed those present." });
  if (value.reasons.reduce((sum, item) => sum + item.count, 0) !== value.absent) context.addIssue({ code: "custom", message: "Absence reasons must account for every absent candidate." });
});
const gradeCounts = z.array(z.object({ grade: z.string().max(10), male: count, female: count })).max(12);
export const candidatureSchema = z.object({
  examinationNumber: z.string().trim().min(1).max(80).transform((value) => value.toUpperCase()),
  male: attendanceSchema, female: attendanceSchema,
  overallGrades: gradeCounts,
  subjects: z.array(z.object({
    subjectCode: z.string().trim().min(1).max(80).transform((value) => value.toUpperCase()),
    subjectName: z.string().trim().min(1).max(150),
    male: attendanceSchema, female: attendanceSchema, grades: gradeCounts,
  })).max(50),
});
export type Candidature = z.infer<typeof candidatureSchema>;
export type Attendance = Candidature["male"];
export const emptyAttendance = (): Attendance => ({ registered: 0, present: 0, absent: 0, submitted: 0, withheld: 0, reasons: [] });
export function candidatureDraft(type: ExaminationType, saved?: Candidature): Candidature {
  const complete = (rows: Candidature["overallGrades"] = []) => gradesFor(type).map((grade) => ({ grade, male: rows.find((row) => row.grade === grade)?.male ?? 0, female: rows.find((row) => row.grade === grade)?.female ?? 0 }));
  const value = saved ? structuredClone(saved) : { examinationNumber: "", male: emptyAttendance(), female: emptyAttendance(), overallGrades: [], subjects: [] };
  value.overallGrades = type === "KCSE" ? complete(value.overallGrades) : [];
  value.subjects = value.subjects.map((subject) => ({ ...subject, grades: complete(subject.grades) }));
  return value;
}
export function validateCandidature(value: Candidature, type: ExaminationType, available: string[], schoolGender?: string | null) {
  candidatureSchema.parse(value);
  if ((schoolGender === "boys" && value.female.registered) || (schoolGender === "girls" && value.male.registered)) throw new Error("Candidature gender does not match this school's category.");
  const checkGrades = (rows: Candidature["overallGrades"], male: number, female: number) => {
    if (new Set(rows.map((row) => row.grade)).size !== rows.length || rows.some((row) => !gradesFor(type).includes(row.grade))) throw new Error("Use unique official examination grades or assessment levels.");
    if (rows.reduce((sum, row) => sum + row.male, 0) !== male || rows.reduce((sum, row) => sum + row.female, 0) !== female) throw new Error("Grade counts must equal submitted results for each gender.");
  };
  if (type === "KCSE") checkGrades(value.overallGrades, value.male.submitted, value.female.submitted);
  else if (value.overallGrades.length) throw new Error("Learning areas must be reported independently; do not enter combined CBC grades.");
  const codes = new Set<string>();
  const names = new Set<string>();
  for (const subject of value.subjects) {
    if (codes.has(subject.subjectCode.toUpperCase()) || names.has(subject.subjectName.toLowerCase())) throw new Error("Select each subject only once.");
    codes.add(subject.subjectCode.toUpperCase());
    names.add(subject.subjectName.toLowerCase());
    if (type === "KCSE" && !available.some((name) => name.toLowerCase() === subject.subjectName.toLowerCase())) throw new Error("Select subjects offered by this senior school.");
    for (const gender of ["male", "female"] as const) {
      if (subject[gender].registered > value[gender].registered || subject[gender].present > value[gender].present) throw new Error("Subject candidature or attendance cannot exceed the corresponding school gender totals.");
    }
    checkGrades(subject.grades, subject.male.submitted, subject.female.submitted);
  }
}
