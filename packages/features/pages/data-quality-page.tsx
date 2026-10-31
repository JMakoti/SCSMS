"use client";

import Link from "next/link";
import { useState } from "react";
import { useCompleteness } from "../data/use-completeness";
import { useAcademicYear } from "../academic-years/academic-year-context";
import { AcademicYearSelector } from "../academic-years/academic-year-selector";
import PageHeader from "../ui/page-header";

export function DataQualityPage() {
  const report = useCompleteness();
  const { currentAcademicYear } = useAcademicYear();
  const [query, setQuery] = useState("");
  const [onlyIncomplete, setOnlyIncomplete] = useState(true);
  const records = report.records.filter((record) =>
    (!onlyIncomplete || record.completed < record.total) &&
    `${record.school.displayName} ${record.school.schoolCode ?? ""} ${record.groups.flatMap((group) => group.missing).join(" ")}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return <div className="content">
    <PageHeader title="Data Quality" description="Review missing school fields and academic year records" eyebrow="Administration" action={<AcademicYearSelector />} />
    <section className="panel completeness">
      <div className="panel-header"><div><h2>Data completeness</h2><p>{currentAcademicYear.name} · Recorded fields and records across all schools</p></div><strong className="quality-value">{report.percent}%</strong></div>
      <div className="progress" role="progressbar" aria-label="Overall data completeness" aria-valuemin={0} aria-valuemax={100} aria-valuenow={report.percent}><span style={{ width: `${report.percent}%` }} /></div>
      <p>{report.complete} complete schools · {report.incomplete} incomplete schools</p>
      <p>Checks basic information, location and contacts, enrollment by grade, and infrastructure records. Zero values and explicit No answers count as recorded.</p>
    </section>
    <section className="panel completeness" style={{ marginTop: 16 }}>
      <div className="panel-header"><h2>School records</h2><label><input type="checkbox" checked={onlyIncomplete} onChange={(event) => setOnlyIncomplete(event.target.checked)} /> Incomplete only</label></div>
      <label>Search schools or missing fields <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <div className="table-scroll"><table><thead><tr><th>School</th><th>Completeness</th><th>Missing data</th><th>Review</th></tr></thead><tbody>
        {records.map((record) => <tr key={record.school.id}>
          <td>{record.school.displayName}</td><td>{record.percent}% ({record.completed}/{record.total})</td>
          <td style={{ whiteSpace: "normal", minWidth: 260 }}>{record.groups.filter((group) => group.missing.length).map((group) => <p key={group.label}><b>{group.label}:</b> {group.missing.join(", ")}</p>)}{record.completed === record.total && "Complete"}</td>
          <td><Link className="text-button" href={`/schools?school=${encodeURIComponent(record.school.id)}`}>Review school</Link></td>
        </tr>)}
      </tbody></table></div>
      {!records.length && <p role="status">{report.records.length ? "No schools match the current filters." : "No school records available."}</p>}
    </section>
  </div>;
}
