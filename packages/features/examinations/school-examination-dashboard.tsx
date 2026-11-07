"use client";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@scsms/ui/components/button";
import { useFeatureData } from "../data/feature-data-context";
import { useAcademicYear } from "../academic-years/academic-year-context";
import { useExaminationAdapter } from "./context";
import { examinationForLevel, gradesFor, type Candidate, type ExaminationDashboard, type ExaminationFilters } from "./model";
import { displayNumber as number, displayPercentage as percent, comparisonText, distributionRows, percentage, performanceInsights, qualifies } from "./analysis";
import { CandidateEditor } from "./candidate-editor";
import { CandidatureEditor, CandidatureAttendance, type CandidatureEditorSection } from "./candidature-editor";
import styles from "./examinations.module.css";

const colors = ["#2563eb", "#0891b2", "#7c3aed", "#16a34a", "#d97706", "#db2777", "#64748b", "#dc2626", "#4f46e5", "#0f766e", "#9333ea", "#92400e"];
type FilterState = Omit<ExaminationFilters, "schoolId">;

export function SchoolExaminationDashboard({ schoolName, schoolId }: { schoolName: string; schoolId?: string }) {
  const { schools } = useFeatureData();
  const matches = schools.filter((record) => schoolId ? record.id === schoolId : record.displayName === schoolName || record.id === schoolName);
  const school = matches.length === 1 ? matches[0] : undefined;
  if (!school) return <section className="panel detail-panel"><h2>School examination performance</h2><p>Select a unique school from the performance school registry. Results are never combined across schools with the same name.</p></section>;
  const type = examinationForLevel(school.institutionType);
  if (!type) return <section className="panel detail-panel"><p>Set this school&apos;s primary, junior, or senior level before viewing examination results.</p></section>;
  return <DashboardContent key={school.id} schoolId={school.id} schoolName={school.displayName} />;
}

