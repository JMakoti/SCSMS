"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@scsms/ui/components/button";
import { examinationSaveSchema, gradesFor, validateCandidate, type Candidate, type ExaminationDashboard, type ExaminationSaveInput } from "./model";
import { useExaminationAdapter } from "./context";
import styles from "./examinations.module.css";

export const learningAreaDefaults = {
  KJSEA: ["English", "Kiswahili", "Mathematics", "Integrated Science", "Agriculture and Nutrition", "Social Studies", "Religious Education", "Pre-Technical Studies", "Creative Arts and Sports"],
  KPSEA: ["English", "Kiswahili", "Mathematics", "Integrated Science", "Creative Arts and Social Studies"],
};
type SubjectDraft = NonNullable<ExaminationSaveInput["candidate"]>["subjects"][number];
export function CandidateEditor({ dashboard, candidate, onClose, onSaved }: {
  dashboard: ExaminationDashboard; candidate?: Candidate; onClose: () => void; onSaved: () => void;
}) {
  const adapter = useExaminationAdapter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [number, setNumber] = useState(candidate?.examination_number ?? "");
  const [name, setName] = useState(candidate?.candidate_name ?? "");
  const [gender, setGender] = useState(candidate?.gender ?? "unknown");
  const [status, setStatus] = useState(candidate?.status ?? "missing");
  const [grade, setGrade] = useState(candidate?.overall_grade ?? "");
  const [score, setScore] = useState(candidate?.overall_score?.toString() ?? "");
  const [subjects, setSubjects] = useState<SubjectDraft[]>(candidate?.subjects.map((subject) => ({ subjectCode: subject.subject_code, subjectName: subject.subject_name, status: subject.status as SubjectDraft["status"], grade: subject.grade, score: subject.score })) ?? []);
  const [subjectName, setSubjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const available = dashboard.examinationType === "KCSE" ? dashboard.availableSubjects : [...new Set([...dashboard.availableSubjects, ...learningAreaDefaults[dashboard.examinationType]])];
  const grades = gradesFor(dashboard.examinationType);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  const updateSubject = (index: number, changes: Partial<SubjectDraft>) => setSubjects((current) => current.map((subject, row) => row === index ? { ...subject, ...changes } : subject));
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!adapter) return;
    setSaving(true); setError("");
    try {
      const input = examinationSaveSchema.parse({
        schoolId: dashboard.school.id, academicYearId: dashboard.yearId, degreeThreshold: dashboard.degreeThreshold,
        candidate: { examinationNumber: number, candidateName: name, gender, cohort: dashboard.yearName, status,
          overallGrade: dashboard.examinationType === "KCSE" && status === "submitted" ? grade || null : null,
          overallScore: dashboard.examinationType === "KCSE" && status === "submitted" && score !== "" ? Number(score) : null,
          subjects },
      });
      validateCandidate(input, dashboard.examinationType, dashboard.availableSubjects);
      await adapter.save(input); onSaved(); onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setSaving(false); }
  };
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="candidate-editor-title" onCancel={(event) => { event.preventDefault(); if (!saving) onClose(); }}>
    <form onSubmit={(event) => void save(event)}>
      <div className={styles.heading}><div><h2 id="candidate-editor-title">{candidate ? "Edit candidate results" : "Register candidate / enter results"}</h2><p>{dashboard.school.display_name} · {dashboard.examinationType} · {dashboard.yearName}</p></div><button type="button" className="outline-button" disabled={saving} onClick={onClose}>Close</button></div>
      <p>Enter official results. Register candidates even when their results are missing or they were absent. Include only subjects the candidate registered for.</p>
      <div className={styles.formGrid}>
        <label>Examination number<input value={number} onChange={(e) => setNumber(e.target.value)} required maxLength={80} readOnly={Boolean(candidate)} /></label>
        <label>Candidate name<input value={name} onChange={(e) => setName(e.target.value)} required maxLength={200} /></label>
        <label>Gender<select value={gender} onChange={(e) => setGender(e.target.value)}><option value="unknown">Not recorded</option><option value="male">Male</option><option value="female">Female</option></select></label>
        <label>Cohort (examination year)<input value={dashboard.yearName} readOnly /></label>
        <label>Result status<select value={status} onChange={(e) => setStatus(e.target.value)}><option value="missing">Missing / pending</option><option value="submitted">Submitted</option><option value="absent">Absent</option><option value="withheld">Withheld</option></select></label>
        {dashboard.examinationType === "KCSE" && <>
          <label>Official mean grade<select value={grade} disabled={status !== "submitted"} onChange={(e) => setGrade(e.target.value)} required={status === "submitted"}><option value="">Select grade</option>{grades.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label>Official mean marks (optional)<input type="number" min={0} max={100} step="any" value={score} disabled={status !== "submitted"} onChange={(e) => setScore(e.target.value)} /></label>
        </>}
      </div>
      <h3>Registered subjects / learning areas</h3>
      {dashboard.examinationType === "KCSE" && !available.length && <p role="status">Configure this senior school&apos;s subject combinations for {dashboard.yearName} in its Subjects tab before entering subject results.</p>}
      <div className={styles.addSubject}>
        <label>Subject<select value={subjectName} onChange={(e) => setSubjectName(e.target.value)}><option value="">Select offered subject</option>{available.filter((value) => !subjects.some((subject) => subject.subjectName === value)).map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>Official subject code<input value={subjectCode} onChange={(e) => setSubjectCode(e.target.value)} maxLength={80} /></label>
        <button className="outline-button" type="button" disabled={!subjectName || !subjectCode.trim() || saving} onClick={() => { setSubjects((current) => [...current, { subjectCode: subjectCode.trim(), subjectName, status: "missing", grade: null, score: null }]); setSubjectName(""); setSubjectCode(""); }}>Add subject</button>
      </div>
      <div className={styles.scroll}><table><thead><tr><th>Subject</th><th>Status</th><th>Grade / level</th><th>Marks (optional)</th><th>Remove</th></tr></thead><tbody>
        {subjects.map((subject, index) => <tr key={index}><td>{subject.subjectName} ({subject.subjectCode})</td><td><select aria-label={`${subject.subjectName} status`} value={subject.status} onChange={(e) => updateSubject(index, { status: e.target.value as SubjectDraft["status"], grade: null, score: null })}>{["missing", "submitted", "absent", "withheld"].map((value) => <option key={value}>{value}</option>)}</select></td><td><select aria-label={`${subject.subjectName} grade`} value={subject.grade ?? ""} disabled={subject.status !== "submitted"} onChange={(e) => updateSubject(index, { grade: e.target.value || null })}><option value="">Not recorded</option>{grades.map((value) => <option key={value}>{value}</option>)}</select></td><td><input aria-label={`${subject.subjectName} marks`} type="number" min={0} max={100} step="any" disabled={subject.status !== "submitted"} value={subject.score ?? ""} onChange={(e) => updateSubject(index, { score: e.target.value === "" ? null : Number(e.target.value) })} /></td><td><button type="button" className="text-button" disabled={saving} onClick={() => setSubjects((current) => current.filter((_, row) => row !== index))}>Remove</button></td></tr>)}
      </tbody></table></div>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <div className={styles.actions}><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save candidate and results"}</Button><button className="outline-button" type="button" disabled={saving} onClick={onClose}>Cancel</button></div>
    </form>
  </dialog>;
}
