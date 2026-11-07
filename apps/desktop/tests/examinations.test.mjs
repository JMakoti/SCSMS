import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";

const featureRequire = createRequire(new URL("../../../packages/features/package.json", import.meta.url));
function load(file, modules = {}) {
  const exports = {};
  const source = readFileSync(new URL(`../../../packages/features/examinations/${file}.ts`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const evaluate = vm.runInThisContext(`(function(exports,require,crypto,Blob){${compiled}\n})`);
  evaluate(exports, (name) => { assert.ok(modules[name], name); return modules[name]; }, globalThis.crypto, globalThis.Blob);
  return exports;
}
const modelReference = {};
const candidatureModel = load("candidature-model", { zod: featureRequire("zod"), "./model": modelReference });
const model = load("model", { zod: featureRequire("zod"), "./candidature-model": candidatureModel });
Object.assign(modelReference, model);
const candidatureAnalysis = load("candidature-analysis", { "./model": model, "./candidature-model": candidatureModel });
const service = load("service", { "./model": model, "./candidature-model": candidatureModel, "./candidature-analysis": candidatureAnalysis });
const analysis = load("analysis", { "./model": model });
const fullAccess = { canRead: true, canWrite: true, canViewCandidates: true };
const summaryAccess = { canRead: true, canWrite: false, canViewCandidates: false };
function fixture(level = "senior") {
  const db = new DatabaseSync(":memory:");
  db.exec(`PRAGMA foreign_keys=ON;
    CREATE TABLE schools(id TEXT PRIMARY KEY,display_name TEXT,school_code TEXT,level TEXT,gender_type TEXT);
    CREATE TABLE academic_years(id TEXT PRIMARY KEY,name TEXT);
    CREATE TABLE school_subject_combinations(id TEXT PRIMARY KEY,school_id TEXT,academic_year_id TEXT,combination TEXT,is_active INTEGER);
    CREATE TABLE performance_records(id TEXT PRIMARY KEY,school_id TEXT,academic_year_id TEXT,assessment_name TEXT,assessment_type TEXT,term_id TEXT,grade_band TEXT,candidates INTEGER DEFAULT 0,average_score REAL,pass_rate REAL,status TEXT DEFAULT 'draft',captured_at TEXT DEFAULT CURRENT_TIMESTAMP,notes TEXT);
    CREATE TABLE performance_subject_rows(id TEXT PRIMARY KEY,performance_record_id TEXT,subject TEXT,candidates INTEGER,average_score REAL,pass_rate REAL);
    INSERT INTO schools VALUES ('one','Selected School','001','${level}','mixed'),('two','Other School','002','${level}','mixed');
    INSERT INTO academic_years VALUES ('2026','2026'),('2025','2025');
    INSERT INTO school_subject_combinations VALUES ('subjects','one','2026','English, Mathematics, Biology',1),('previous','one','2025','English, Mathematics',1),('other','two','2026','English',1);`);
  db.exec(readFileSync(new URL("../../../database/drizzle/sqlite/0007_messy_mysterio.sql", import.meta.url), "utf8"));
  db.exec(readFileSync(new URL("../../../database/drizzle/sqlite/0008_needy_orphan.sql", import.meta.url), "utf8"));
  const query = async (statement, params = []) => db.prepare(statement).all(...params);
  const store = { query, transaction: async (callback) => {
    db.exec("BEGIN");
    try { const result = await callback(query); db.exec("COMMIT"); return result; }
    catch (error) { db.exec("ROLLBACK"); throw error; }
  } };
  return { db, store, save: async (input) => service.saveExamination(store, model.examinationSaveSchema.parse(input), fullAccess),
    dashboard: (filters = {}, access = fullAccess) => service.loadExamination(query, { schoolId: "one", academicYearId: "2026", ...filters }, access) };
}
function input(number, grade = "C+", extra = {}) {
  return { schoolId: "one", academicYearId: "2026", degreeThreshold: "C+", candidate: {
    examinationNumber: number, candidateName: `Candidate ${number}`, gender: "male", cohort: "Form 4", status: "submitted", overallGrade: grade, overallScore: null,
    subjects: [{ subjectCode: "101", subjectName: "English", status: "submitted", grade, score: 0 }], ...extra,
  } };
}

function bulkInput() {
  const attendance = (registered, present, submitted) => ({ registered, present, absent: registered - present, submitted, withheld: 0, reasons: registered > present ? [{ reason: "Illness", count: registered - present }] : [] });
  return { schoolId: "one", academicYearId: "2026", degreeThreshold: "C+", candidate: null, candidature: {
    examinationNumber: " centre-001 ", male: attendance(10, 8, 8), female: attendance(8, 7, 7),
    overallGrades: [{ grade: "C+", male: 6, female: 4 }, { grade: "C", male: 2, female: 3 }],
    subjects: [{ subjectCode: "101", subjectName: "English", male: attendance(10, 8, 8), female: attendance(8, 7, 7), grades: [{ grade: "C+", male: 6, female: 4 }, { grade: "C", male: 2, female: 3 }] },
      { subjectCode: "231", subjectName: "Biology", male: attendance(4, 3, 3), female: attendance(3, 3, 3), grades: [{ grade: "A", male: 1, female: 2 }, { grade: "E", male: 2, female: 1 }] }],
  } };
}

test("reopening bulk entries restores every editable grade and level without losing saved counts", async () => {
  const app = fixture(); const input = bulkInput();
  await app.save(input);
  const saved = (await app.dashboard()).candidature;
  const draft = candidatureModel.candidatureDraft("KCSE", saved);
  assert.deepEqual(draft.overallGrades.map((row) => row.grade), model.kcseGrades);
  assert.equal(draft.overallGrades.find((row) => row.grade === "C+").male, 6);
  assert.equal(draft.overallGrades.find((row) => row.grade === "A").male, 0);
  assert.equal(draft.subjects[1].grades.length, 12);
  draft.overallGrades.find((row) => row.grade === "C+").male -= 1;
  draft.overallGrades.find((row) => row.grade === "A").male += 1;
  draft.subjects[1].grades.find((row) => row.grade === "E").male -= 1;
  draft.subjects[1].grades.find((row) => row.grade === "B").male += 1;
  await app.save({ ...input, candidature: draft });
  const updated = await app.dashboard();
  assert.equal(updated.distribution.find((row) => row.grade === "A" && row.gender === "male").count, 1);
  assert.equal(updated.subjectGrades.find((row) => row.subject_code === "231" && row.grade === "B").count, 1);
  assert.equal(saved.overallGrades.find((row) => row.grade === "C+").male, 6);
  for (const type of ["KJSEA", "KPSEA"]) {
    const sparse = structuredClone(saved); sparse.overallGrades = []; sparse.subjects[0].grades = [];
    assert.deepEqual(candidatureModel.candidatureDraft(type, sparse).subjects[0].grades.map((row) => row.grade), model.gradesFor(type));
    assert.deepEqual(candidatureModel.candidatureDraft(type, sparse).overallGrades, []);
  }
});

test("bulk candidature stores centre number, gender attendance and absence reasons without generating candidates", async () => {
  const app = fixture();
  await app.save(input("legacy"));
  await app.save(bulkInput());
  const data = await app.dashboard();
  assert.equal(data.candidature.examinationNumber, "CENTRE-001");
  assert.equal(data.summary.registered, 18);
  assert.equal(data.summary.absent, 3);
  assert.equal(data.summary.submitted, 15);
  assert.equal(data.summary.qualified, 10);
  assert.equal(data.summary.mean_points, 100 / 15);
  assert.equal(data.candidature.male.reasons[0].count, 2);
  assert.equal(data.candidates.length, 0);
  assert.equal(app.db.prepare("SELECT COUNT(*) n FROM performance_candidates").get().n, 1);
  assert.equal(app.db.prepare("SELECT candidates FROM performance_records").get().candidates, 18);
  await app.save({ ...bulkInput(), degreeThreshold: "A" });
  assert.equal((await app.dashboard()).summary.qualified, 0);
  assert.equal(app.db.prepare("SELECT COUNT(*) n FROM performance_candidature_summaries").get().n, 1);
});

test("elective subjects retain their own male/female candidature and denominators", async () => {
  const app = fixture(); await app.save(bulkInput());
  const all = await app.dashboard();
  const subject = all.subjects.find((row) => row.subject_code === "231");
  assert.equal(subject.registered, 7); assert.equal(subject.sat, 6); assert.equal(subject.absent, 1);
  assert.equal(subject.mean_points, 6.5);
  const filtered = await app.dashboard({ subject: "231", gender: "female" });
  assert.equal(filtered.summary.registered, 3); assert.equal(filtered.summary.submitted, 3);
  assert.equal(filtered.distribution.reduce((sum, row) => sum + row.count, 0), 3);
  assert.equal(filtered.summary.qualified, 0); // No invented cross-tabulation of elective candidates' overall grades.
  await assert.rejects(app.dashboard({ grade: "A" }), /Clear candidate-level filters/);
});

test("bulk validates balanced attendance, reasons, subject subsets and official grade totals before writing", async () => {
  const app = fixture();
  const badAttendance = bulkInput(); badAttendance.candidature.male.present = 9;
  await assert.rejects(app.save(badAttendance), /Present plus absent/);
  const noReasons = bulkInput(); noReasons.candidature.male.reasons = [];
  await assert.rejects(app.save(noReasons), /Absence reasons/);
  const oversizedSubject = bulkInput(); oversizedSubject.candidature.subjects[1].male = { registered: 11, present: 11, absent: 0, submitted: 3, withheld: 0, reasons: [] };
  await assert.rejects(app.save(oversizedSubject), /cannot exceed/);
  const wrongGrades = bulkInput(); wrongGrades.candidature.overallGrades[0].male = 5;
  await assert.rejects(app.save(wrongGrades), /Grade counts/);
  const wrongSubject = bulkInput(); wrongSubject.candidature.subjects[1].subjectName = "Unconfigured elective";
  await assert.rejects(app.save(wrongSubject), /offered/);
  assert.equal(app.db.prepare("SELECT COUNT(*) n FROM performance_records").get().n, 0);
});

test("bulk school gender restrictions and partial pending results are enforced", async () => {
  const app = fixture(); app.db.exec("UPDATE schools SET gender_type='boys' WHERE id='one'");
  await assert.rejects(app.save(bulkInput()), /gender/);
  const value = bulkInput(); value.candidature.female = candidatureModel.emptyAttendance();
  value.candidature.overallGrades.forEach((row) => row.female = 0);
  value.candidature.subjects.forEach((subject) => { subject.female = candidatureModel.emptyAttendance(); subject.grades.forEach((row) => row.female = 0); });
  value.candidature.male.submitted = 0; value.candidature.overallGrades = [];
  await app.save(value);
  const data = await app.dashboard(); assert.equal(data.summary.missing, 8); assert.equal(data.summary.absent, 2); assert.equal(data.summary.mean_points, null);
});

test("bulk CBC assessments report selected learning areas without a combined mean", async () => {
  for (const level of ["junior", "primary"]) {
    const app = fixture(level); const value = bulkInput(); value.candidature.overallGrades = [];
    value.candidature.subjects.forEach((subject) => subject.grades.forEach((row, index) => row.grade = level === "junior" ? ["EE1", "BE2"][index] : ["EE", "BE"][index]));
    await app.save(value);
    assert.equal((await app.dashboard()).summary.mean_points, null);
    const subject = await app.dashboard({ subject: "231" }); assert.ok(subject.summary.mean_points > 0);
    assert.equal(subject.summary.qualified, 0);
  }
});

test("bulk histories stay within the school and use recorded comparable years", async () => {
  const app = fixture(); const previous = bulkInput(); previous.academicYearId = "2025"; previous.candidature.subjects = [previous.candidature.subjects[0]];
  await app.save(previous); await app.save(bulkInput());
  const other = bulkInput(); other.schoolId = "two"; other.candidature.subjects = [other.candidature.subjects[0]]; await app.save(other);
  const data = await app.dashboard(); assert.equal(data.trends.length, 2); assert.equal(data.trends.find((row) => row.year === "2025").registered, 18);
  assert.equal(data.subjects.find((row) => row.subject_code === "101").previous_year, "2025");
  assert.equal(data.subjects.find((row) => row.subject_code === "231").previous_points, null);
});

test("bulk save rolls back the whole metadata write when persistence fails", async () => {
  const app = fixture(); app.db.exec("CREATE TRIGGER reject_bulk BEFORE INSERT ON performance_candidature_summaries BEGIN SELECT RAISE(ABORT,'test failure'); END");
  await assert.rejects(app.save(bulkInput()), /test failure/);
  assert.equal(app.db.prepare("SELECT COUNT(*) n FROM performance_records").get().n, 0);
});
test("school level determines examination and assessment scales remain independent", () => {
  assert.equal(model.examinationForLevel("senior"), "KCSE");
  assert.equal(model.examinationForLevel("JUNIOR_SECONDARY"), "KJSEA");
  assert.equal(model.examinationForLevel("PRIMARY"), "KPSEA");
  assert.equal(model.gradePoints("KCSE", "C+"), 7);
  assert.equal(model.gradePoints("KJSEA", "EE1"), 8);
  assert.equal(model.gradePoints("KPSEA", "EE"), 4);
  assert.equal(model.gradePoints("KJSEA", "A"), null);
});
test("candidate access requires an explicit school grant or authorised area", () => {
  assert.equal(model.mayAccessExamination([], "one", true).canRead, false);
  assert.equal(model.mayAccessExamination(["performance:read"], "one", false).canRead, false);
  assert.equal(model.mayAccessExamination(["performance:read"], "one", true).canViewCandidates, false);
  assert.equal(model.mayAccessExamination(["performance:school:one:candidates"], "two", true).canRead, false);
  assert.equal(model.mayAccessExamination(["performance:school:one:candidates"], "one", false).canViewCandidates, true);
});
test("dashboard never includes another school or examination type", async () => {
  const app = fixture();
  await app.save(input("001", "A"));
  await app.save({ ...input("002", "E"), schoolId: "two" });
  app.db.exec("INSERT INTO performance_records(id,school_id,academic_year_id,assessment_name,assessment_type,examination_type) VALUES ('other-exam','one','2026','KPSEA','national','KPSEA'); INSERT INTO performance_candidates(id,performance_record_id,examination_number,candidate_name,gender,status,updated_at) VALUES ('foreign','other-exam','999','Wrong examination','female','missing','2026-01-01');");
  const data = await app.dashboard();
  assert.equal(data.summary.registered, 1);
  assert.equal(data.summary.mean_points, 12);
  assert.equal(data.candidates[0].examination_number, "001");
});
test("registration upsert prevents duplicate candidates and submitted zero marks remain real", async () => {
  const app = fixture();
  await app.save(input("001")); await app.save(input("001", "A-"));
  const data = await app.dashboard();
  assert.equal(data.summary.registered, 1);
  assert.equal(data.subjects[0].mean_marks, 0);
  assert.equal(data.subjects[0].mean_points, 11);
  assert.equal(data.candidates[0].overall_grade, "A-");
});
test("missing and absent registrations are distinct and excluded from means", async () => {
  const app = fixture();
  await app.save(input("001", "C+"));
  await app.save(input("002", null, { status: "absent", subjects: [{ subjectCode: "101", subjectName: "English", status: "absent", grade: null, score: null }] }));
  await app.save(input("003", null, { status: "missing", subjects: [{ subjectCode: "101", subjectName: "English", status: "missing", grade: null, score: null }] }));
  const data = await app.dashboard();
  assert.equal(data.summary.registered, 3); assert.equal(data.summary.submitted, 1);
  assert.equal(data.summary.absent, 1); assert.equal(data.summary.missing, 1);
  assert.equal(data.summary.mean_points, 7); assert.equal(data.subjects[0].sat, 1);
  assert.equal(data.subjects[0].absent, 1); assert.equal(data.subjects[0].missing, 1);
});
test("degree threshold uses exact candidate mean grades, including configurable thresholds", async () => {
  const app = fixture();
  for (const [number, grade] of [["1","C+"],["2","C"],["3","A"],["4","C-"]]) await app.save(input(number, grade));
  let data = await app.dashboard();
  assert.equal(data.summary.qualified, 2);
  assert.equal(analysis.qualifies(data, "C"), false);
  await app.save({ schoolId: "one", academicYearId: "2026", degreeThreshold: "B", candidate: null });
  data = await app.dashboard(); assert.equal(data.summary.qualified, 1);
});
test("gender, subject, grade, examination year and candidate search filters are scoped", async () => {
  const app = fixture();
  await app.save(input("001", "A", { gender: "female", cohort: "East" }));
  await app.save(input("002", "C", { cohort: "West" }));
  await app.save({ ...input("003", "E"), academicYearId: "2025" });
  assert.equal((await app.dashboard({ gender: "female", subject: "101", grade: "A" })).summary.registered, 1);
  assert.equal((await app.dashboard({ academicYearId: "2025" })).summary.mean_points, 1);
  const data = await app.dashboard({ search: "002", pageSize: 1 });
  assert.equal(data.summary.registered, 2); assert.equal(data.candidateCount, 1);
  assert.equal(data.candidates[0].examination_number, "002");
  assert.equal(data.trends.length, 2);
});

test("cohort is always the examination year, including legacy class labels and bulk summaries", async () => {
  const app = fixture();
  await app.save(input("001", "A", { cohort: "Form 4" }));
  await app.save({ ...input("002", "C", { cohort: "Grade 9" }), academicYearId: "2025" });
  assert.equal(app.db.prepare("SELECT cohort FROM performance_candidates WHERE examination_number='001'").get().cohort, "2026");
  app.db.exec("UPDATE performance_candidates SET cohort='Old class label' WHERE examination_number='001'");
  assert.equal((await app.dashboard()).candidates[0].cohort, "2026");
  assert.equal((await app.dashboard({ academicYearId: "2025" })).candidates[0].cohort, "2025");
  await app.save(bulkInput());
  assert.deepEqual((await app.dashboard()).cohorts, ["2026"]);
});
test("unauthorised candidate identities are never fetched and read access does not grant writing", async () => {
  const app = fixture(); await app.save(input("001"));
  const data = await app.dashboard({}, summaryAccess);
  assert.equal(data.summary.registered, 1); assert.equal(data.candidates.length, 0); assert.equal(data.candidateCount, 0);
  await assert.rejects(() => app.dashboard({}, { ...summaryAccess, canRead: false }), /permission/);
  await assert.rejects(() => service.saveExamination(app.store, input("002"), summaryAccess), /permission/);
});
test("senior schools accept only offered subjects in the selected year", async () => {
  const app = fixture();
  await assert.rejects(() => app.save(input("001", "C+", { subjects: [{ subjectCode: "999", subjectName: "Not offered", status: "submitted", grade: "A", score: 90 }] })), /offered/);
  assert.equal((await app.dashboard()).summary.registered, 0);
});
for (const [level, grade, points] of [["junior","EE1",8],["primary","EE",4]]) {
  test(`${level} learning-area outcomes are not converted into overall KCSE grades`, async () => {
    const app = fixture(level);
    await app.save(input("001", null, { overallGrade: null, subjects: [{ subjectCode: "ENG", subjectName: "English", status: "submitted", grade, score: 80 }] }));
    const data = await app.dashboard({ subject: "ENG" });
    assert.equal(data.summary.mean_points, null); assert.equal(data.subjects[0].mean_points, points);
    assert.equal(data.gender[0].mean_points, points); assert.equal(data.summary.qualified, 0);
    assert.equal(data.distribution[0].grade, grade);
    await assert.rejects(() => app.save(input("002", "A")), /overall mean/);
  });
}
test("empty databases and historical gaps return no fabricated scores or percentages", async () => {
  const app = fixture(); const data = await app.dashboard();
  assert.equal(data.summary.registered, 0); assert.equal(data.summary.mean_points, null);
  assert.equal(data.trends.length, 0); assert.equal(analysis.distributionRows(data)[0].percent, null);
  assert.match(analysis.performanceInsights(data)[0], /not yet enough/);
});

test("subject history and grade comparisons use only recorded prior years", async () => {
  const app = fixture();
  await app.save({ ...input("1", "C"), academicYearId: "2025" });
  await app.save(input("2", "A"));
  const data = await app.dashboard();
  assert.equal(data.subjects[0].previous_year, "2025");
  assert.equal(data.subjects[0].previous_points, 6);
  assert.equal(data.subjectHistory.length, 2);
  assert.equal(data.genderHistory.length, 2);
  assert.equal(data.gradeHistory.find((row) => row.year === "2025").grade, "C");
});

test("candidate writes roll back atomically when a subject save fails", async () => {
  const app = fixture();
  const broken = { ...app.store, transaction: (callback) => app.store.transaction((query) => callback((statement, params) => {
    if (statement.startsWith("INSERT INTO performance_candidate_subjects")) throw new Error("Simulated database failure");
    return query(statement, params);
  })) };
  await assert.rejects(() => service.saveExamination(broken, input("1"), fullAccess), /Simulated/);
  assert.equal((await app.dashboard()).summary.registered, 0);
  assert.equal(app.db.prepare("SELECT COUNT(*) AS total FROM performance_records").get().total, 0);
});

test("case-normalised registration numbers prevent duplicate candidates and conflicting subject codes are rejected", async () => {
  const app = fixture();
  await app.save(input("abc001")); await app.save(input("ABC001", "B"));
  assert.equal((await app.dashboard()).summary.registered, 1);
  await assert.rejects(() => app.save(input("2", "A", { subjects: [{ subjectCode: "101", subjectName: "Mathematics", status: "submitted", grade: "A", score: 90 }] })), /already assigned/);
});

test("a unique existing national examination is reused and its legacy summary is preserved", async () => {
  const app = fixture();
  app.db.exec("INSERT INTO performance_records(id,school_id,academic_year_id,assessment_name,assessment_type,candidates,average_score,notes) VALUES ('existing','one','2026','KCSE','national',80,6.4,'Original notes')");
  await app.save(input("1"));
  assert.equal(app.db.prepare("SELECT COUNT(*) AS count FROM performance_records").get().count, 1);
  assert.equal((await app.dashboard()).legacySummary.candidates, 80);
  const stored = app.db.prepare("SELECT notes FROM performance_records WHERE id='existing'").get();
  assert.equal(JSON.parse(stored.notes).originalNotes, "Original notes");
});

test("multi-sheet Excel and PDF exports contain filtered results and respect candidate permissions", async () => {
  const downloads = [];
  const reports = load("reports", {
    "./analysis": analysis,
    "../ui/export-menu": { downloadBlob: (blob, filename) => downloads.push({ blob, filename }) },
    exceljs: featureRequire("exceljs"), jspdf: featureRequire("jspdf"), "jspdf-autotable": featureRequire("jspdf-autotable"),
  });
  const app = fixture(); await app.save(input("1", "A"));
  const data = await app.dashboard();
  const filters = { schoolId: "one", academicYearId: "2026" };
  await reports.exportExaminationReport("excel", data, filters, (query) => app.dashboard(query));
  assert.match(downloads[0].filename, /KCSE-2026\.xlsx$/);
  const workbook = new (featureRequire("exceljs").Workbook)();
  await workbook.xlsx.load(Buffer.from(await downloads[0].blob.arrayBuffer()));
  assert.equal(workbook.getWorksheet("Candidate performance").getCell("A2").value, "Candidate 1");
  assert.equal(workbook.getWorksheet("Candidate performance").getCell("D2").value, "2026");
  assert.ok(workbook.getWorksheet("University threshold"));
  await reports.exportExaminationReport("pdf", data, filters, (query) => app.dashboard(query));
  assert.match((await downloads[1].blob.text()).slice(0, 8), /^%PDF-/);
  const summary = await app.dashboard({}, summaryAccess);
  const sections = reports.examinationReportSections(summary, filters);
  assert.equal(sections.some((section) => section.name.startsWith("Candidate")), false);
  const junior = fixture("junior");
  assert.equal(reports.examinationReportSections(await junior.dashboard(), filters).some((section) => section.name === "University threshold"), false);
  await app.save(bulkInput());
  const bulk = await app.dashboard();
  const bulkSections = reports.examinationReportSections(bulk, filters);
  assert.equal(bulkSections.some((section) => section.name.startsWith("Candidate")), false);
  const attendance = bulkSections.find((section) => section.name === "Candidature and attendance");
  assert.equal(attendance.rows[0][3], 8); assert.match(attendance.rows[0][7], /Illness: 2/);
  const elective = bulkSections.find((section) => section.name === "Subject attendance").rows.find((row) => row[0].includes("Biology") && row[1] === "male");
  assert.equal(elective[2], 4);
  const subject = await app.dashboard({ subject: "231" });
  assert.equal(reports.examinationReportSections(subject, { ...filters, subject: "231" }).some((section) => section.name === "University threshold"), false);
  await reports.exportExaminationReport("excel", bulk, filters, () => { throw new Error("Individual candidates must not be fetched for bulk reports"); });
  const bulkWorkbook = new (featureRequire("exceljs").Workbook)();
  await bulkWorkbook.xlsx.load(Buffer.from(await downloads.at(-1).blob.arrayBuffer()));
  assert.ok(bulkWorkbook.getWorksheet("Subject attendance"));
  assert.equal(bulkWorkbook.getWorksheet("Candidate performance"), undefined);
});