function DashboardContent({ schoolId, schoolName }: { schoolId: string; schoolName: string }) {
  const adapter = useExaminationAdapter();
  const { currentAcademicYear, academicYears } = useAcademicYear();
  const [filters, setFilters] = useState<FilterState>({ academicYearId: currentAcademicYear.id, gender: "all", page: 1, pageSize: 25 });
  const [refresh, setRefresh] = useState(0);
  const [state, setState] = useState<{ key: string; data?: ExaminationDashboard; error?: string }>({ key: "" });
  const [editor, setEditor] = useState<{ candidate?: Candidate } | null>(null);
  const [bulkEditor, setBulkEditor] = useState<CandidatureEditorSection | null>(null);
  const [candidateDetail, setCandidateDetail] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [savingThreshold, setSavingThreshold] = useState(false);
  const request = useMemo(() => ({ ...filters, schoolId }), [filters, schoolId]);
  const key = JSON.stringify([request, refresh]);
  useEffect(() => {
    let cancelled = false;
    if (!adapter) return;
    void adapter.load(request).then((data) => { if (!cancelled) setState({ key, data }); })
      .catch((error: unknown) => { if (!cancelled) setState({ key, error: error instanceof Error ? error.message : String(error) }); });
    return () => { cancelled = true; };
  }, [adapter, request, key]);
  useEffect(() => {
    const reload = () => setRefresh((value) => value + 1);
    window.addEventListener("scsms:feature-data-refresh", reload);
    return () => window.removeEventListener("scsms:feature-data-refresh", reload);
  }, []);
  const data = state.key === key ? state.data : undefined;
  const change = (changes: Partial<FilterState>) => { setFilters((value) => ({ ...value, ...changes, page: changes.page ?? 1 })); setCandidateDetail(null); if (changes.search !== undefined) setSearchInput(changes.search); };
  const saveThreshold = async (degreeThreshold: string) => {
    if (!data || !adapter) return;
    setSavingThreshold(true); setExportError("");
    try { await adapter.save({ schoolId, academicYearId: data.yearId, degreeThreshold, candidate: null }); setRefresh((value) => value + 1); }
    catch (error) { setExportError(error instanceof Error ? error.message : String(error)); }
    finally { setSavingThreshold(false); }
  };
  const exportReport = async (format: "excel" | "pdf") => {
    if (!data || !adapter) return;
    setExporting(true); setExportError("");
    try {
      const { exportExaminationReport } = await import("./reports");
      await exportExaminationReport(format, data, request, adapter.load);
    } catch (cause) { setExportError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setExporting(false); }
  };
  const allYears = data?.years ?? academicYears.map((year) => ({ id: year.id, name: year.name }));
  return <div className={styles.dashboard}>
    <header className={styles.heading}><div><span className="eyebrow">School examination performance</span><h2>{schoolName}</h2><p>{data ? `${data.school.school_code} · ${data.examinationType} · ${data.yearName}` : "Loading selected school…"}</p></div><div className={styles.actions}>
      <button type="button" className="outline-button" disabled={!data || exporting} onClick={() => void exportReport("excel")}>{exporting ? "Preparing report…" : "Excel report"}</button>
      <button type="button" className="outline-button" disabled={!data || exporting} onClick={() => void exportReport("pdf")}>PDF report</button>
      {data?.access.canWrite && <>
        <Button onClick={() => setBulkEditor("attendance")}>{data.candidature ? "Update candidature" : "Enter whole candidature"}</Button>
        <button type="button" className="outline-button" onClick={() => setBulkEditor(data.examinationType === "KCSE" ? "grades" : "subjects")}>{data.examinationType === "KCSE" ? "Update grades & student numbers" : "Update assessment levels & student numbers"}</button>
        <button type="button" className="outline-button" onClick={() => setBulkEditor("subjects")}>Update subjects & student numbers</button>
      </>}
    </div></header>
    <div className={styles.filters}>
      <label>Cohort (examination year)<select value={filters.academicYearId} onChange={(e) => change({ academicYearId: e.target.value, subject: "", grade: "", search: "" })}>{allYears.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}</select></label>
      <label>Examination<select value={data?.examinationType ?? ""} disabled><option>{data?.examinationType ?? "Determined by school level"}</option></select></label>
      <label>Gender<select value={filters.gender} onChange={(e) => change({ gender: e.target.value })}><option value="all">All genders</option><option value="male">Male</option><option value="female">Female</option><option value="unknown">Not recorded</option></select></label>
      <label>Subject / learning area<select value={filters.subject ?? ""} onChange={(e) => change({ subject: e.target.value, grade: "" })}><option value="">All subjects</option>{(data?.subjectOptions ?? state.data?.subjectOptions ?? []).map((subject) => <option key={subject.subject_code} value={subject.subject_code}>{subject.subject_name} ({subject.subject_code})</option>)}</select></label>
      <label>Grade / outcome<select disabled={Boolean((data ?? state.data)?.candidature)} value={filters.grade ?? ""} onChange={(e) => change({ grade: e.target.value })}><option value="">All outcomes</option>{gradesFor(data?.examinationType ?? state.data?.examinationType ?? "KCSE").map((grade) => <option key={grade}>{grade}</option>)}</select></label>
    </div>
    {exportError && <p className={styles.error} role="alert">{exportError}</p>}
    {!adapter ? <p role="alert">Examination storage is unavailable in this app session.</p> : state.key === key && state.error ? <div className={styles.notice} role="alert"><p>{state.error}</p><button className="outline-button" type="button" onClick={() => setRefresh((value) => value + 1)}>Retry</button></div> : !data ? <div className={styles.skeleton} role="status" aria-label="Loading examination performance">{Array.from({ length: 8 }, (_, index) => <div key={index} />)}</div> : <>
      {data.examinationType === "KCSE" && data.access.canWrite && <label className={styles.threshold}>General degree mean-grade threshold<select value={data.degreeThreshold} disabled={savingThreshold} onChange={(event) => void saveThreshold(event.target.value)}>{gradesFor("KCSE").map((value) => <option key={value}>{value}</option>)}</select><small>Default C+. Programme-specific subject requirements are assessed separately.</small></label>}
      <CandidatureAttendance data={data} gender={filters.gender} subject={filters.subject} />
      <DashboardAnalysis data={data} filters={filters} onGrade={(grade) => { if (!data.candidature) change({ grade, search: "" }); }} onSubject={(subject) => change({ subject, grade: "", search: "" })} />
      {!data.candidature && data.candidateCount > 0 && <section className={`panel ${styles.section}`}>
        <div className={styles.heading}><div><h3>Existing individual results</h3><p>Only authorised users can view or export identifiable candidate information.</p></div></div>
        {!data.access.canViewCandidates ? <p role="status">Your permissions allow aggregated analysis only. Candidate identities are not returned by the database service.</p> : <>
          <form className={styles.actions} onSubmit={(event) => { event.preventDefault(); change({ search: searchInput }); }}><label className={styles.search}>Candidate name or examination number<input type="search" value={searchInput} maxLength={100} onChange={(e) => setSearchInput(e.target.value)} /></label><button className="outline-button" type="submit">Search</button><label>Sort mean grade<select value={filters.order ?? "desc"} onChange={(e) => change({ order: e.target.value as "asc" | "desc" })} disabled={data.examinationType !== "KCSE"}><option value="desc">Highest first</option><option value="asc">Lowest first</option></select></label></form>
          <div className={styles.scroll}><table><thead><tr><th>Candidate</th><th>Examination number</th><th>Gender</th><th>Cohort (exam year)</th><th>Status</th>{data.examinationType === "KCSE" && <><th>Mean grade</th><th>Mean marks</th><th>General degree threshold</th></>}<th>Details</th></tr></thead><tbody>
            {data.candidates.map((candidate) => <CandidateRows key={candidate.id} candidate={candidate} data={data} expanded={candidateDetail === candidate.id} onExpand={() => setCandidateDetail((value) => value === candidate.id ? null : candidate.id)} onEdit={() => setEditor({ candidate })} />)}
            {!data.candidates.length && <tr><td colSpan={data.examinationType === "KCSE" ? 9 : 6}>No registered candidates match these filters.</td></tr>}
          </tbody></table></div>
          <div className={styles.actions}><span>{data.candidateCount} matching candidates · Page {data.page} of {Math.max(1, Math.ceil(data.candidateCount / data.pageSize))}</span><button className="outline-button" type="button" disabled={data.page <= 1} onClick={() => change({ page: data.page - 1 })}>Previous</button><button className="outline-button" type="button" disabled={data.page * data.pageSize >= data.candidateCount} onClick={() => change({ page: data.page + 1 })}>Next</button></div>
        </>}
      </section>}
      {bulkEditor && <CandidatureEditor dashboard={data} initialSection={bulkEditor} onClose={() => setBulkEditor(null)} onSaved={() => { change({ grade: "", search: "", subject: "" }); setRefresh((value) => value + 1); }} />}
      {editor && <CandidateEditor dashboard={data} candidate={editor.candidate} onClose={() => setEditor(null)} onSaved={() => setRefresh((value) => value + 1)} />}
    </>}
  </div>;
}

