"use client";
import { SchoolExaminationDashboard } from "../examinations/school-examination-dashboard";

export default function PerformanceContent({ school, schoolId }: { detail?: boolean; school?: string; schoolId?: string; overview?: boolean }) {
  if (!school) return <section className="panel detail-panel"><p>Select a school to view its examination performance.</p></section>;
  return <SchoolExaminationDashboard schoolName={school} schoolId={schoolId} />;
}
