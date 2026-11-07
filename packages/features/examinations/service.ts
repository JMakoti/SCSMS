import { examinationForLevel, gradesFor, validateCandidate, type Candidate, type ExaminationAccess, type ExaminationDashboard, type ExaminationFilters, type ExaminationSaveInput, type ExaminationType, type Metric } from "./model";
import { candidatureSchema, validateCandidature } from "./candidature-model";
import { candidatureDashboard, type CandidatureHistoryRow } from "./candidature-analysis";

export type Query = <T extends object = Record<string, unknown>>(statement: string, params?: (string | number | null)[]) => Promise<T[]>;
export type ExaminationStore = { query: Query; transaction: <T>(callback: (query: Query) => Promise<T>) => Promise<T> };
const numericKeys = new Set(["registered", "submitted", "absent", "missing", "withheld", "male", "female", "mean_points", "mean_marks", "qualified", "count", "sat", "highest", "lowest", "highest_points", "lowest_points", "male_mean", "female_mean", "overall_score", "score", "candidates", "average_score", "candidate_count"]);
function numericRows<T>(rows: T[]): T[] {
  return rows.map((row) => Object.fromEntries(Object.entries(row as object).map(([key, value]) => [key, value !== null && numericKeys.has(key) ? Number(value) : value])) as T);
}
function points(type: ExaminationType, column: string) {
  return `CASE ${column} ${gradesFor(type).map((grade, index, grades) => `WHEN '${grade}' THEN ${grades.length - index}`).join(" ")} ELSE NULL END`;
}
export async function offeredSubjects(query: Query, schoolId: string, yearId: string) {
  const combinations = await query<{ combination: string }>("SELECT combination FROM school_subject_combinations WHERE school_id=? AND academic_year_id=? AND is_active", [schoolId, yearId]);
  const recorded = await query<{ subject_name: string }>(`SELECT DISTINCT r.subject_name FROM performance_candidate_subjects r JOIN performance_candidates c ON c.id=r.candidate_id JOIN performance_records p ON p.id=c.performance_record_id WHERE p.school_id=? AND p.academic_year_id=?`, [schoolId, yearId]);
  const existingSubjects = await query<{ subject: string }>("SELECT DISTINCT r.subject FROM performance_subject_rows r JOIN performance_records p ON p.id=r.performance_record_id WHERE p.school_id=? AND p.academic_year_id=?", [schoolId, yearId]);
  return [...new Set([...combinations.flatMap((record) => record.combination.split(/[,;+]/).map((name) => name.trim()).filter(Boolean)), ...recorded.map((record) => record.subject_name), ...existingSubjects.map((record) => record.subject)])].sort();
}
export async function loadExamination(query: Query, filters: ExaminationFilters, access: ExaminationAccess): Promise<ExaminationDashboard> {
  if (!access.canRead) throw new Error("You do not have permission to view this school's examinations.");
  const [school] = await query<ExaminationDashboard["school"]>("SELECT id,display_name,school_code,level FROM schools WHERE id=?", [filters.schoolId]);
  if (!school) throw new Error("School not found.");
  const type = examinationForLevel(school.level);
  if (!type) throw new Error("Select a primary, junior, or senior school with a defined examination level.");
  const years = await query<{ id: string; name: string }>("SELECT id,name FROM academic_years ORDER BY name DESC");
  const year = years.find((item) => item.id === filters.academicYearId);
  if (!year) throw new Error("Academic year not found.");
  const [record] = await query<{ id: string; degree_threshold: string; notes: string | null }>("SELECT id,degree_threshold,notes FROM performance_records WHERE school_id=? AND academic_year_id=? AND examination_type=?", [school.id, year.id, type]);
  const threshold = record?.degree_threshold ?? "C+";
  const bulkRows = await query<CandidatureHistoryRow>(`SELECT b.summary_json,b.updated_at,y.id AS year_id,y.name AS year FROM performance_candidature_summaries b JOIN performance_records p ON p.id=b.performance_record_id JOIN academic_years y ON y.id=p.academic_year_id WHERE p.school_id=? AND p.examination_type=? ORDER BY y.name`, [school.id, type]);
  const bulk = candidatureDashboard({ school, examinationType: type, access, yearId: year.id, yearName: year.name, years, degreeThreshold: threshold, availableSubjects: await offeredSubjects(query, school.id, year.id) }, bulkRows, filters);
  const [category] = await query<{ gender_type: string | null }>("SELECT gender_type FROM schools WHERE id=?", [school.id]);
  if (bulk) return { ...bulk, schoolGender: category?.gender_type };
  const thresholdPoints = gradesFor("KCSE").length - gradesFor("KCSE").indexOf(threshold);
  const conditions = ["p.school_id=?", "p.examination_type=?"];
  const params: (string | number | null)[] = [school.id, type];
  if (filters.gender && filters.gender !== "all") { conditions.push("c.gender=?"); params.push(filters.gender); }
  if (filters.subject) { conditions.push("EXISTS (SELECT 1 FROM performance_candidate_subjects f WHERE f.candidate_id=c.id AND f.subject_code=?)"); params.push(filters.subject); }
  if (filters.grade) {
    if (!gradesFor(type).includes(filters.grade)) throw new Error("Invalid examination grade filter.");
    if (type === "KCSE" && !filters.subject) { conditions.push("c.overall_grade=? AND c.status='submitted'"); params.push(filters.grade); }
    else { conditions.push(`EXISTS (SELECT 1 FROM performance_candidate_subjects f WHERE f.candidate_id=c.id AND f.grade=? AND f.status='submitted'${filters.subject ? " AND f.subject_code=?" : ""})`); params.push(filters.grade); if (filters.subject) params.push(filters.subject); }
  }
  const cte = (includeYear: boolean) => `WITH selected AS (SELECT c.*,p.academic_year_id,p.examination_type FROM performance_candidates c JOIN performance_records p ON p.id=c.performance_record_id WHERE ${conditions.join(" AND ")}${includeYear ? " AND p.academic_year_id=?" : ""}) `;
  const selectedParams = [...params, year.id];
  const overallPoints = points(type, "c.overall_grade");
  const summaryColumns = `COUNT(*) AS registered,
    SUM(CASE WHEN c.status='submitted' THEN 1 ELSE 0 END) AS submitted,
    SUM(CASE WHEN c.status='absent' THEN 1 ELSE 0 END) AS absent,
    SUM(CASE WHEN c.status='missing' THEN 1 ELSE 0 END) AS missing,
    SUM(CASE WHEN c.status='withheld' THEN 1 ELSE 0 END) AS withheld,
    SUM(CASE WHEN c.gender='male' THEN 1 ELSE 0 END) AS male,
    SUM(CASE WHEN c.gender='female' THEN 1 ELSE 0 END) AS female,
    ${type === "KCSE" ? `AVG(CASE WHEN c.status='submitted' THEN ${overallPoints} END)` : "NULL"} AS mean_points,
    ${type === "KCSE" ? "AVG(CASE WHEN c.status='submitted' THEN c.overall_score END)" : "NULL"} AS mean_marks,
    SUM(CASE WHEN c.status='submitted' AND ${type === "KCSE" ? `${overallPoints}>=${thresholdPoints}` : "1=0"} THEN 1 ELSE 0 END) AS qualified`;
  const rows = async <T extends object>(statement: string, values = selectedParams) => numericRows(await query<T>(statement, values));
  const [summary] = await rows<Metric>(cte(true) + `SELECT ${summaryColumns} FROM selected c`);
  for (const key of ["registered", "submitted", "absent", "missing", "withheld", "male", "female", "qualified"] as const) summary[key] ??= 0;
  const subjectWhere = filters.subject ? "WHERE r.subject_code=?" : "";
  const subjectParams = filters.subject ? [...selectedParams, filters.subject] : selectedParams;
  const subjectPoints = points(type, "r.grade");
  const validResult = "r.status='submitted' AND c.status NOT IN ('absent','withheld')";
  const [subjects, gender, distribution, subjectGrades, trends, availableSubjects] = await Promise.all([
    rows<ExaminationDashboard["subjects"][number]>(cte(true) + `SELECT r.subject_code,r.subject_name,COUNT(*) AS registered,
      SUM(CASE WHEN ${validResult} THEN 1 ELSE 0 END) AS sat,
      SUM(CASE WHEN c.status='absent' OR (c.status<>'withheld' AND r.status='absent') THEN 1 ELSE 0 END) AS absent,
      SUM(CASE WHEN c.status<>'absent' AND (c.status='withheld' OR r.status IN ('missing','withheld')) THEN 1 ELSE 0 END) AS missing,
      AVG(CASE WHEN ${validResult} THEN ${subjectPoints} END) AS mean_points,
      AVG(CASE WHEN ${validResult} THEN r.score END) AS mean_marks,
      MAX(CASE WHEN ${validResult} THEN r.score END) AS highest,MIN(CASE WHEN ${validResult} THEN r.score END) AS lowest,
      MAX(CASE WHEN ${validResult} THEN ${subjectPoints} END) AS highest_points,MIN(CASE WHEN ${validResult} THEN ${subjectPoints} END) AS lowest_points,
      AVG(CASE WHEN ${validResult} AND c.gender='male' THEN ${subjectPoints} END) AS male_mean,
      AVG(CASE WHEN ${validResult} AND c.gender='female' THEN ${subjectPoints} END) AS female_mean
      FROM selected c JOIN performance_candidate_subjects r ON r.candidate_id=c.id ${subjectWhere} GROUP BY r.subject_code,r.subject_name ORDER BY mean_points DESC`, subjectParams),
    rows<Metric & { gender: string }>(cte(true) + `SELECT c.gender,${summaryColumns} FROM selected c GROUP BY c.gender`),
    type === "KCSE" && !filters.subject
      ? rows<ExaminationDashboard["distribution"][number]>(cte(true) + "SELECT c.overall_grade AS grade,c.gender,COUNT(*) AS count FROM selected c WHERE c.status='submitted' AND c.overall_grade IS NOT NULL GROUP BY c.overall_grade,c.gender")
      : rows<ExaminationDashboard["distribution"][number]>(cte(true) + `SELECT r.grade,c.gender,COUNT(*) AS count FROM selected c JOIN performance_candidate_subjects r ON r.candidate_id=c.id WHERE ${validResult} AND r.grade IS NOT NULL${filters.subject ? " AND r.subject_code=?" : ""} GROUP BY r.grade,c.gender`, subjectParams),
    rows<ExaminationDashboard["subjectGrades"][number]>(cte(true) + `SELECT r.subject_code,r.grade,COUNT(*) AS count FROM selected c JOIN performance_candidate_subjects r ON r.candidate_id=c.id WHERE ${validResult} AND r.grade IS NOT NULL${filters.subject ? " AND r.subject_code=?" : ""} GROUP BY r.subject_code,r.grade`, subjectParams),
    type === "KCSE" && !filters.subject
      ? rows<Metric & { year: string }>(cte(false) + `SELECT y.name AS year,${summaryColumns} FROM selected c JOIN academic_years y ON y.id=c.academic_year_id GROUP BY y.name ORDER BY y.name`, params)
      : rows<Metric & { year: string }>(cte(false) + `SELECT y.name AS year,r.subject_code,COUNT(*) AS registered,SUM(CASE WHEN ${validResult} THEN 1 ELSE 0 END) AS submitted,AVG(CASE WHEN ${validResult} THEN ${subjectPoints} END) AS mean_points,AVG(CASE WHEN ${validResult} THEN r.score END) AS mean_marks FROM selected c JOIN academic_years y ON y.id=c.academic_year_id JOIN performance_candidate_subjects r ON r.candidate_id=c.id${filters.subject ? " WHERE r.subject_code=?" : ""} GROUP BY y.name,r.subject_code ORDER BY y.name`, filters.subject ? [...params, filters.subject] : params),
    offeredSubjects(query, school.id, year.id),
  ]);
  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const pageSize = Math.min(500, Math.max(1, Math.floor(filters.pageSize ?? 25)));
  let candidates: Candidate[] = [];
  let candidateCount = 0;
  if (access.canViewCandidates) {
    const search = (filters.search ?? "").trim().slice(0, 100).toLowerCase();
    const searchSql = search ? " WHERE LOWER(c.candidate_name) LIKE ? OR LOWER(c.examination_number) LIKE ?" : "";
    const candidateParams = search ? [...selectedParams, `%${search}%`, `%${search}%`] : selectedParams;
    const [count] = await rows<{ candidate_count: number }>(cte(true) + "SELECT COUNT(*) AS candidate_count FROM selected c" + searchSql, candidateParams);
    candidateCount = count.candidate_count;
    candidates = await rows<Candidate>(cte(true) + `SELECT c.* FROM selected c${searchSql} ORDER BY ${points(type, "c.overall_grade")} ${filters.order === "asc" ? "ASC" : "DESC"},c.examination_number LIMIT ? OFFSET ?`, [...candidateParams, pageSize, (page - 1) * pageSize]);
    if (candidates.length) {
      const resultRows = await rows<Candidate["subjects"][number] & { candidate_id: string }>(`SELECT candidate_id,subject_code,subject_name,status,grade,score FROM performance_candidate_subjects WHERE candidate_id IN (${candidates.map(() => "?").join(",")}) ORDER BY subject_name`, candidates.map((candidate) => candidate.id));
      candidates.forEach((candidate) => { candidate.cohort = year.name; candidate.subjects = resultRows.filter((result) => result.candidate_id === candidate.id); });
    }
  }
  const [updated] = await query<{ updated_at: string | null }>(cte(true) + "SELECT MAX(c.updated_at) AS updated_at FROM selected c", selectedParams);
  const historyParams = filters.subject ? [...params, filters.subject] : params;
  const subjectHistory = await rows<ExaminationDashboard["subjectHistory"][number]>(cte(false) + `SELECT y.name AS year,r.subject_code,COUNT(*) AS registered,SUM(CASE WHEN ${validResult} THEN 1 ELSE 0 END) AS submitted,AVG(CASE WHEN ${validResult} THEN ${subjectPoints} END) AS mean_points,AVG(CASE WHEN ${validResult} THEN r.score END) AS mean_marks FROM selected c JOIN academic_years y ON y.id=c.academic_year_id JOIN performance_candidate_subjects r ON r.candidate_id=c.id${filters.subject ? " WHERE r.subject_code=?" : ""} GROUP BY y.name,r.subject_code ORDER BY y.name`, historyParams);
  for (const subject of subjects) {
    const previous = subjectHistory.filter((row) => row.subject_code === subject.subject_code && row.year < year.name).sort((a, b) => b.year.localeCompare(a.year))[0];
    subject.previous_year = previous?.year;
    subject.previous_points = previous?.mean_points ?? null;
  }
  const genderHistory = type === "KCSE" || !filters.subject
    ? await rows<ExaminationDashboard["genderHistory"][number]>(cte(false) + `SELECT y.name AS year,c.gender,COUNT(*) AS registered,SUM(CASE WHEN c.status='submitted' THEN 1 ELSE 0 END) AS submitted,${type === "KCSE" ? `AVG(CASE WHEN c.status='submitted' THEN ${overallPoints} END)` : "NULL"} AS mean_points FROM selected c JOIN academic_years y ON y.id=c.academic_year_id GROUP BY y.name,c.gender ORDER BY y.name`, params)
    : await rows<ExaminationDashboard["genderHistory"][number]>(cte(false) + `SELECT y.name AS year,c.gender,COUNT(*) AS registered,SUM(CASE WHEN ${validResult} THEN 1 ELSE 0 END) AS submitted,AVG(CASE WHEN ${validResult} THEN ${subjectPoints} END) AS mean_points FROM selected c JOIN academic_years y ON y.id=c.academic_year_id JOIN performance_candidate_subjects r ON r.candidate_id=c.id WHERE r.subject_code=? GROUP BY y.name,c.gender ORDER BY y.name`, historyParams);
  const gradeHistory = type === "KCSE" && !filters.subject
    ? await rows<ExaminationDashboard["gradeHistory"][number]>(cte(false) + "SELECT y.name AS year,c.overall_grade AS grade,COUNT(*) AS count FROM selected c JOIN academic_years y ON y.id=c.academic_year_id WHERE c.status='submitted' AND c.overall_grade IS NOT NULL GROUP BY y.name,c.overall_grade", params)
    : await rows<ExaminationDashboard["gradeHistory"][number]>(cte(false) + `SELECT y.name AS year,r.grade,COUNT(*) AS count FROM selected c JOIN academic_years y ON y.id=c.academic_year_id JOIN performance_candidate_subjects r ON r.candidate_id=c.id WHERE ${validResult} AND r.grade IS NOT NULL${filters.subject ? " AND r.subject_code=?" : ""} GROUP BY y.name,r.grade`, historyParams);
  const subjectOptions = await query<{ subject_code: string; subject_name: string }>("SELECT DISTINCT r.subject_code,r.subject_name FROM performance_candidate_subjects r JOIN performance_candidates c ON c.id=r.candidate_id JOIN performance_records p ON p.id=c.performance_record_id WHERE p.school_id=? AND p.academic_year_id=? AND p.examination_type=? ORDER BY r.subject_name", [school.id, year.id, type]);
  if (type !== "KCSE" && filters.subject) {
    const subjectGender = await rows<{ gender: string; mean_points: number | null; mean_marks: number | null }>(cte(true) + `SELECT c.gender,AVG(CASE WHEN ${validResult} THEN ${subjectPoints} END) AS mean_points,AVG(CASE WHEN ${validResult} THEN r.score END) AS mean_marks FROM selected c JOIN performance_candidate_subjects r ON r.candidate_id=c.id WHERE r.subject_code=? GROUP BY c.gender`, subjectParams);
    for (const item of gender) Object.assign(item, subjectGender.find((value) => value.gender === item.gender));
  }
  const [olderSummary] = await rows<NonNullable<ExaminationDashboard["legacySummary"]>>("SELECT candidates,average_score,assessment_name FROM performance_records WHERE school_id=? AND academic_year_id=? AND examination_type IS NULL AND UPPER(assessment_name)=? ORDER BY captured_at DESC LIMIT 1", [school.id, year.id, type]);
  let legacySummary = olderSummary;
  try { const saved = JSON.parse(record?.notes ?? "null")?.scsmsLegacyExaminationSummary; if (saved && typeof saved.candidates === "number" && typeof saved.assessment_name === "string") legacySummary = saved; } catch { /* Ordinary assessment notes are preserved. */ }
  return { school, schoolGender: category?.gender_type, examinationType: type, access, yearId: year.id, yearName: year.name, years,
    degreeThreshold: threshold, lastUpdated: updated.updated_at, summary, distribution, subjects, subjectGrades, gender, trends, subjectHistory, genderHistory, gradeHistory,
    cohorts: [year.name], availableSubjects, subjectOptions, candidates, candidateCount, page, pageSize,
    legacySummary: legacySummary ?? null };
}

