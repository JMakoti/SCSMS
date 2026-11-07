"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@scsms/ui/components/button";
import { gradesFor, type ExaminationDashboard } from "./model";
import { candidatureSchema, candidatureDraft, emptyAttendance, validateCandidature, type Attendance, type Candidature } from "./candidature-model";
import { useExaminationAdapter } from "./context";
import { learningAreaDefaults } from "./candidate-editor";
import styles from "./examinations.module.css";

const genders = ["male", "female"] as const;
type Gender = typeof genders[number];
export type CandidatureEditorSection = "attendance" | "grades" | "subjects";
function AttendanceFields({ label, value, onChange, submittedReadOnly = false }: { label: string; value: Attendance; onChange: (value: Attendance) => void; submittedReadOnly?: boolean }) {
  return <fieldset className={styles.attendance}><legend>{label}</legend><div className={styles.formGrid}>
    {(["registered", "present", "absent", "submitted", "withheld"] as const).map((field) => <label key={field}>{field === "submitted" ? "Results submitted" : field[0].toUpperCase() + field.slice(1)}<input type="number" min={0} max={100000} step={1} value={value[field]} readOnly={field === "submitted" && submittedReadOnly} onChange={(event) => onChange({ ...value, [field]: Number(event.target.value) })} required /></label>)}
  </div><p>Present + absent = registered. Submitted + withheld cannot exceed present.</p>
    {value.absent > 0 && <><h4>Absence reasons ({value.reasons.reduce((sum, row) => sum + row.count, 0)} / {value.absent} accounted for)</h4>{value.reasons.map((row, index) => <div className={styles.reasonRow} key={index}><label>Reason<input value={row.reason} maxLength={300} placeholder="For example: illness" onChange={(event) => onChange({ ...value, reasons: value.reasons.map((item, i) => i === index ? { ...item, reason: event.target.value } : item) })} required /></label><label>Number absent<input type="number" min={1} max={100000} step={1} value={row.count} onChange={(event) => onChange({ ...value, reasons: value.reasons.map((item, i) => i === index ? { ...item, count: Number(event.target.value) } : item) })} required /></label><button className="text-button" type="button" onClick={() => onChange({ ...value, reasons: value.reasons.filter((_, i) => i !== index) })}>Remove reason</button></div>)}<button className="outline-button" type="button" onClick={() => onChange({ ...value, reasons: [...value.reasons, { reason: "", count: Math.max(1, value.absent - value.reasons.reduce((sum, row) => sum + row.count, 0)) }] })}>Add absence reason</button></>}
    {!value.absent && value.reasons.length > 0 && <button type="button" className="text-button" onClick={() => onChange({ ...value, reasons: [] })}>Clear previous absence reasons</button>}
  </fieldset>;
}
function GradeFields({ rows, allowed, onChange }: { rows: Candidature["overallGrades"]; allowed: Gender[]; onChange: (rows: Candidature["overallGrades"]) => void }) {
  return <div className={styles.scroll}><table><thead><tr><th>Official grade / level</th>{allowed.map((gender) => <th key={gender}>Number of {gender} students</th>)}<th>Total students</th></tr></thead><tbody>{rows.map((row, index) => <tr key={row.grade}><th scope="row">{row.grade}</th>{allowed.map((gender) => <td key={gender}><input type="number" min={0} max={100000} step={1} aria-label={`${row.grade}: number of ${gender} students`} value={row[gender]} onChange={(event) => onChange(rows.map((item, i) => i === index ? { ...item, [gender]: Number(event.target.value) } : item))} required /></td>)}<td>{allowed.reduce((sum, gender) => sum + row[gender], 0)}</td></tr>)}</tbody><tfoot><tr><th scope="row">Total students with results</th>{allowed.map((gender) => <td key={gender}>{rows.reduce((sum, row) => sum + row[gender], 0)}</td>)}<td>{rows.reduce((sum, row) => sum + allowed.reduce((total, gender) => total + row[gender], 0), 0)}</td></tr></tfoot></table></div>;
}
export function CandidatureEditor({ dashboard, initialSection = "attendance", onClose, onSaved }: { dashboard: ExaminationDashboard; initialSection?: CandidatureEditorSection; onClose: () => void; onSaved: () => void }) {
  const adapter = useExaminationAdapter();
  const dialog = useRef<HTMLDialogElement>(null);
  const freshGrades = () => gradesFor(dashboard.examinationType).map((grade) => ({ grade, male: 0, female: 0 }));
  const [value, setValue] = useState<Candidature>(() => candidatureDraft(dashboard.examinationType, dashboard.candidature));
  const [subjectName, setSubjectName] = useState(""); const [subjectCode, setSubjectCode] = useState("");
  const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  const allowed = genders.filter((gender) => dashboard.schoolGender !== (gender === "male" ? "girls" : "boys"));
  const available = dashboard.examinationType === "KCSE" ? dashboard.availableSubjects : [...new Set([...dashboard.availableSubjects, ...learningAreaDefaults[dashboard.examinationType]])];
  const jumpTo = (section: CandidatureEditorSection) => {
    const target = dialog.current?.querySelector<HTMLElement>(`[data-entry-section="${section}"]`);
    target?.scrollIntoView({ block: "start" });
    target?.focus({ preventScroll: true });
  };
  useEffect(() => {
    const element = dialog.current; element?.showModal();
    const frame = requestAnimationFrame(() => {
      const target = element?.querySelector<HTMLElement>(`[data-entry-section="${initialSection}"]`);
      target?.scrollIntoView({ block: "start" }); target?.focus({ preventScroll: true });
    });
    return () => { cancelAnimationFrame(frame); element?.close(); };
  }, [initialSection]);
  const updateSubject = (index: number, changes: Partial<Candidature["subjects"][number]>) => setValue((current) => ({ ...current, subjects: current.subjects.map((subject, i) => i === index ? { ...subject, ...changes } : subject) }));
  const gradeTotals = (rows: Candidature["overallGrades"]) => ({ male: rows.reduce((sum, row) => sum + row.male, 0), female: rows.reduce((sum, row) => sum + row.female, 0) });
  const save = async (event: FormEvent) => {
    event.preventDefault(); if (!adapter) return; setSaving(true); setError("");
    try { const summary = candidatureSchema.parse(value); validateCandidature(summary, dashboard.examinationType, dashboard.availableSubjects, dashboard.schoolGender); await adapter.save({ schoolId: dashboard.school.id, academicYearId: dashboard.yearId, degreeThreshold: dashboard.degreeThreshold, candidate: null, candidature: summary }); onSaved(); onClose(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setSaving(false); }
  };
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="candidature-title" onCancel={(event) => { event.preventDefault(); if (!saving) onClose(); }}><form onSubmit={(event) => void save(event)}><fieldset disabled={saving} className={styles.editorFieldset}>
    <div className={styles.heading}><div><h2 id="candidature-title">Whole-school examination candidature</h2><p>{dashboard.school.display_name} · {dashboard.examinationType} · {dashboard.yearName}</p></div><button type="button" className="outline-button" onClick={onClose}>Close</button></div>
    <p>Enter the whole lot as totals by gender. Individual candidate names and numbers are not required. Use the official school examination/centre number below. Absence reasons are categories with counts; do not enter candidate names.</p>
    {!dashboard.candidature && dashboard.summary.registered > 0 && <p className={styles.notice}>Saving this summary makes bulk counts the source for this year&apos;s analysis. Existing individual records are retained separately and are not added to these totals.</p>}
    <nav className={styles.editorNav} aria-label="Examination entry sections"><button type="button" className="outline-button" onClick={() => jumpTo("attendance")}>Candidature &amp; attendance</button>{dashboard.examinationType === "KCSE" && <button type="button" className="outline-button" onClick={() => jumpTo("grades")}>Grades &amp; student numbers</button>}<button type="button" className="outline-button" onClick={() => jumpTo("subjects")}>Subjects &amp; student numbers</button></nav>
    <h3 className={styles.entrySection} data-entry-section="attendance" tabIndex={-1}>1. Candidature and attendance</h3>
    <label>Cohort (examination year)<input value={dashboard.yearName} readOnly /></label>
    <label>School examination centre number<input value={value.examinationNumber} maxLength={80} required onChange={(event) => setValue((current) => ({ ...current, examinationNumber: event.target.value }))} /></label>
    {allowed.map((gender) => <AttendanceFields key={gender} label={gender === "male" ? "Male candidature" : "Female candidature"} value={value[gender]} submittedReadOnly={dashboard.examinationType === "KCSE"} onChange={(attendance) => setValue((current) => ({ ...current, [gender]: attendance }))} />)}
    {dashboard.examinationType === "KCSE" && <section><h3 className={styles.entrySection} data-entry-section="grades" tabIndex={-1}>2. Grades and number of students</h3><p>Update the male/female student count beside each official KCSE mean grade, from A to E. Totals update automatically. Leave zero where no students attained that grade.</p><GradeFields rows={value.overallGrades} allowed={allowed} onChange={(rows) => { const totals = gradeTotals(rows); setValue((current) => ({ ...current, overallGrades: rows, male: { ...current.male, submitted: totals.male }, female: { ...current.female, submitted: totals.female } })); }} /></section>}
    <h3 className={styles.entrySection} data-entry-section="subjects" tabIndex={-1}>{dashboard.examinationType === "KCSE" ? "3" : "2"}. Subjects and number of students</h3><p>Select subjects here, then update the number of male/female students taking each one. Enter each subject&apos;s own attendance and grade/level counts below. Elective subject totals may be smaller than the whole-school totals.</p>
    <div className={styles.addSubject}><label>Subject<select value={subjectName} onChange={(event) => { setSubjectName(event.target.value); setSubjectCode(dashboard.subjectOptions.find((subject) => subject.subject_name === event.target.value)?.subject_code ?? ""); }}><option value="">Select subject</option>{available.filter((name) => !value.subjects.some((subject) => subject.subjectName.toLowerCase() === name.toLowerCase())).map((name) => <option key={name}>{name}</option>)}</select></label><label>Official subject code<input value={subjectCode} maxLength={80} onChange={(event) => setSubjectCode(event.target.value)} /></label><button type="button" className="outline-button" disabled={!subjectName || !subjectCode.trim() || value.subjects.length >= 50} onClick={() => { setValue((current) => ({ ...current, subjects: [...current.subjects, { subjectName, subjectCode, male: emptyAttendance(), female: emptyAttendance(), grades: freshGrades() }] })); setSubjectName(""); setSubjectCode(""); }}>Add selected subject</button></div>
    {dashboard.examinationType === "KCSE" && !available.length && <p>Configure this senior school&apos;s offered subjects for the selected year in its Subjects tab.</p>}
    {!value.subjects.length && <p className={styles.notice}>No subjects selected yet. Choose a subject and its official code above, then select Add selected subject to enter student numbers and grades.</p>}
    {value.subjects.map((subject, index) => <section key={subject.subjectCode} className={styles.subjectEntry}><h3>{subject.subjectName} ({subject.subjectCode}) — {subject.male.registered + subject.female.registered} students taking this subject</h3>{allowed.map((gender) => <AttendanceFields key={gender} label={`${subject.subjectName}: ${gender} students`} value={subject[gender]} submittedReadOnly onChange={(attendance) => updateSubject(index, { [gender]: attendance })} />)}<h4>{subject.subjectName}: grades and number of students</h4><p>Update the student count for each official {dashboard.examinationType === "KCSE" ? "grade" : "assessment level"}. These counts set this subject&apos;s submitted-results totals.</p><GradeFields rows={subject.grades} allowed={allowed} onChange={(rows) => { const totals = gradeTotals(rows); updateSubject(index, { grades: rows, male: { ...subject.male, submitted: totals.male }, female: { ...subject.female, submitted: totals.female } }); }} /><button type="button" className="text-button" onClick={() => setValue((current) => ({ ...current, subjects: current.subjects.filter((_, i) => i !== index) }))}>Remove subject from this summary</button></section>)}
    {error && <p role="alert" className={styles.error}>{error}</p>}<div className={styles.actions}><Button type="submit">{saving ? "Saving…" : "Save whole candidature"}</Button><button type="button" className="outline-button" onClick={onClose}>Cancel</button></div>
  </fieldset></form></dialog>;
}

export function CandidatureAttendance({ data, gender, subject }: { data: ExaminationDashboard; gender?: string; subject?: string }) {
  const bulk = data.candidature; if (!bulk) return null;
  const attendance = subject ? bulk.subjects.find((row) => row.subjectCode === subject) : bulk;
  const visible = genders.filter((item) => (!gender || gender === "all" || item === gender) && data.schoolGender !== (item === "male" ? "girls" : "boys"));
  return <section className={`panel ${styles.section}`}><h3>Candidature and attendance</h3><p>Cohort (examination year): <strong>{data.yearName}</strong>. Examination / centre number: <strong>{bulk.examinationNumber}</strong>. {subject ? "Selected subject totals" : "Whole-school totals"}. Bulk counts are used directly; individual records are not added to them.</p><div className={styles.scroll}><table><thead><tr><th>Gender</th><th>Registered</th><th>Present</th><th>Absent</th><th>Results submitted</th><th>Withheld</th><th>Absence reasons</th></tr></thead><tbody>{visible.map((item) => { const value = attendance?.[item] ?? emptyAttendance(); return <tr key={item}><td>{item}</td><td>{value.registered}</td><td>{value.present}</td><td>{value.absent}</td><td>{value.submitted}</td><td>{value.withheld}</td><td>{value.reasons.map((row) => `${row.reason}: ${row.count}`).join("; ") || "No absences"}</td></tr>; })}</tbody></table></div><p>Subject registrations are independent. Candidate searches and cross-tabulations of individual mean grades with elective subjects are unavailable for bulk summaries.</p></section>;
}
