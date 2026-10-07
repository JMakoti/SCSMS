"use client";

import {
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  FileBarChart2,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  School,
  UserCog,
  Users,
} from "lucide-react";
import PageHeader from "../ui/page-header";
import { useAcademicYear } from "../academic-years/academic-year-context";
import { AcademicYearSelector } from "../academic-years/academic-year-selector";
import { useFeatureData } from "../data/feature-data-context";
export function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = "blue",
  trend,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  detail: string;
  tone?: string;
  trend?: string;
}) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}>
        <Icon />
      </div>
      <div className="stat-content">
        <span className="stat-label">{label}</span>
        <strong>{value}</strong>
        <span className="stat-detail">
          {detail} {trend && <b className="trend">{trend}</b>}
        </span>
      </div>
      <MoreHorizontal className="stat-menu" />
    </div>
  );
}

export function MiniBarChart() {
  const { schools } = useFeatureData();
  const wardCounts = schools.reduce<Record<string, number>>(
    (acc, school) => {
      const ward = school.ward ?? "Not mapped";
      acc[ward] = (acc[ward] ?? 0) + 1;
      return acc;
    },
    {},
  );
  const max = Math.max(...Object.values(wardCounts));
  const bars = Object.entries(wardCounts)
    .map(([label, count]) => ({
      label,
      count,
      value: Math.round((count / max) * 100),
    }))
    .sort((a, b) =>
      a.label === "Not mapped"
        ? 1
        : b.label === "Not mapped"
          ? -1
          : a.label.localeCompare(b.label),
    );
  return (
    <div className="bar-chart">
      {bars.map((b) => (
        <div
          className={`bar-row ${b.label === "Not mapped" ? "not-mapped" : ""}`}
          key={b.label}
        >
          <span>{b.label}</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${b.value}%` }} />
          </div>
          <b>{b.count}</b>
        </div>
      ))}
    </div>
  );
}
export function DonutChart() {
  const { schools } = useFeatureData();
  const primary = schools.filter(
    (school) => school.institutionType === "PRIMARY",
  ).length;
  const jss = schools.filter(
    (school) => school.institutionType === "JUNIOR_SECONDARY",
  ).length;
  const senior = schools.filter(
    (school) => school.institutionType === "SENIOR_SECONDARY",
  ).length;
  return (
    <div className="donut-wrap">
      <div className="donut">
        <div className="donut-inner">
          <strong>{schools.length}</strong>
          <span>schools</span>
        </div>
      </div>
      <div className="legend">
        <span>
          <i className="legend-blue" />
          Primary <b>{primary}</b>
        </span>
        <span>
          <i className="legend-indigo" />
          JSS <b>{jss}</b>
        </span>
        <span>
          <i className="legend-sky" />
          Senior <b>{senior}</b>
        </span>
      </div>
    </div>
  );
}

function Dashboard({ setActive }: { setActive: (v: string) => void }) {
  const { currentAcademicYear } = useAcademicYear();
  const {
    schools,
    schoolYears,
    dashboardGenderDistribution,
    dashboardRecentActivities,
    pendingSyncCount,
  } = useFeatureData();
  const activityIcons = { Pencil, Plus, Users, UserCog };
  const currentSchoolYears = schoolYears.filter(
    (schoolYear) => schoolYear.academicYearId === currentAcademicYear.id,
  );
  const totalStudents = currentSchoolYears.reduce(
    (sum, schoolYear) => sum + schoolYear.studentCount,
    0,
  );
  const totalTeachers = currentSchoolYears.reduce(
    (sum, schoolYear) => sum + schoolYear.teacherCount,
    0,
  );
  const primarySchools = schools.filter(
    (school) => school.institutionType === "PRIMARY",
  ).length;
  const seniorSchools = schools.filter(
    (school) => school.institutionType === "SENIOR_SECONDARY",
  ).length;
  const completeSchoolCount = schools.filter(
    (school) =>
      [school.schoolCode, school.phone, school.email, school.ward, school.location]
        .filter(Boolean).length === 5,
  ).length;
  const incompleteSchoolCount = schools.length - completeSchoolCount;
  const completeness = schools.length
    ? Math.round((completeSchoolCount / schools.length) * 100)
    : 0;
  const totalGenderLearners = dashboardGenderDistribution.reduce(
    (sum, item) => sum + item.value,
    0,
  );
  const maleShare = Math.round(
    ((dashboardGenderDistribution.find((item) => item.label === "Male")
      ?.value ?? 0) /
      (totalGenderLearners || 1)) *
      100,
  );

  return (
    <div className="content">
      <PageHeader
        title="Dashboard"
        description="Overview of schools, learners, staff and education infrastructure"
        action={<AcademicYearSelector variant="dashboard" />}
      />
      <div className="status-banner">
        <div className="status-banner-icon">
          <Check />
        </div>
        <div>
          <strong>
            {pendingSyncCount
              ? `${pendingSyncCount} local changes are waiting to sync`
              : "All local changes are saved"}
          </strong>
          <span>
            Changes are synchronized when connectivity is available.
          </span>
        </div>
        <button onClick={() => setActive("Synchronization")}>
          View sync queue <ChevronRight />
        </button>
      </div>
      <div className="stats-grid">
        <StatCard
          icon={School}
          label="Total Schools"
          value={String(schools.length)}
          detail="Registered school records"
        />
        <StatCard
          icon={Users}
          label="Total Students"
          value={totalStudents.toLocaleString()}
          detail={`Enrollment data ${currentAcademicYear.name}`}
          tone="indigo"
        />
        <StatCard
          icon={UserCog}
          label="Teaching Staff"
          value={totalTeachers.toLocaleString()}
          detail={`Teaching staff ${currentAcademicYear.name}`}
          tone="sky"
        />
        <StatCard
          icon={Building2}
          label="Primary Schools"
          value={String(primarySchools)}
          detail="Permanent classification"
          tone="slate"
        />
        <StatCard
          icon={ClipboardCheck}
          label="Senior Secondary"
          value={String(seniorSchools)}
          detail="Verified / partially verified"
          tone="amber"
        />
        <StatCard
          icon={RefreshCw}
          label="Pending Sync Changes"
          value={String(pendingSyncCount)}
          detail="Waiting to sync"
          tone="violet"
        />
      </div>
      <div className="dashboard-grid">
        <section className="panel chart-panel ward-chart-panel">
          <div className="panel-header">
            <div>
              <h2>Schools by Ward</h2>
              <p>Registered schools across the sub-county</p>
            </div>
            <button className="panel-action">
              This year <ChevronDown />
            </button>
          </div>
          <MiniBarChart />
        </section>
        <section className="panel chart-panel">
          <div className="panel-header">
            <div>
              <h2>Schools by Level</h2>
              <p>Distribution by education level</p>
            </div>
            <button className="icon-button">
              <MoreHorizontal />
            </button>
          </div>
          <DonutChart />
        </section>
        <section className="panel wide-chart">
          <div className="panel-header">
            <div>
              <h2>Enrollment by Grade</h2>
              <p>
                Total learners enrolled - Academic Year{" "}
                {currentAcademicYear.name}
              </p>
            </div>
            <div className="chart-legend">
              <span>
                <i />
                Male
              </span>
              <span>
                <i className="female" />
                Female
              </span>
            </div>
          </div>
          <div className="line-chart">
            <div className="y-axis">
              <span>8k</span>
              <span>6k</span>
              <span>4k</span>
              <span>2k</span>
              <span>0</span>
            </div>
            <div className="line-area">
              <div className="grid-lines" />
              <svg
                viewBox="0 0 600 160"
                preserveAspectRatio="none"
                aria-label="Enrollment by grade chart"
              >
                <path
                  d="M0 112 L75 82 L150 94 L225 62 L300 72 L375 44 L450 51 L525 28 L600 40"
                  fill="none"
                  stroke="#1d4ed8"
                  strokeWidth="3"
                />
                <path
                  d="M0 128 L75 110 L150 116 L225 92 L300 104 L375 84 L450 93 L525 72 L600 82"
                  fill="none"
                  stroke="#7dd3fc"
                  strokeWidth="3"
                />
                <path
                  d="M0 112 L75 82 L150 94 L225 62 L300 72 L375 44 L450 51 L525 28 L600 40 L600 160 L0 160Z"
                  fill="url(#blueFill)"
                  opacity=".18"
                />
                <defs>
                  <linearGradient id="blueFill" x1="0" x2="0" y1="0" y2="1">
                    <stop stopColor="#1d4ed8" />
                    <stop offset="1" stopColor="#eff6ff" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="x-axis">
                <span>Grade 1</span>
                <span>Grade 2</span>
                <span>Grade 3</span>
                <span>Grade 4</span>
                <span>Grade 5</span>
                <span>Grade 6</span>
                <span>Grade 7</span>
                <span>Grade 8</span>
                <span>Grade 9</span>
              </div>
            </div>
          </div>
        </section>
        <section className="panel gender-detail dashboard-gender">
          <div className="panel-header">
            <div>
              <h2>Gender Distribution</h2>
              <p>Total learner distribution</p>
            </div>
            <button className="icon-button">
              <MoreHorizontal />
            </button>
          </div>
          <div className="gender-chart-wrap">
            <div
              className="gender-donut"
              style={{
                background: `conic-gradient(#2563eb 0 ${maleShare}%, #38bdf8 ${maleShare}% 100%)`,
              }}
              aria-label={`Gender distribution: ${maleShare}% male and ${100 - maleShare}% female`}
            >
              <div>
                <strong>{maleShare}%</strong>
                <span>male</span>
              </div>
            </div>
            <div className="gender-legend">
              {dashboardGenderDistribution.map((item) => (
                <span key={item.label}>
                  <i className={`gender-${item.tone}`} />
                  {item.label}
                  <b>{item.value.toLocaleString()}</b>
                </span>
              ))}
            </div>
          </div>
        </section>
        <section className="panel completeness">
          <div className="panel-header">
            <div>
              <h2>Data Completeness</h2>
              <p>Quality of school records</p>
            </div>
            <button className="icon-button">
              <MoreHorizontal />
            </button>
          </div>
          <div className="completeness-body">
            <div className="completion-ring">
              <strong>{completeness}%</strong>
              <span>Complete</span>
            </div>
            <div className="completion-stats">
              <div>
                <i className="complete-dot" />
                <span>Complete records</span>
                <b>{completeSchoolCount.toLocaleString()}</b>
              </div>
              <div>
                <i className="incomplete-dot" />
                <span>Incomplete records</span>
                <b>{incompleteSchoolCount.toLocaleString()}</b>
              </div>
              <button onClick={() => setActive("Data Quality")}>
                View data quality <ChevronRight />
              </button>
            </div>
          </div>
        </section>
      </div>
      <div className="bottom-grid">
        <section className="panel activity-panel">
          <div className="panel-header">
            <div>
              <h2>Recent Activity</h2>
              <p>Latest changes across the registry</p>
            </div>
            <button
              className="text-button"
              onClick={() => setActive("Audit Logs")}
            >
              View all <ChevronRight />
            </button>
          </div>
          <div className="activity-list">
            {dashboardRecentActivities.map((activity) => (
              <ActivityRow
                key={`${activity.title}-${activity.entity}`}
                icon={activityIcons[activity.icon]}
                title={activity.title}
                entity={activity.entity}
                time={activity.time}
                tone={activity.tone}
              />
            ))}
          </div>
        </section>
        <section className="panel quick-panel">
          <div className="panel-header">
            <div>
              <h2>Quick actions</h2>
              <p>Common tasks and shortcuts</p>
            </div>
          </div>
          <div className="quick-actions">
            <button onClick={() => setActive("Schools")}>
              <Plus />
              <span>Add School</span>
              <kbd>Ctrl N</kbd>
            </button>
            <button onClick={() => setActive("Staff")}>
              <UserCog />
              <span>Add Staff</span>
            </button>
            <button onClick={() => setActive("Enrollment")}>
              <Users />
              <span>Enter Enrollment</span>
            </button>
            <button onClick={() => setActive("Reports")}>
              <FileBarChart2 />
              <span>Generate Report</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
export function ActivityRow({
  icon: Icon,
  title,
  entity,
  time,
  tone,
}: {
  icon: React.ElementType;
  title: string;
  entity: string;
  time: string;
  tone: string;
}) {
  return (
    <div className="activity-row">
      <div className={`activity-icon ${tone}`}>
        <Icon />
      </div>
      <div>
        <strong>{title}</strong>
        <span>{entity}</span>
      </div>
      <time>{time}</time>
    </div>
  );
}

export default Dashboard;
