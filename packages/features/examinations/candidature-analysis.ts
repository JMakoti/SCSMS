import { candidatureSchema, type Candidature } from "./candidature-model";
import { gradePoints, type ExaminationDashboard, type ExaminationFilters, type ExaminationType, type Metric, type GradeCount, type SubjectMetric } from "./model";

type Gender = "male" | "female";
function summarise(value: Candidature, type: ExaminationType, filters: ExaminationFilters, threshold: string) {
  const genders: Gender[] = filters.gender === "unknown" ? [] : filters.gender && filters.gender !== "all" ? [filters.gender as Gender] : ["male", "female"];
  const selected = filters.subject ? value.subjects.find((subject) => subject.subjectCode === filters.subject) : undefined;
  const attendance = filters.subject ? selected : value;
  const selectedGrades = selected?.grades ?? (type === "KCSE" && !filters.subject ? value.overallGrades : []);
  const sum = (field: "registered" | "present" | "absent" | "submitted" | "withheld", group = genders) => group.reduce((total, gender) => total + (attendance?.[gender][field] ?? 0), 0);
  const mean = (rows: Candidature["overallGrades"], group = genders) => {
    const total = rows.reduce((total, row) => total + group.reduce((count, gender) => count + row[gender], 0), 0);
    return total ? rows.reduce((total, row) => total + (gradePoints(type, row.grade) ?? 0) * group.reduce((count, gender) => count + row[gender], 0), 0) / total : null;
  };
  const metric = (group: Gender[]): Metric => ({
    registered: sum("registered", group), submitted: sum("submitted", group), absent: sum("absent", group),
    missing: sum("present", group) - sum("submitted", group) - sum("withheld", group), withheld: sum("withheld", group),
    male: group.includes("male") ? attendance?.male.registered ?? 0 : 0, female: group.includes("female") ? attendance?.female.registered ?? 0 : 0,
    mean_points: mean(selectedGrades, group), mean_marks: null,
    qualified: type === "KCSE" && !filters.subject ? selectedGrades.filter((row) => (gradePoints(type, row.grade) ?? 0) >= (gradePoints(type, threshold) ?? 7)).reduce((total, row) => total + group.reduce((count, gender) => count + row[gender], 0), 0) : 0,
  });
  const subjects: SubjectMetric[] = value.subjects.filter((subject) => !filters.subject || subject.subjectCode === filters.subject).map((subject) => {
    const total = (field: "registered" | "present" | "absent" | "submitted") => genders.reduce((sum, gender) => sum + subject[gender][field], 0);
    const points = subject.grades.filter((row) => genders.some((gender) => row[gender] > 0)).map((row) => gradePoints(type, row.grade) ?? 0);
    return { subject_code: subject.subjectCode, subject_name: subject.subjectName, registered: total("registered"), sat: total("submitted"), absent: total("absent"), missing: total("present") - total("submitted"), mean_points: mean(subject.grades), mean_marks: null, highest: null, lowest: null, highest_points: points.length ? Math.max(...points) : null, lowest_points: points.length ? Math.min(...points) : null, male_mean: genders.includes("male") ? mean(subject.grades, ["male"]) : null, female_mean: genders.includes("female") ? mean(subject.grades, ["female"]) : null };
  }).sort((a, b) => (b.mean_points ?? -1) - (a.mean_points ?? -1));
  const subjectGrades = value.subjects.filter((subject) => !filters.subject || subject.subjectCode === filters.subject).flatMap((subject) => subject.grades.map((row) => ({ subject_code: subject.subjectCode, grade: row.grade, count: genders.reduce((sum, gender) => sum + row[gender], 0) })));
  const distribution: GradeCount[] = type === "KCSE" && !filters.subject
    ? selectedGrades.flatMap((row) => genders.map((gender) => ({ grade: row.grade, gender, count: row[gender] })))
    : value.subjects.filter((subject) => !filters.subject || subject.subjectCode === filters.subject).flatMap((subject) => subject.grades.flatMap((row) => genders.map((gender) => ({ grade: row.grade, gender, count: row[gender] }))));
  return { summary: metric(genders), gender: genders.map((gender) => ({ gender, ...metric([gender]) })), subjects, subjectGrades, distribution };
}

export type CandidatureHistoryRow = { summary_json: string; updated_at: string; year_id: string; year: string };
export function candidatureDashboard(base: Pick<ExaminationDashboard, "school" | "examinationType" | "access" | "yearId" | "yearName" | "years" | "degreeThreshold" | "availableSubjects">, rows: CandidatureHistoryRow[], filters: ExaminationFilters): ExaminationDashboard | null {
  const current = rows.find((row) => row.year_id === base.yearId);
  if (!current) return null;
  if (filters.grade || filters.search) throw new Error("Bulk candidature supports year, gender and subject filters. Clear candidate-level filters to view this summary.");
  const value = candidatureSchema.parse(JSON.parse(current.summary_json));
  const analysis = summarise(value, base.examinationType, filters, base.degreeThreshold);
  const histories = rows.map((row) => ({ ...row, data: summarise(candidatureSchema.parse(JSON.parse(row.summary_json)), base.examinationType, filters, base.degreeThreshold) }));
  const subjectHistory = histories.flatMap(({ year, data }) => data.subjects.map((subject) => ({ year, subject_code: subject.subject_code, registered: subject.registered, submitted: subject.sat, mean_points: subject.mean_points, mean_marks: null })));
  for (const subject of analysis.subjects) {
    const previous = subjectHistory.filter((row) => row.subject_code === subject.subject_code && row.year < base.yearName).sort((a, b) => b.year.localeCompare(a.year))[0];
    subject.previous_year = previous?.year; subject.previous_points = previous?.mean_points ?? null;
  }
  return { ...base, ...analysis, candidature: value, lastUpdated: current.updated_at,
    trends: base.examinationType === "KCSE" && !filters.subject ? histories.map(({ year, data }) => ({ year, ...data.summary })) : subjectHistory.map((row) => ({ ...row, absent: 0, missing: 0, withheld: 0, male: 0, female: 0, qualified: 0 })),
    subjectHistory, genderHistory: histories.flatMap(({ year, data }) => data.gender.map((row) => ({ year, ...row }))),
    gradeHistory: histories.flatMap(({ year, data }) => data.distribution.map((row) => ({ year, ...row }))),
    cohorts: [base.yearName], subjectOptions: value.subjects.map((subject) => ({ subject_code: subject.subjectCode, subject_name: subject.subjectName })),
    candidates: [], candidateCount: 0, page: 1, pageSize: 25, legacySummary: null,
  };
}
