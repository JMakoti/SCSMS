import { gradePoints, gradesFor, type ExaminationDashboard } from "./model";

export const displayNumber = (value: number | null | undefined, digits = 2) => value === null || value === undefined || !Number.isFinite(Number(value)) ? "Not recorded" : Number(value).toLocaleString("en-GB", { maximumFractionDigits: digits });
export const percentage = (part: number, total: number) => total ? 100 * part / total : null;
export const displayPercentage = (value: number | null) => value === null ? "Not recorded" : `${displayNumber(value, 1)}%`;
export function comparisonText(current: number, previous: number | undefined, year: string | undefined) {
  if (previous === undefined || !year) return "No previous comparable year";
  const delta = current - previous;
  return `${delta > 0 ? "↑ +" : delta < 0 ? "↓ " : "→ "}${displayNumber(delta)}${previous ? ` (${displayPercentage(percentage(delta, previous))})` : ""} vs ${year}`;
}
export function distributionRows(data: ExaminationDashboard) {
  const total = data.distribution.reduce((sum, row) => sum + row.count, 0);
  return gradesFor(data.examinationType).map((grade) => {
    const rows = data.distribution.filter((row) => row.grade === grade);
    const count = rows.reduce((sum, row) => sum + row.count, 0);
    return { grade, count, percent: percentage(count, total), male: rows.filter((row) => row.gender === "male").reduce((sum, row) => sum + row.count, 0), female: rows.filter((row) => row.gender === "female").reduce((sum, row) => sum + row.count, 0) };
  });
}
export function performanceInsights(data: ExaminationDashboard, subject = "") {
  const insights: string[] = [];
  const comparable = data.subjects.filter((row) => row.sat >= 5 && row.mean_points !== null).sort((a, b) => (b.mean_points ?? 0) - (a.mean_points ?? 0));
  if (comparable.length > 1) {
    insights.push(`${comparable[0].subject_name} has the strongest subject mean (${displayNumber(comparable[0].mean_points)} points; ${comparable[0].sat} submitted results).`);
    const weakest = comparable[comparable.length - 1];
    insights.push(`Review learning support in ${weakest.subject_name}, which has the lowest comparable subject mean (${displayNumber(weakest.mean_points)} points; ${weakest.sat} results).`);
  }
  const trends = data.trends.filter((row) => !subject || row.subject_code === subject).filter((row) => row.mean_points !== null);
  if ((data.examinationType === "KCSE" && !subject) || subject) {
    const current = trends.find((row) => row.year === data.yearName);
    const previous = trends.filter((row) => row.year < data.yearName).sort((a, b) => b.year.localeCompare(a.year))[0];
    if (current && previous && current.submitted >= 5 && previous.submitted >= 5) {
      const change = Number(current.mean_points) - Number(previous.mean_points);
      insights.push(`Mean performance ${Math.abs(change) < 0.01 ? "was unchanged" : change > 0 ? "improved" : "declined"} compared with ${previous.year}${Math.abs(change) < 0.01 ? "." : ` by ${displayNumber(Math.abs(change))} grade points. Review the subject-level trends before planning interventions.`}`);
    }
  }
  if (data.summary.missing || data.summary.withheld) insights.push(`${data.summary.missing} candidate result(s) are missing and ${data.summary.withheld} are withheld. Resolve these before treating the analysis as complete.`);
  for (const row of comparable) {
    const prior = data.subjectHistory.filter((item) => item.subject_code === row.subject_code && item.year < data.yearName).sort((a, b) => b.year.localeCompare(a.year))[0];
    if (prior && prior.submitted >= 5 && prior.mean_points !== null && row.mean_points !== null) {
      const delta = row.mean_points - prior.mean_points;
      if (Math.abs(delta) >= 0.5) insights.push(`${row.subject_name} ${delta > 0 ? "improved" : "declined"} by ${displayNumber(Math.abs(delta))} points since ${prior.year}. ${delta < 0 ? "Review teaching support and the candidate subject results." : "Review and sustain the practices supporting this improvement."}`);
    }
  }
  const outcomes = distributionRows(data);
  const total = outcomes.reduce((sum, row) => sum + row.count, 0);
  const largest = [...outcomes].sort((a, b) => b.count - a.count)[0];
  if (total >= 5 && largest?.count) insights.push(`${largest.grade} is the most frequent recorded outcome: ${largest.count} of ${total} submitted ${data.examinationType === "KCSE" && !subject ? "candidate mean grades" : "learning-area outcomes"} (${displayPercentage(percentage(largest.count, total))}).`);
  const male = data.gender.find((row) => row.gender === "male");
  const female = data.gender.find((row) => row.gender === "female");
  if (male && female && male.submitted >= 5 && female.submitted >= 5 && male.mean_points !== null && female.mean_points !== null) {
    const gap = Math.abs(male.mean_points - female.mean_points);
    if (gap >= 0.5) insights.push(`The recorded male/female mean gap is ${displayNumber(gap)} points. Examine subject access, attendance, and learning support; these results do not establish gender as the cause.`);
  }
  if (!insights.length) insights.push("There is not yet enough comparable submitted data for a reliable intervention recommendation.");
  return insights;
}
export function qualifies(data: ExaminationDashboard, grade: string | null) {
  const value = gradePoints("KCSE", grade);
  return data.examinationType === "KCSE" && value !== null && value >= (gradePoints("KCSE", data.degreeThreshold) ?? 7);
}