function CandidateRows({ candidate, data, expanded, onExpand, onEdit }: { candidate: Candidate; data: ExaminationDashboard; expanded: boolean; onExpand: () => void; onEdit: () => void }) {
  return <><tr><td>{candidate.candidate_name}</td><td>{candidate.examination_number}</td><td>{candidate.gender}</td><td>{data.yearName}</td><td>{candidate.status}</td>{data.examinationType === "KCSE" && <><td>{candidate.overall_grade ?? "Not recorded"}</td><td>{number(candidate.overall_score)}</td><td>{candidate.status !== "submitted" ? "Result unavailable" : qualifies(data, candidate.overall_grade) ? "Meets mean-grade threshold" : "Below threshold"}</td></>}<td><button type="button" className="text-button" aria-expanded={expanded} onClick={onExpand}>{expanded ? "Hide" : "View subjects"}</button>{data.access.canWrite && <button type="button" className="text-button" onClick={onEdit}>Edit results</button>}</td></tr>
    {expanded && <tr><td colSpan={data.examinationType === "KCSE" ? 9 : 6}><div className={styles.candidateSubjects}><strong>{candidate.candidate_name}: registered subjects</strong>{candidate.subjects.length ? candidate.subjects.map((subject) => <p key={subject.subject_code}>{subject.subject_code} · {subject.subject_name}: {subject.status === "submitted" ? `${subject.grade ?? "Level missing"} · ${number(subject.score)} marks` : subject.status}</p>) : <p>No registered subject records.</p>}</div></td></tr>}</>;
}

