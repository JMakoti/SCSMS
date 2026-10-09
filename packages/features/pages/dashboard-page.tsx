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

const enrollmentGradeOrder = [
  "PP1",
  "PP2",
  "PP3",
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12",
];

function formatAxisValue(value: number) {
  if (value >= 1000) {
    const thousands = value / 1000;
    return `${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)}k`;
  }

  return String(value);
}

function buildLinePoints(values: number[], maxValue: number) {
  if (values.length === 0) return [];

  const width = 600;
  const height = 160;
  const denominator = Math.max(maxValue, 1);

  return values.map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
      const y = height - (value / denominator) * (height - 12);
      return {
        x: Number(x.toFixed(2)),
        y: Number(y.toFixed(2)),
      };
    });
}

function buildLinePath(points: Array<{ x: number; y: number }>) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`)
    .join(" ");
}

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
    enrollmentRows,
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
  const juniorSchools = schools.filter(
    (school) => school.institutionType === "JUNIOR_SECONDARY",
  ).length;
  const seniorSchools = schools.filter(
    (school) => school.institutionType === "SENIOR_SECONDARY",
  ).length;
  const publicSchools = schools.filter(
    (school) => school.ownershipType === "PUBLIC",
  ).length;
  const privateSchools = schools.filter(
    (school) => school.ownershipType === "PRIVATE",
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
  const enrollmentByGrade = enrollmentRows
    .filter((row) => row.academicYearId === currentAcademicYear.id)
    .reduce<Record<string, { male: number; female: number }>>((acc, row) => {
      const current = acc[row.grade] ?? { male: 0, female: 0 };
      current.male += row.male;
      current.female += row.female;
      acc[row.grade] = current;
      return acc;
    }, {});
  const chartGrades = enrollmentGradeOrder.filter(
    (grade) => enrollmentByGrade[grade],
  );
  const enrollmentChartRows = chartGrades.map((grade) => ({
    grade,
    male: enrollmentByGrade[grade]?.male ?? 0,
    female: enrollmentByGrade[grade]?.female ?? 0,
  }));
  const maxEnrollmentValue = Math.max(
    1,
    ...enrollmentChartRows.flatMap((row) => [row.male, row.female]),
  );
  const axisTop = Math.ceil(maxEnrollmentValue / 4) * 4;
  const axisValues = Array.from({ length: 5 }, (_, index) =>
    Math.round(axisTop - (axisTop / 4) * index),
  );
  const maleLinePoints = buildLinePoints(
    enrollmentChartRows.map((row) => row.male),
    axisTop,
  );
  const femaleLinePoints = buildLinePoints(
    enrollmentChartRows.map((row) => row.female),
    axisTop,
  );
  const maleLinePath = buildLinePath(maleLinePoints);
  const femaleLinePath = buildLinePath(femaleLinePoints);
  const firstMalePoint = maleLinePoints[0];
  const lastMalePoint = maleLinePoints[maleLinePoints.length - 1];
  const maleFillPath =
    firstMalePoint && lastMalePoint
      ? `${maleLinePath} L${lastMalePoint.x} 160 L${firstMalePoint.x} 160Z`
      : "";

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
          icon={School}
          label="Total Public Schools"
          value={String(publicSchools)}
          detail="Public ownership records"
        />
        <StatCard
          icon={School}
          label="Total Private Schools"
          value={String(privateSchools)}
          detail="Private ownership records"
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
          label="Junior Secondary"
          value={String(juniorSchools)}
          detail="Verified"
          tone="amber"
        />
        <StatCard
          icon={ClipboardCheck}
          label="Senior Secondary"
          value={String(seniorSchools)}
          detail="Verified "
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
              {axisValues.map((value) => (
                <span key={value}>{formatAxisValue(value)}</span>
              ))}
            </div>
            <div className="line-area">
              <div className="grid-lines" />
              {enrollmentChartRows.length === 0 ? (
                <div className="empty-state">
                  <Users />
                  <strong>No enrollment records</strong>
                  <span>
                    Add enrollment records for {currentAcademicYear.name}.
                  </span>
                </div>
              ) : (
                <svg
                  viewBox="0 0 600 160"
                  preserveAspectRatio="none"
                  aria-label="Enrollment by grade chart"
                >
                  <path
                    d={maleLinePath}
                    fill="none"
                    stroke="#1d4ed8"
                    strokeWidth="3"
                  />
                  <path
                    d={femaleLinePath}
                    fill="none"
                    stroke="#7dd3fc"
                    strokeWidth="3"
                  />
                  <path
                    d={maleFillPath}
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
              )}
              <div className="x-axis">
                {enrollmentChartRows.map((row) => (
                  <span key={row.grade}>{row.grade}</span>
                ))}
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
            {dashboardRecentActivities.map((activity, index) => (
              <ActivityRow
                key={activity.id ?? `${activity.title}-${activity.entity}-${activity.time}-${index}`}
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
