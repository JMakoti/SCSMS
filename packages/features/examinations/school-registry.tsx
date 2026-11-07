"use client";
import { useState } from "react";
import Link from "next/link";
import { useFeatureData } from "../data/feature-data-context";
import PageHeader from "../ui/page-header";
import { examinationForLevel } from "./model";

export function PerformanceSchoolRegistry() {
  const { schools } = useFeatureData();
  const [search, setSearch] = useState("");
  const visible = schools.filter((school) => school.isActive && `${school.displayName} ${school.schoolCode ?? ""}`.toLowerCase().includes(search.trim().toLowerCase())).sort((a, b) => a.displayName.localeCompare(b.displayName));
  return <div className="content"><PageHeader title="School Performance" description="Select a school for its examination results, subject analysis and candidate records" />
    <section className="panel detail-panel"><label>Search school or code <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} /></label><div className="table-scroll"><table><thead><tr><th>School</th><th>School code</th><th>Examination</th><th>Performance</th></tr></thead><tbody>{visible.map((school) => <tr key={school.id}><td>{school.displayName}</td><td>{school.schoolCode ?? "Not recorded"}</td><td>{examinationForLevel(school.institutionType) ?? "Level required"}</td><td><Link className="text-button" href={`/performance?item=${encodeURIComponent(school.displayName)}&school=${encodeURIComponent(school.id)}`}>Open school performance</Link></td></tr>)}</tbody></table></div>{!visible.length && <p>No schools match your search.</p>}</section>
  </div>;
}
