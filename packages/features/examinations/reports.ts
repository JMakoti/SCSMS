import type { ExaminationAdapter } from "./context";
import type { ExaminationDashboard, ExaminationFilters } from "./model";
import { displayNumber, distributionRows, percentage, performanceInsights, qualifies } from "./analysis";
import { downloadBlob } from "../ui/export-menu";

type Cell = string | number | null;
type Section = { name: string; headers: string[]; rows: Cell[][] };
export function examinationReportSections(data: ExaminationDashboard, filters: ExaminationFilters): Section[] {
  const sections: Section[] = [{ name: "Performance summary", headers: ["Indicator", "Value"], rows: [
    ["School", data.school.display_name], ["School code", data.school.school_code], ["Examination", data.examinationType], ["Year", data.yearName],
    ["Gender filter", filters.gender ?? "all"], ["Subject filter", filters.subject || "All"], ["Cohort (examination year)", data.yearName], ["Grade filter", filters.grade || "All"],
    ["Candidate search", filters.search || "None"], ["Registered candidates", data.summary.registered], ["Submitted results", data.summary.submitted],
    ["Search scope", "Candidate name/number search applies to candidate worksheets only. Summary filters are examination year (cohort), gender, subject, and grade."],
    ["Submission completion (%)", percentage(data.summary.submitted, data.summary.registered)], ["Absent candidates", data.summary.absent], ["Missing candidates", data.summary.missing], ["Withheld candidates", data.summary.withheld],
    ["Mean official KCSE grade points", data.examinationType === "KCSE" ? data.summary.mean_points : "Not applicable; learning areas reported independently"],
    ["Mean official KCSE marks", data.examinationType === "KCSE" ? data.summary.mean_marks : "Not applicable"], ["Last result updated", data.lastUpdated],
  ] }, { name: "Grade distribution", headers: ["Grade or level", "Submitted outcomes", "Share (%)", "Male", "Female"], rows: distributionRows(data).map((row) => [row.grade, row.count, row.percent, row.male, row.female]) },
  { name: "Subject performance", headers: ["Code", "Subject", "Registered", "Submitted", "Absent", "Missing or withheld", "Mean grade points", "Mean marks", "Highest marks", "Lowest marks", "Highest points", "Lowest points", "Male grade points", "Female grade points"], rows: data.subjects.map((row) => [row.subject_code, row.subject_name, row.registered, row.sat, row.absent, row.missing, row.mean_points, row.mean_marks, row.highest, row.lowest, row.highest_points, row.lowest_points, row.male_mean, row.female_mean]) },
  { name: "Subject grade distribution", headers: ["Subject code", "Grade or level", "Submitted outcomes"], rows: data.subjectGrades.map((row) => [row.subject_code ?? "", row.grade, row.count]) },
  { name: "Gender analysis", headers: ["Gender", "Registered", "Submitted", "Mean grade points", "Mean marks"], rows: data.gender.map((row) => [row.gender, row.registered, row.submitted, row.mean_points, row.mean_marks]) },
  { name: "Historical comparisons", headers: ["Year", "Subject code or overall", "Registered", "Submitted", "Mean grade points", "Mean marks"], rows: data.trends.map((row) => [row.year, row.subject_code ?? "Official KCSE mean", row.registered, row.submitted, row.mean_points, row.mean_marks]) },
  { name: "Subject trends", headers: ["Year", "Subject code", "Registered", "Submitted", "Mean subject points", "Mean marks"], rows: data.subjectHistory.map((row) => [row.year, row.subject_code, row.registered, row.submitted, row.mean_points, row.mean_marks]) },
  { name: "Gender trends", headers: ["Year", "Gender", "Registered", "Submitted", "Mean points"], rows: data.genderHistory.map((row) => [row.year, row.gender, row.registered, row.submitted, row.mean_points]) },
  { name: "Grade trends", headers: ["Year", "Grade or outcome", "Submitted outcomes"], rows: data.gradeHistory.map((row) => [row.year, row.grade, row.count]) },
  { name: "Intervention insights", headers: ["Finding"], rows: performanceInsights(data, filters.subject).map((value) => [value]) }];
  if (data.examinationType === "KCSE" && (!data.candidature || !filters.subject)) sections.push({ name: "University threshold", headers: ["Indicator", "Value"], rows: [
    ["Configured general mean-grade threshold", data.degreeThreshold], ["Candidates meeting threshold", data.summary.qualified], ["Share of submitted mean grades (%)", percentage(data.summary.qualified, data.summary.submitted)],
    ["Below general threshold", data.summary.submitted - data.summary.qualified], ["Scope", "General mean-grade requirement only; programme-specific subjects and placement are not determined here."],
    ...data.gender.map((row): Cell[] => [`${row.gender} meeting threshold`, row.qualified]),
  ] });
  if (data.candidature) {
    const genders = (["male", "female"] as const).filter((gender) => !filters.gender || filters.gender === "all" || filters.gender === gender);
    const bulk = data.candidature;
    sections[0].rows.push(["Data source", "Whole-school bulk candidature. Individual registrations are retained separately and are not added to these counts."], ["Examination / centre number", bulk.examinationNumber]);
    const row = (label: string, gender: "male" | "female", attendance: typeof bulk.male): Cell[] => [label, gender, attendance.registered, attendance.present, attendance.absent, attendance.submitted, attendance.withheld, attendance.reasons.map((item) => `${item.reason}: ${item.count}`).join("; ") || "No absences"];
    const headers = ["Scope", "Gender", "Registered", "Present", "Absent", "Results submitted", "Withheld", "Absence reasons"];
    sections.push({ name: "Candidature and attendance", headers, rows: genders.map((gender) => row("Whole school", gender, bulk[gender])) });
    sections.push({ name: "Subject attendance", headers, rows: bulk.subjects.filter((subject) => !filters.subject || filters.subject === subject.subjectCode).flatMap((subject) => genders.map((gender) => row(`${subject.subjectName} (${subject.subjectCode})`, gender, subject[gender]))) });
  }
  if (data.access.canViewCandidates && !data.candidature) {
    sections.push({ name: "Candidate performance", headers: ["Name", "Examination number", "Gender", "Cohort (exam year)", "Status", ...(data.examinationType === "KCSE" ? ["Official mean grade", "Official mean marks", "Meets general threshold"] : [])], rows: data.candidates.map((candidate) => [candidate.candidate_name, candidate.examination_number, candidate.gender, data.yearName, candidate.status, ...(data.examinationType === "KCSE" ? [candidate.overall_grade, candidate.overall_score, candidate.status === "submitted" ? qualifies(data, candidate.overall_grade) ? "Yes" : "No" : "Result unavailable"] : [])]) });
    sections.push({ name: "Candidate subject results", headers: ["Examination number", "Subject code", "Subject", "Status", "Grade or level", "Marks"], rows: data.candidates.flatMap((candidate) => candidate.subjects.map((subject) => [candidate.examination_number, subject.subject_code, subject.subject_name, subject.status, subject.grade, subject.score])) });
  }
  return sections;
}