export async function saveExamination(store: ExaminationStore, input: ExaminationSaveInput, access: ExaminationAccess) {
  if (!access.canWrite) throw new Error("You do not have permission to edit this school's examination results.");
  const [school] = await store.query<{ level: string; gender_type: string }>("SELECT level,gender_type FROM schools WHERE id=?", [input.schoolId]);
  const type = school && examinationForLevel(school.level);
  if (!type) throw new Error("School examination level is unavailable.");
  if (input.candidate && ((school.gender_type === "boys" && input.candidate.gender === "female") || (school.gender_type === "girls" && input.candidate.gender === "male"))) throw new Error("Candidate gender does not match this school's category.");
  const [year] = await store.query<{ id: string; name: string }>("SELECT id,name FROM academic_years WHERE id=?", [input.academicYearId]);
  if (!year) throw new Error("Academic year not found.");
  if (input.candidature && input.candidate) throw new Error("Save bulk candidature separately from individual results.");
  if (input.candidature) validateCandidature(input.candidature, type, await offeredSubjects(store.query, input.schoolId, input.academicYearId), school.gender_type);
  validateCandidate(input, type, await offeredSubjects(store.query, input.schoolId, input.academicYearId));
  if (input.candidate) {
    const existing = await store.query<{ subject_code: string; subject_name: string }>("SELECT DISTINCT r.subject_code,r.subject_name FROM performance_candidate_subjects r JOIN performance_candidates c ON c.id=r.candidate_id JOIN performance_records p ON p.id=c.performance_record_id WHERE p.school_id=? AND p.academic_year_id=? AND p.examination_type=?", [input.schoolId, input.academicYearId, type]);
    for (const subject of input.candidate.subjects) {
      if (existing.some((row) => row.subject_code.toUpperCase() === subject.subjectCode.toUpperCase() && row.subject_name.toLowerCase() !== subject.subjectName.toLowerCase())) throw new Error(`Subject code ${subject.subjectCode} is already assigned to another subject in this examination.`);
    }
  }
  await store.transaction(async (query) => {
    const typed = await query("SELECT id FROM performance_records WHERE school_id=? AND academic_year_id=? AND examination_type=?", [input.schoolId, input.academicYearId, type]);
    if (!typed.length) {
      const legacy = await query<{ id: string; notes: string | null; candidates: number; average_score: number | null; assessment_name: string }>("SELECT id,notes,candidates,average_score,assessment_name FROM performance_records WHERE school_id=? AND academic_year_id=? AND examination_type IS NULL AND assessment_type='national' AND term_id IS NULL AND UPPER(assessment_name)=? LIMIT 2", [input.schoolId, input.academicYearId, type]);
      if (legacy.length === 1) {
        const old = legacy[0];
        const notes = JSON.stringify({ originalNotes: old.notes, scsmsLegacyExaminationSummary: { candidates: Number(old.candidates), average_score: old.average_score, assessment_name: old.assessment_name } });
        await query("UPDATE performance_records SET examination_type=?,degree_threshold=?,notes=? WHERE id=? AND examination_type IS NULL", [type, input.degreeThreshold, notes, old.id]);
      }
    }
    const proposedId = crypto.randomUUID();
    await query(`INSERT INTO performance_records(id,school_id,academic_year_id,assessment_name,assessment_type,examination_type,degree_threshold,grade_band) VALUES (?,?,?,?,'national',?,?,?) ON CONFLICT(school_id,academic_year_id,examination_type) DO UPDATE SET degree_threshold=excluded.degree_threshold`, [proposedId, input.schoolId, input.academicYearId, type, type, input.degreeThreshold, type === "KCSE" ? "Form 4" : type === "KJSEA" ? "Grade 9" : "Grade 6"]);
    const [record] = await query<{ id: string }>("SELECT id FROM performance_records WHERE school_id=? AND academic_year_id=? AND examination_type=?", [input.schoolId, input.academicYearId, type]);
    if (input.candidature) await query("INSERT INTO performance_candidature_summaries(id,performance_record_id,summary_json,updated_at) VALUES (?,?,?,?) ON CONFLICT(performance_record_id) DO UPDATE SET summary_json=excluded.summary_json,updated_at=excluded.updated_at", [crypto.randomUUID(), record.id, JSON.stringify(input.candidature), new Date().toISOString()]);
    const candidate = input.candidate;
    if (candidate) {
    await query(`INSERT INTO performance_candidates(id,performance_record_id,examination_number,candidate_name,gender,cohort,status,overall_grade,overall_score,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(performance_record_id,examination_number) DO UPDATE SET candidate_name=excluded.candidate_name,gender=excluded.gender,cohort=excluded.cohort,status=excluded.status,overall_grade=excluded.overall_grade,overall_score=excluded.overall_score,updated_at=excluded.updated_at`, [crypto.randomUUID(), record.id, candidate.examinationNumber, candidate.candidateName, candidate.gender, year.name, candidate.status, candidate.overallGrade, candidate.overallScore, new Date().toISOString()]);
    const [saved] = await query<{ id: string }>("SELECT id FROM performance_candidates WHERE performance_record_id=? AND examination_number=?", [record.id, candidate.examinationNumber]);
    await query("DELETE FROM performance_candidate_subjects WHERE candidate_id=?", [saved.id]);
    for (const subject of candidate.subjects) {
      await query("INSERT INTO performance_candidate_subjects(id,candidate_id,subject_code,subject_name,status,grade,score) VALUES (?,?,?,?,?,?,?)", [crypto.randomUUID(), saved.id, subject.subjectCode, subject.subjectName, subject.status, subject.grade, subject.score]);
    }
    }
    const threshold = gradesFor("KCSE").length - gradesFor("KCSE").indexOf(input.degreeThreshold);
    await query(`UPDATE performance_records SET candidates=(SELECT COUNT(*) FROM performance_candidates WHERE performance_record_id=?),
      average_score=${type === "KCSE" ? "(SELECT AVG(overall_score) FROM performance_candidates WHERE performance_record_id=? AND status='submitted')" : "NULL"},
      pass_rate=${type === "KCSE" ? `(SELECT 100.0*SUM(CASE WHEN ${points("KCSE", "c.overall_grade")}>=${threshold} THEN 1 ELSE 0 END)/NULLIF(COUNT(*),0) FROM performance_candidates c WHERE performance_record_id=? AND status='submitted')` : "NULL"}
      WHERE id=?`, [record.id, ...(type === "KCSE" ? [record.id, record.id] : []), record.id]);
    const [bulkRow] = await query<{ summary_json: string }>("SELECT summary_json FROM performance_candidature_summaries WHERE performance_record_id=?", [record.id]);
    if (bulkRow) {
      const value = candidatureSchema.parse(JSON.parse(bulkRow.summary_json));
      const submitted = value.male.submitted + value.female.submitted;
      const qualified = type === "KCSE" ? value.overallGrades.filter((row) => (gradesFor(type).length - gradesFor(type).indexOf(row.grade)) >= threshold).reduce((sum, row) => sum + row.male + row.female, 0) : 0;
      await query("UPDATE performance_records SET candidates=?,average_score=NULL,pass_rate=? WHERE id=?", [value.male.registered + value.female.registered, type === "KCSE" && submitted ? 100 * qualified / submitted : null, record.id]);
    }
  });
}
