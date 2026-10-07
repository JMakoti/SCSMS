"use client";

import { useMemo } from "react";
import { useFeatureData } from "../data/feature-data-context";

function formatScore(value: number | null) {
  return value === null ? "Not recorded" : String(value);
}

function latestFirst<T extends { year: string }>(records: T[]) {
  return [...records].sort((a, b) => b.year.localeCompare(a.year));
}

function OverviewPerformance({
  school,
  records,
  subjects,
}: {
  school: string;
  records: ReturnType<typeof useFeatureData>["performanceRecords"];
  subjects: ReturnType<typeof useFeatureData>["performanceSubjects"];
}) {
  const latest = latestFirst(records)[0];
  const subjectRows = latest
    ? subjects.filter((subject) => subject.performanceRecordId === latest.id)
    : [];
  const topSubjects = [...subjectRows]
    .filter((subject) => subject.averageScore !== null)
    .sort((a, b) => (b.averageScore ?? 0) - (a.averageScore ?? 0))
    .slice(0, 5);
  const chartRecords = latestFirst(records)
    .filter((record) => record.averageScore !== null)
    .reverse();
  const maxScore = Math.max(
    1,
    ...chartRecords.map((record) => record.averageScore ?? 0),
  );

  return (
    <section className="panel detail-panel performance-overview performance-overview-light overview-performance">
      <header className="performance-overview-heading performance-detail-heading">
        <div>
          <h2>Performance Overview</h2>
          <p>
            {school} - {latest ? `Latest recorded assessment: ${latest.year}.` : "No assessment records are available."}
          </p>
        </div>
      </header>
      <div className="performance-metric-grid">
        {[
          ["Candidates", latest?.candidates.toLocaleString() ?? "0", "01", latest?.assessmentName ?? "No assessment"],
          ["Assessments", String(records.length), "AS", "Recorded assessments"],
          ["Best subject", topSubjects[0]?.subject ?? "Not recorded", "BEST", formatScore(topSubjects[0]?.averageScore ?? null)],
          ["Pass rate", latest?.passRate === null || latest?.passRate === undefined ? "Not recorded" : `${latest.passRate}%`, "RATE", latest?.status ?? "No assessment"],
        ].map(([label, value, icon, note]) => (
          <article className="performance-metric-card" key={label}>
            <span>{label}</span>
            <b>{icon}</b>
            <strong>{value}</strong>
            <small>{note}</small>
          </article>
        ))}
      </div>
      <div className="overview-content-grid">
        <section className="overview-card">
          <div className="performance-section-title">
            <div>
              <h3>Learning Area Performance</h3>
              <p>{latest?.year ?? "No recorded assessment year"}</p>
            </div>
            <strong>{latest?.assessmentName ?? "No assessment"}</strong>
          </div>
          <div className="overview-area-list">
            {topSubjects.map((subject, index) => {
              const score = subject.averageScore ?? 0;
              const width = maxScore ? `${(score / maxScore) * 100}%` : "0%";
              return (
                <div className="overview-area" key={subject.id}>
                  <div>
                    <b>{subject.subject}</b>
                    <span>{formatScore(subject.averageScore)}</span>
                  </div>
                  <i
                    className={index % 3 === 1 ? "area-orange" : ""}
                    style={{ width }}
                  />
                </div>
              );
            })}
            {topSubjects.length === 0 && (
              <p>No subject-level results have been recorded.</p>
            )}
          </div>
        </section>
        <section className="overview-card">
          <div className="performance-section-title">
            <div>
              <h3>Assessment Summary</h3>
              <p>Values recorded in the database</p>
            </div>
          </div>
          <div className="overview-level-list">
            {[
              ["Candidates", latest?.candidates.toLocaleString() ?? "0"],
              ["Average score", formatScore(latest?.averageScore ?? null)],
              [
                "Pass rate",
                latest?.passRate === null || latest?.passRate === undefined
                  ? "Not recorded"
                  : `${latest.passRate}%`,
              ],
              ["Status", latest?.status ?? "No assessment"],
            ].map(([label, value]) => (
              <div className="overview-level" key={label}>
                <span className="level-meeting">●</span>
                <b>{label}</b>
                <small>{value}</small>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="performance-trend-panel">
        <div className="performance-section-title">
          <div>
            <h3>Performance Trend</h3>
            <p>Recorded average score by academic year</p>
          </div>
          <button type="button" disabled>
            All assessments
          </button>
        </div>
        <div className="performance-bars">
          {chartRecords.map((record) => (
            <div className="performance-bar-column" key={record.id}>
              <div
                className="performance-bar"
                style={{
                  height: `${Math.max(4, ((record.averageScore ?? 0) / maxScore) * 100)}px`,
                }}
              />
              <strong>{formatScore(record.averageScore)}</strong>
              <small>{record.year}</small>
            </div>
          ))}
          {chartRecords.length === 0 && <p>No assessment history is available.</p>}
        </div>
      </section>
    </section>
  );
}

export default function PerformanceContent({
  school,
  overview = false,
}: {
  detail?: boolean;
  school?: string;
  overview?: boolean;
}) {
  const { schools, performanceRecords, performanceSubjects } = useFeatureData();
  const selectedSchool =
    school ??
    [...schools].sort((a, b) => a.displayName.localeCompare(b.displayName))[0]
      ?.displayName ??
    "Not provided";
  const records = useMemo(
    () =>
      performanceRecords.filter((record) => record.school === selectedSchool),
    [performanceRecords, selectedSchool],
  );
  const latest = latestFirst(records)[0];
  const subjects = latest
    ? performanceSubjects.filter(
        (subject) => subject.performanceRecordId === latest.id,
      )
    : [];
  const bestSubject = [...subjects]
    .filter((subject) => subject.averageScore !== null)
    .sort((a, b) => (b.averageScore ?? 0) - (a.averageScore ?? 0))[0];

  if (overview) {
    return (
      <OverviewPerformance
        school={selectedSchool}
        records={records}
        subjects={performanceSubjects}
      />
    );
  }

  return (
    <section className="panel detail-panel performance-overview performance-overview-light">
      <header className="performance-overview-heading performance-detail-heading">
        <div>
          <h2>{latest?.assessmentName ?? "School Performance"}</h2>
          <p>
            {latest
              ? `${latest.assessmentType} assessment - ${latest.year}`
              : `No assessment records are available for ${selectedSchool}.`}
          </p>
        </div>
      </header>
      <div className="performance-metric-grid">
        {[
          ["Candidates", latest?.candidates.toLocaleString() ?? "0", "01", latest?.gradeBand ?? "No grade band recorded"],
          ["Overall mean", formatScore(latest?.averageScore ?? null), "M", latest?.assessmentName ?? "No assessment"],
          ["Best subject", formatScore(bestSubject?.averageScore ?? null), "BEST", bestSubject?.subject ?? "Not recorded"],
          [
            "Pass rate",
            latest?.passRate === null || latest?.passRate === undefined
              ? "Not recorded"
              : `${latest.passRate}%`,
            "RATE",
            latest?.status ?? "No assessment",
          ],
        ].map(([label, value, icon, note]) => (
          <article className="performance-metric-card" key={label}>
            <span>{label}</span>
            <b>{icon}</b>
            <strong>{value}</strong>
            <small>{note}</small>
          </article>
        ))}
      </div>
      <section className="performance-subject-panel">
        <div className="performance-section-title">
          <div>
            <h3>Subject Performance</h3>
            <p>Subject results recorded for {latest?.year ?? "the selected school"}</p>
          </div>
        </div>
        <div className="performance-table-scroll">
          <table className="performance-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Candidates</th>
                <th>Mean</th>
                <th>Pass rate</th>
                <th>Assessment</th>
                <th>Academic year</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((subject) => (
                <tr key={subject.id}>
                  <th>{subject.subject}</th>
                  <td>{subject.candidates}</td>
                  <td className="score-good">{formatScore(subject.averageScore)}</td>
                  <td>
                    {subject.passRate === null
                      ? "Not recorded"
                      : `${subject.passRate}%`}
                  </td>
                  <td>{latest?.assessmentName ?? "Not recorded"}</td>
                  <td>{latest?.year ?? "Not recorded"}</td>
                  <td>
                    <span className="performance-status">
                      {latest?.status ?? "Not recorded"}
                    </span>
                  </td>
                </tr>
              ))}
              {subjects.length === 0 && (
                <tr>
                  <td colSpan={7}>No subject-level results have been recorded.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section className="performance-trend-panel">
        <div className="performance-section-title">
          <div>
            <h3>Performance Trend</h3>
            <p>Recorded average score by academic year</p>
          </div>
          <button type="button" disabled>
            All assessments
          </button>
        </div>
        <div className="performance-bars">
          {latestFirst(records)
            .filter((record) => record.averageScore !== null)
            .reverse()
            .map((record) => (
              <div className="performance-bar-column" key={record.id}>
                <div
                  className="performance-bar"
                  style={{
                    height: `${Math.max(4, (record.averageScore ?? 0) * 4)}px`,
                  }}
                />
                <strong>{formatScore(record.averageScore)}</strong>
                <small>{record.year}</small>
              </div>
            ))}
          {!records.some((record) => record.averageScore !== null) && (
            <p>No assessment history is available.</p>
          )}
        </div>
      </section>
    </section>
  );
}