export async function exportExaminationReport(format: "excel" | "pdf", dashboard: ExaminationDashboard, filters: ExaminationFilters, load: ExaminationAdapter["load"]) {
  const data = { ...dashboard, candidates: [...dashboard.candidates] };
  if (data.access.canViewCandidates && !data.candidature) {
    data.candidates = [];
    for (let page = 1; ; page++) {
      const result = await load({ ...filters, page, pageSize: 500 });
      if (result.school.id !== data.school.id || result.yearId !== data.yearId || !result.access.canViewCandidates) throw new Error("Candidate access changed while preparing the report. Please retry.");
      data.candidates.push(...result.candidates);
      if (page * 500 >= result.candidateCount || !result.candidates.length) break;
    }
  }
  const sections = examinationReportSections(data, filters);
  const filename = `${data.school.school_code}-${data.examinationType}-${data.yearName}`.replace(/[^a-z0-9-]/gi, "_");
  if (format === "excel") {
    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "SCSMS";
    workbook.created = new Date();
    for (const section of sections) {
      const sheet = workbook.addWorksheet(section.name.slice(0, 31));
      sheet.addRow(section.headers);
      section.rows.forEach((row) => sheet.addRow(row));
      sheet.views = [{ state: "frozen", ySplit: 1 }];
      sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: section.headers.length } };
      sheet.columns.forEach((column, index) => { column.width = Math.min(50, Math.max(18, section.headers[index].length + 3)); });
      sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } };
      sheet.eachRow((row) => { row.alignment = { vertical: "top", wrapText: true }; });
    }
    downloadBlob(new Blob([new Uint8Array(await workbook.xlsx.writeBuffer()).buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${filename}.xlsx`);
    return;
  }
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const document = new jsPDF({ orientation: "landscape", format: "a4" });
  document.setFontSize(18); document.setTextColor(23, 37, 84);
  const title: string[] = document.splitTextToSize(`${data.school.display_name} - Examination Performance Report`, 268);
  document.text(title, 14, 16);
  let y = 20 + title.length * 7;
  document.setFontSize(10); document.setTextColor(71, 85, 105);
  document.text(`${data.school.school_code} | ${data.examinationType} | ${data.yearName} | Generated ${new Date().toLocaleString("en-GB", { timeZone: "Africa/Nairobi" })} (EAT)`, 14, y);
  y += 10;
  for (const section of sections) {
    if (y > 175) { document.addPage(); y = 16; }
    document.setFontSize(12); document.setTextColor(23, 37, 84); document.text(section.name, 14, y);
    autoTable(document, { head: [section.headers], body: section.rows.length ? section.rows.map((row) => row.map((cell) => cell === null || cell === undefined ? "Not recorded" : typeof cell === "number" ? displayNumber(cell) : cell)) : [["No records for the selected filters."]], startY: y + 3, margin: { top: 15, bottom: 17, left: 14, right: 14 }, styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" }, headStyles: { fillColor: [29, 78, 216] }, alternateRowStyles: { fillColor: [244, 247, 251] } });
    y = ((document as typeof document & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 20) + 12;
  }
  for (let page = 1; page <= document.getNumberOfPages(); page++) {
    document.setPage(page); document.setFontSize(8); document.setTextColor(100, 116, 139);
    document.text(`SCSMS | ${data.school.school_code} | ${data.examinationType} ${data.yearName} | ${page}/${document.getNumberOfPages()}`, 14, 202);
  }
  downloadBlob(document.output("blob"), `${filename}.pdf`);
}