function DashboardAnalysis({ data, filters, onGrade, onSubject }: { data: ExaminationDashboard; filters: FilterState; onGrade: (grade: string) => void; onSubject: (subject: string) => void }) {
  const distribution = distributionRows(data);
  const totalOutcomes = distribution.reduce((sum, row) => sum + row.count, 0);
  const previousGradeYear = [...new Set(data.gradeHistory.map((row) => row.year))].filter((year) => year < data.yearName).sort().reverse()[0];
  const submitted = data.summary.submitted;
  const completion = percentage(submitted, data.summary.registered);
  const previous = data.trends.filter((row) => row.year < data.yearName && (!filters.subject || row.subject_code === filters.subject)).sort((a, b) => b.year.localeCompare(a.year))[0];
  const mean = data.examinationType === "KCSE" && !filters.subject ? data.summary.mean_points : filters.subject ? data.subjects.find((row) => row.subject_code === filters.subject)?.mean_points : null;
  const change = mean !== null && mean !== undefined && previous?.mean_points !== null && previous?.mean_points !== undefined ? mean - previous.mean_points : null;
  const gradeCount = (grades: string[]) => distribution.filter((row) => grades.includes(row.grade)).reduce((sum, row) => sum + row.count, 0);
  const priorYear = [...new Set(data.genderHistory.map((row) => row.year))].filter((year) => year < data.yearName).sort().reverse()[0];
  const priorGender = data.genderHistory.filter((row) => row.year === priorYear);
  const priorTotal = (field: "registered" | "submitted") => priorYear ? priorGender.reduce((sum, row) => sum + row[field], 0) : undefined;
  const priorCompletion = percentage(priorTotal("submitted") ?? 0, priorTotal("registered") ?? 0);
  const gradeComparison = (grades: string[]) => comparisonText(gradeCount(grades), previousGradeYear ? data.gradeHistory.filter((row) => row.year === previousGradeYear && grades.includes(row.grade)).reduce((sum, row) => sum + row.count, 0) : undefined, previousGradeYear);
  const cards: [string, string, string][] = [
    ["Registered candidates", number(data.summary.registered, 0), comparisonText(data.summary.registered, priorTotal("registered"), priorYear)],
    ["Submitted results", number(submitted, 0), `${percent(completion)} of registrations · ${comparisonText(submitted, priorTotal("submitted"), priorYear)}`],
    [data.examinationType === "KCSE" ? "Mean grade points" : "Selected learning-area mean", number(mean), data.examinationType !== "KCSE" && !filters.subject ? "Select a learning area; no combined assessment mean" : `${change === null ? "No previous comparable year" : `${change >= 0 ? "+" : ""}${number(change)} points vs ${previous.year}`}`],
    ["Male candidates", number(data.summary.male, 0), comparisonText(data.summary.male, priorYear ? priorGender.find((row) => row.gender === "male")?.registered ?? 0 : undefined, priorYear)],
    ["Female candidates", number(data.summary.female, 0), comparisonText(data.summary.female, priorYear ? priorGender.find((row) => row.gender === "female")?.registered ?? 0 : undefined, priorYear)],
    ["Submission completion", percent(completion), priorYear && completion !== null && priorCompletion !== null ? `${number(completion - priorCompletion, 1)} percentage points vs ${priorYear}` : "No previous comparable year"],
    ["Absent / missing / withheld", `${data.summary.absent} / ${data.summary.missing} / ${data.summary.withheld}`, "Reported separately; excluded from means"],
    ...(data.examinationType === "KCSE" && (!data.candidature || !filters.subject) ? [
      ["A / A-", number(gradeCount(["A", "A-"]), 0), gradeComparison(["A", "A-"])],
      ["B grades", number(gradeCount(["B+", "B", "B-"]), 0), gradeComparison(["B+", "B", "B-"])],
      ["C grades", number(gradeCount(["C+", "C", "C-"]), 0), gradeComparison(["C+", "C", "C-"])],
      ["D / E grades", number(gradeCount(["D+", "D", "D-", "E"]), 0), gradeComparison(["D+", "D", "D-", "E"])],
      ["Meets degree mean-grade threshold", `${data.summary.qualified} (${percent(percentage(data.summary.qualified, submitted))})`, comparisonText(data.summary.qualified, previous?.qualified, previous?.year)],
    ] as [string, string, string][] : []),
  ];
  const subjectChart = data.subjects.filter((row) => row.mean_points !== null).map((row) => ({ subject: row.subject_name, points: row.mean_points, male: row.male_mean, female: row.female_mean }));
  const trendSubjects = [...new Set(data.trends.map((row) => row.subject_code).filter((value): value is string => Boolean(value)))];
  const trendRows = [...new Set(data.trends.map((row) => row.year))].sort().map((year) => Object.fromEntries([["year", year], ...data.trends.filter((row) => row.year === year).map((row) => [row.subject_code ?? "overall", row.mean_points])]));
  return <>
    <div className={styles.status}><span>Submission: {data.summary.registered === 0 ? "No registrations" : data.summary.submitted === data.summary.registered ? "Complete" : "Partial results"}</span><span>Last updated: {data.lastUpdated ? new Date(data.lastUpdated).toLocaleString("en-GB") : "Not recorded"}</span></div>
    {data.legacySummary && <p className={styles.notice}>An older {data.legacySummary.assessment_name} summary exists ({data.legacySummary.candidates} candidates). Enter the whole candidature, attendance and grade counts to update this year&apos;s analysis. Legacy and bulk counts are never added together.</p>}
    {!data.summary.registered && <p className={styles.notice} role="status">No candidature for this school, examination year and filter combination. Use “Enter whole candidature” if authorised. Enrollment totals are not substituted for examination registrations.</p>}
    <div className={styles.cards}>{cards.map(([title, value, detail]) => <article className="stat-card" key={title}><div><span className="stat-label">{title}</span><strong className={styles.metric}>{value}</strong><small>{detail}</small></div></article>)}</div>
    {data.examinationType !== "KCSE" && <p className={styles.notice}>Assessment levels are reported by learning area. {data.examinationType === "KJSEA" ? "KJSEA subjects are not combined into an overall aggregate." : "KPSEA uses its own four assessment levels."} Marks and level points are distinct. Select a learning area for a comparable gender mean.</p>}
    <div className={styles.twoColumns}>
      <section className={`panel ${styles.section}`}><h3>{data.examinationType === "KCSE" && !filters.subject ? "Candidate grade distribution" : "Learning-area outcome distribution"}</h3><p>{totalOutcomes} submitted {data.examinationType === "KCSE" && !filters.subject ? "candidate mean grades" : "learning-area results"}. Percentages use this denominator. {data.candidature ? "Bulk grade counts are reported without individual candidate drill-down." : "Select a grade below to filter candidates."}</p><div className={styles.chart}><ResponsiveContainer width="100%" height="100%"><BarChart data={distribution}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="grade" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" name="Submitted outcomes" fill="#2563eb" onClick={(entry) => { const value = entry as unknown as { payload?: { grade?: string } }; if (value.payload?.grade) onGrade(value.payload.grade); }} /></BarChart></ResponsiveContainer></div></section>
      <section className={`panel ${styles.section}`}><h3>Outcome proportions</h3>{totalOutcomes ? <div className={styles.chart}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={distribution.filter((row) => row.count)} dataKey="count" nameKey="grade" innerRadius={58} outerRadius={92}>{distribution.filter((row) => row.count).map((row, index) => <Cell key={row.grade} fill={colors[index % colors.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div> : <p>No submitted outcomes to chart.</p>}<div className={styles.scroll}><table><thead><tr><th>Individual grade / level</th><th>Count</th><th>Share</th><th>Male</th><th>Female</th><th>{previousGradeYear ?? "Previous recorded year"}</th></tr></thead><tbody>{distribution.map((row) => <tr key={row.grade}><td><button className="text-button" type="button" disabled={Boolean(data.candidature)} onClick={() => onGrade(row.grade)}>{row.grade}</button></td><td>{row.count}</td><td>{percent(row.percent)}</td><td>{row.male}</td><td>{row.female}</td><td>{previousGradeYear ? data.gradeHistory.filter((item) => item.year === previousGradeYear && item.grade === row.grade).reduce((sum, item) => sum + item.count, 0) : "Not recorded"}</td></tr>)}</tbody></table></div></section>
    </div>
    <section className={`panel ${styles.section}`}><h3>Subject performance analysis</h3><p>Ranked by mean subject grade/level points within {data.examinationType}. Highest/lowest values are raw marks; missing marks remain unreported. Click a subject for its detailed distribution and candidates.</p><div className={styles.chart}><ResponsiveContainer width="100%" height="100%"><BarChart data={subjectChart}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="subject" tick={{ fontSize: 10 }} /><YAxis domain={[0, gradesFor(data.examinationType).length]} /><Tooltip /><Legend /><Bar dataKey="points" name="Mean subject points" fill="#2563eb" /><Bar dataKey="male" name="Male mean points" fill="#0891b2" /><Bar dataKey="female" name="Female mean points" fill="#7c3aed" /></BarChart></ResponsiveContainer></div>
      <div className={styles.scroll}><table><thead><tr><th>Subject / code</th><th>Registered</th><th>Sat / submitted</th><th>Absent</th><th>Missing / withheld</th><th>Mean points</th><th>Mean marks</th><th>Highest marks</th><th>Lowest marks</th><th>Highest points</th><th>Lowest points</th><th>Male points</th><th>Female points</th><th>Previous recorded year</th><th>Change (points)</th><th>Distribution</th></tr></thead><tbody>{data.subjects.map((subject) => <tr key={subject.subject_code}><td><button type="button" className="text-button" onClick={() => onSubject(subject.subject_code)}>{subject.subject_name} ({subject.subject_code})</button></td><td>{subject.registered}</td><td>{subject.sat}</td><td>{subject.absent}</td><td>{subject.missing}</td><td>{number(subject.mean_points)}</td><td>{number(subject.mean_marks)}</td><td>{number(subject.highest)}</td><td>{number(subject.lowest)}</td><td>{number(subject.highest_points)}</td><td>{number(subject.lowest_points)}</td><td>{number(subject.male_mean)}</td><td>{number(subject.female_mean)}</td><td>{subject.previous_year ? `${subject.previous_year}: ${number(subject.previous_points)}` : "Not recorded"}</td><td>{subject.mean_points !== null && subject.previous_points !== null && subject.previous_points !== undefined ? number(subject.mean_points - subject.previous_points) : "Not recorded"}</td><td>{data.subjectGrades.filter((row) => row.subject_code === subject.subject_code).map((row) => `${row.grade}: ${row.count}`).join(" · ") || "No submitted grades"}</td></tr>)}{!data.subjects.length && <tr><td colSpan={16}>No registered subject results for these filters.</td></tr>}</tbody></table></div>
    </section>
    <LearningAreaPanels data={data} onSubject={onSubject} />
    <div className={styles.twoColumns}>
      <section className={`panel ${styles.section}`}><h3>Performance by gender</h3><p>{data.examinationType === "KCSE" ? "Official candidate mean grade points" : filters.subject ? "Selected learning-area mean points" : "Registration counts; select one learning area for comparable means"}. Gender is not assumed to cause a performance gap.</p><div className={styles.chart}><ResponsiveContainer width="100%" height="100%"><BarChart data={data.gender}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="gender" /><YAxis /><Tooltip /><Legend /><Bar dataKey={data.examinationType === "KCSE" || filters.subject ? "mean_points" : "registered"} name={data.examinationType === "KCSE" || filters.subject ? "Mean points" : "Registered candidates"} fill="#7c3aed" /></BarChart></ResponsiveContainer></div><div className={styles.scroll}><table><thead><tr><th>Gender</th><th>Registered</th><th>Submitted</th><th>Mean points</th>{data.examinationType === "KCSE" && (!data.candidature || !filters.subject) && <th>Meets degree threshold</th>}</tr></thead><tbody>{data.gender.map((row) => <tr key={row.gender}><td>{row.gender}</td><td>{row.registered}</td><td>{row.submitted}</td><td>{number(row.mean_points)}</td>{data.examinationType === "KCSE" && (!data.candidature || !filters.subject) && <td>{row.qualified} ({percent(percentage(row.qualified, row.submitted))})</td>}</tr>)}</tbody></table></div></section>
      {(!data.candidature || !filters.subject) && (data.examinationType === "KCSE" ? <section className={`panel ${styles.section}`}><h3>General university mean-grade threshold</h3><strong className={styles.metric}>{data.summary.qualified} / {submitted}</strong><p>{percent(percentage(data.summary.qualified, submitted))} of candidates with submitted official mean grades attain {data.degreeThreshold} or above. {submitted - data.summary.qualified} are below this threshold.</p><progress className={styles.progress} max={submitted || 1} value={data.summary.qualified} aria-label="Share meeting the general degree mean-grade threshold" /><p>The default is C+. This is the general mean-grade requirement only, not programme-specific subject eligibility or a placement guarantee. The configured threshold is {data.degreeThreshold}.</p><a href="https://www.kuccps.net/kuccps-opens-application-window-2026-placement-universities-and-colleges" target="_blank" rel="noreferrer">KUCCPS entry guidance</a><div className={styles.actions}>{gradesFor("KCSE").slice(gradesFor("KCSE").indexOf(data.degreeThreshold), gradesFor("KCSE").indexOf(data.degreeThreshold) + 2).map((grade) => <button type="button" className="outline-button" key={grade} disabled={Boolean(data.candidature)} onClick={() => { onSubject(""); onGrade(grade); }}>Review mean-grade {grade} candidates</button>)}</div><h4>Qualification history</h4><p>History uses the currently selected general mean-grade threshold for a consistent comparison.</p>{data.trends.filter((row) => row.qualified !== undefined).map((row) => <p key={row.year}>{row.year}: {row.qualified} / {row.submitted} ({percent(percentage(row.qualified, row.submitted))})</p>)}</section> : <section className={`panel ${styles.section}`}><h3>Assessment reporting</h3><p>{data.examinationType === "KJSEA" ? "EE1 / EE2, ME1 / ME2, AE1 / AE2, BE1 / BE2" : "EE: Exceeding · ME: Meeting · AE: Approaching · BE: Below expectations"}</p><p>Only official reported learning-area outcomes are analysed. No university eligibility or KCSE grade categories apply to this examination.</p><p>Different learning-area results are not converted into a candidate mean grade.</p></section>)}
    </div>
    <section className={`panel ${styles.section}`}><h3>Historical performance</h3><p>Actual {data.examinationType} results for this school only. Gaps are not filled. {data.examinationType !== "KCSE" && !filters.subject ? "Each line is an independent learning area; no combined mean is calculated." : "Mean points by examination year."}</p><div className={styles.chart}><ResponsiveContainer width="100%" height="100%"><LineChart data={trendRows}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="year" /><YAxis domain={[0, gradesFor(data.examinationType).length]} /><Tooltip /><Legend />{(trendSubjects.length ? trendSubjects : ["overall"]).map((subject, index) => <Line key={subject} dataKey={subject} name={data.subjectOptions.find((row) => row.subject_code === subject)?.subject_name ?? (subject === "overall" ? "Official mean grade points" : subject)} stroke={colors[index % colors.length]} connectNulls={false} />)}</LineChart></ResponsiveContainer></div><div className={styles.scroll}><table><thead><tr><th>Year</th><th>Subject / overall</th><th>Registered</th><th>Submitted</th><th>Mean points</th><th>Mean marks</th><th>Change from previous recorded year</th></tr></thead><tbody>{data.trends.map((row) => { const previous = data.trends.filter((item) => item.year < row.year && item.subject_code === row.subject_code).sort((a, b) => b.year.localeCompare(a.year))[0]; const delta = previous?.mean_points !== null && previous?.mean_points !== undefined && row.mean_points !== null ? row.mean_points - previous.mean_points : null; return <tr key={`${row.year}:${row.subject_code ?? "overall"}`}><td>{row.year}</td><td>{row.subject_code ?? "Official KCSE mean"}</td><td>{row.registered}</td><td>{row.submitted}</td><td>{number(row.mean_points)}</td><td>{number(row.mean_marks)}</td><td>{delta === null ? "No previous comparable record" : `${delta >= 0 ? "+" : ""}${number(delta)} points (${percent(percentage(delta, previous.mean_points ?? 0))})`}</td></tr>; })}{!data.trends.length && <tr><td colSpan={7}>No historical results available.</td></tr>}</tbody></table></div></section>
    <HistoricalGender data={data} subject={filters.subject ?? ""} />
    <section className={`panel ${styles.section}`}><h3>Academic intervention and insights</h3><p>Subject comparisons require at least five submitted results per subject. Findings describe recorded data and do not establish causes.</p><ul>{performanceInsights(data, filters.subject).map((insight) => <li key={insight}>{insight}</li>)}</ul></section>
  </>;
}

function LearningAreaPanels({ data, onSubject }: { data: ExaminationDashboard; onSubject: (subject: string) => void }) {
  const groups: [string, RegExp][] = [["Mathematics", /math/i], ["English", /english/i], ["Sciences", /biology|chemistry|physics|integrated science/i], ["Humanities", /history|geography|religious|social studies|\bcre\b|\bire\b|\bhre\b/i]];
  return <div className={styles.twoColumns}>{groups.map(([name, match]) => {
    const subjects = data.subjects.filter((row) => match.test(row.subject_name));
    return <section className={`panel ${styles.section}`} key={name}><h3>{name} performance</h3><p>Each subject is reported independently on the {data.examinationType} grade/level scale. Missing results are excluded from means.</p>{subjects.length ? <><div className={styles.chart}><ResponsiveContainer width="100%" height="100%"><BarChart data={subjects}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="subject_name" tick={{ fontSize: 10 }} /><YAxis domain={[0, gradesFor(data.examinationType).length]} /><Tooltip /><Bar dataKey="mean_points" name="Mean subject points" fill="#0891b2" /></BarChart></ResponsiveContainer></div>{subjects.map((subject) => <p key={subject.subject_code}><button type="button" className="text-button" onClick={() => onSubject(subject.subject_code)}>{subject.subject_name}: {number(subject.mean_points)} points · {subject.sat} submitted results</button>{subject.previous_year && <span> · {subject.previous_year}: {number(subject.previous_points)} points</span>}</p>)}</> : <p>No registered {name.toLowerCase()} subject results match the filters.</p>}</section>;
  })}</div>;
}

function HistoricalGender({ data, subject }: { data: ExaminationDashboard; subject: string }) {
  const usePoints = data.examinationType === "KCSE" || Boolean(subject);
  const rows = [...new Set(data.genderHistory.map((row) => row.year))].sort().map((year) => Object.fromEntries([["year", year], ...data.genderHistory.filter((row) => row.year === year).map((row) => [row.gender, usePoints ? row.mean_points : row.registered])]));
  const grades = distributionRows(data);
  return <div className={styles.twoColumns}>
    <section className={`panel ${styles.section}`}><h3>Gender performance history</h3><p>{usePoints ? "Comparable mean grade/level points by gender and examination year." : "Registered candidates by gender; select one learning area to compare historical mean points."} No missing years are filled.</p><div className={styles.chart}><ResponsiveContainer width="100%" height="100%"><LineChart data={rows}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="year" /><YAxis /><Tooltip /><Legend /><Line dataKey="male" name="Male" stroke="#0891b2" connectNulls={false} /><Line dataKey="female" name="Female" stroke="#7c3aed" connectNulls={false} /><Line dataKey="unknown" name="Gender not recorded" stroke="#64748b" connectNulls={false} /></LineChart></ResponsiveContainer></div></section>
    <section className={`panel ${styles.section}`}><h3>Grade / level distribution by gender</h3><p>{data.examinationType === "KCSE" && !subject ? "Submitted official candidate mean grades." : "Submitted learning-area outcomes; candidates may have multiple learning-area results."}</p><div className={styles.chart}><ResponsiveContainer width="100%" height="100%"><BarChart data={grades}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="grade" /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Bar dataKey="male" name="Male" fill="#0891b2" /><Bar dataKey="female" name="Female" fill="#7c3aed" /></BarChart></ResponsiveContainer></div></section>
  </div>;
}
