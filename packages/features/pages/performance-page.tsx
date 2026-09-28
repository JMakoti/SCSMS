"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@scsms/ui/components/button";
import { rabaiSchools } from "../../../database/seeders/rabai-schools";

type AssessmentKey = "KCSE" | "KJSEA" | "KPSEA";

type SubjectPerformance = {
  subject: string;
  candidates: string;
  mean: string;
  exceeding: string;
  meeting: string;
  below: string;
  status: string;
};

type PerformanceSummary = {
  candidates: string;
  overallMean: string;
  bestSubject: string;
  bestScore: string;
  exceedingLearners: string;
  meetingLearners: string;
  approachingLearners: string;
  belowExpectation: string;
  belowLearners: string;
  year: string;
};

export function getSchoolAssessment(school: string): AssessmentKey {
  const normalized = school.toLowerCase();
  if (normalized.includes("junior") || normalized.includes("jss"))
    return "KJSEA";
  if (normalized.includes("secondary") || normalized.includes("senior"))
    return "KCSE";
  return "KPSEA";
}

const defaultPerformanceSchool =
  [...rabaiSchools].sort((a, b) =>
    a.displayName.localeCompare(b.displayName),
  )[0]?.displayName ?? "Not provided";

const assessments = {
  KPSEA: {
    title: "KPSEA",
    subtitle: "Kenya Primary School Education Assessment - Grade 6",
    candidates: "86",
    mean: "73%",
    best: "78%",
    bestSubject: "Creative Arts",
    below: "12%",
    belowLearners: "60 learners",
    areas: [
      "Mathematics",
      "English",
      "Kiswahili",
      "Science & Technology",
      "Social Studies",
      "Creative Arts",
    ],
    scores: ["74%", "70%", "73%", "68%", "76%", "78%"],
    years: ["60%", "64%", "68%", "72%"],
  },
  KJSEA: {
    title: "KJSEA",
    subtitle: "Kenya Junior School Education Assessment - Grade 9",
    candidates: "72",
    mean: "69%",
    best: "75%",
    bestSubject: "English",
    below: "15%",
    belowLearners: "54 learners",
    areas: [
      "Mathematics",
      "English",
      "Kiswahili",
      "Integrated Science",
      "Social Studies",
      "Creative Arts",
    ],
    scores: ["70%", "75%", "68%", "66%", "71%", "73%"],
    years: ["57%", "61%", "65%", "69%"],
  },
  KCSE: {
    title: "KCSE",
    subtitle: "Kenya Certificate of Secondary Education",
    candidates: "64",
    mean: "7.3",
    best: "8.1",
    bestSubject: "English",
    below: "18%",
    belowLearners: "42 learners",
    areas: [
      "English",
      "Kiswahili",
      "Mathematics",
      "Biology",
      "Chemistry",
      "History & Government",
    ],
    scores: ["8.1", "7.5", "7.2", "6.8", "7.4", "7.6"],
    years: ["6.4", "6.7", "7.0", "7.3"],
  },
} as const;

function numericValue(value: string) {
  return Number(value.replace(/[^\d.]/g, "")) || 0;
}

function calculatePercentage(value: string, total: string) {
  const count = numericValue(value);
  const totalCount = numericValue(total);
  if (!totalCount) return "0%";
  return `${Math.round((count / totalCount) * 100)}%`;
}

function formatLearnerShare(value: string, total: string) {
  const count = numericValue(value);
  return `${count} learners (${calculatePercentage(value, total)})`;
}

function learnersFromPercentage(total: string, percentage: string) {
  return String(
    Math.round((numericValue(total) * numericValue(percentage)) / 100),
  );
}

function buildSubjectRows(key: AssessmentKey): SubjectPerformance[] {
  const data = assessments[key];
  const exceeding = ["32%", "26%", "30%", "22%", "34%", "38%"];
  const meeting = ["44%", "48%", "46%", "48%", "44%", "42%"];
  const below = ["10%", "12%", "10%", "16%", "8%", "4%"];

  return data.areas.map((area, index) => ({
    subject: area,
    candidates: index === 5 ? "84" : data.candidates,
    mean: data.scores[index],
    exceeding: exceeding[index],
    meeting: meeting[index],
    below: below[index],
    status: index > 3 ? "Strong" : "Steady",
  }));
}

function OverviewPerformance({ school }: { school: string }) {
  const [summary] = useState<PerformanceSummary>({
    candidates: "184",
    overallMean: "72%",
    bestSubject: "Social Studies",
    bestScore: "74%",
    exceedingLearners: "61",
    meetingLearners: "77",
    approachingLearners: "33",
    belowExpectation: "7%",
    belowLearners: "13",
    year: "2026",
  });
  const areas = [
    ["Mathematics", "72%"],
    ["English", "68%"],
    ["Kiswahili", "71%"],
    ["Science & Technology", "65%"],
    ["Social Studies", "74%"],
  ];
  const levels = [
    [
      "Exceeding Expectation",
      formatLearnerShare(summary.exceedingLearners, summary.candidates),
      "level-exceeding",
    ],
    [
      "Meeting Expectation",
      formatLearnerShare(summary.meetingLearners, summary.candidates),
      "level-meeting",
    ],
    [
      "Approaching Expectation",
      formatLearnerShare(summary.approachingLearners, summary.candidates),
      "level-approaching",
    ],
    [
      "Below Expectation",
      formatLearnerShare(summary.belowLearners, summary.candidates),
      "level-below",
    ],
  ];

  return (
    <section className="panel detail-panel performance-overview performance-overview-light overview-performance">
      <header className="performance-overview-heading performance-detail-heading">
        <div>
          <h2>Performance Overview</h2>
          <p>
            {school} - Summary of the school assessment performance for{" "}
            {summary.year}.
          </p>
        </div>
      </header>
      <div className="performance-metric-grid">
        {[
          ["Candidates", summary.candidates, "01", "+12% from previous year"],
          ["Learning areas", "12", "LA", "Across Grade 1-9"],
          ["Projects", "4", "PR", "Assessment projects"],
          ["Performance", summary.overallMean, "UP", "+6.4% year-over-year"],
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
              <p>2026 assessment performance</p>
            </div>
            <strong>View details</strong>
          </div>
          <div className="overview-area-list">
            {areas.map(([name, score], index) => (
              <div className="overview-area" key={name}>
                <div>
                  <b>{name}</b>
                  <span>{score}</span>
                </div>
                <i
                  className={index % 3 === 1 ? "area-orange" : ""}
                  style={{ width: score }}
                />
              </div>
            ))}
          </div>
        </section>
        <section className="overview-card">
          <div className="performance-section-title">
            <div>
              <h3>Performance Levels</h3>
              <p>Learner distribution</p>
            </div>
          </div>
          <div className="overview-distribution">
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className="overview-level-list">
            {levels.map(([name, value, tone]) => (
              <div className="overview-level" key={name}>
                <span className={tone}>●</span>
                <b>{name}</b>
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
            <p>Historical school performance</p>
          </div>
          <button type="button">All assessments</button>
        </div>
        <div className="performance-bars">
          {["61%", "65%", "68%", "72%"].map((score, index) => (
            <div className="performance-bar-column" key={score}>
              <div
                className="performance-bar"
                style={{ height: `${42 + index * 12}px` }}
              />
              <strong>{score}</strong>
              <small>{2023 + index}</small>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

function SubjectPerformanceModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (subject: SubjectPerformance) => void;
}) {
  const [form, setForm] = useState<SubjectPerformance>({
    subject: "",
    candidates: "",
    mean: "",
    exceeding: "",
    meeting: "",
    below: "",
    status: "Steady",
  });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.subject.trim()) return;
    onSave({
      ...form,
      exceeding: formatLearnerShare(form.exceeding, form.candidates),
      meeting: formatLearnerShare(form.meeting, form.candidates),
      below: formatLearnerShare(form.below, form.candidates),
    });
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="form-dialog performance-form-dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dialog-head">
          <div>
            <span className="eyebrow">Subject Performance</span>
            <h2>Add subject performance</h2>
            <p>Add a subject and its assessment performance details.</p>
          </div>
          <button className="icon-button" onClick={onClose} type="button">
            <X />
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="form-section">
            <h3>Subject details</h3>
            <div className="form-grid">
              {[
                ["Subject", "subject"],
                ["Mean", "mean"],
              ].map(([label, name]) => (
                <label key={name}>
                  {label}
                  <input
                    value={form[name as keyof SubjectPerformance]}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        [name]: event.target.value,
                      }))
                    }
                    placeholder={name === "subject" ? "Mathematics" : "72%"}
                  />
                </label>
              ))}
              <label>
                Candidates
                <input
                  type="number"
                  min="0"
                  value={form.candidates}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      candidates: event.target.value,
                    }))
                  }
                />
              </label>
              {[
                ["Exceeding", "exceeding"],
                ["Meeting", "meeting"],
                ["Below", "below"],
              ].map(([label, name]) => (
                <label key={name}>
                  {label}
                  <input
                    type="number"
                    min="0"
                    value={form[name as keyof SubjectPerformance]}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        [name]: event.target.value,
                      }))
                    }
                  />
                  <span className="calculated-percentage">
                    {calculatePercentage(
                      form[name as keyof SubjectPerformance],
                      form.candidates,
                    )}
                  </span>
                </label>
              ))}
              <label>
                Status
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                >
                  <option>Strong</option>
                  <option>Steady</option>
                  <option>Needs support</option>
                </select>
              </label>
            </div>
          </div>
          <div className="dialog-footer">
            <button className="outline-button" type="button" onClick={onClose}>
              Cancel
            </button>
            <Button className="modal-primary-button" type="submit">
              Add subject
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PerformanceContent({
  school = defaultPerformanceSchool,
  overview = false,
}: {
  detail?: boolean;
  school?: string;
  overview?: boolean;
}) {
  const assessmentKey = getSchoolAssessment(school);
  const data = assessments[assessmentKey];
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [summary] = useState<PerformanceSummary>({
    candidates: data.candidates,
    overallMean: data.mean,
    bestSubject: data.bestSubject,
    bestScore: data.best,
    exceedingLearners: learnersFromPercentage(data.candidates, "32%"),
    meetingLearners: learnersFromPercentage(data.candidates, "44%"),
    approachingLearners: learnersFromPercentage(data.candidates, "12%"),
    belowExpectation: data.below,
    belowLearners: learnersFromPercentage(data.candidates, data.below),
    year: "2026",
  });
  const [subjects, setSubjects] = useState(() =>
    buildSubjectRows(assessmentKey),
  );
  const metricCards = useMemo(
    () => [
      ["Candidates", summary.candidates, "01", `Grade 6 - ${summary.year}`],
      ["Overall mean", summary.overallMean, "M", "+4.2% vs previous year"],
      ["Best subject", summary.bestScore, "BEST", summary.bestSubject],
      [
        "Below expectation",
        summary.belowExpectation,
        "LOW",
        `${numericValue(summary.belowLearners)} learners`,
      ],
    ],
    [summary],
  );

  if (overview) return <OverviewPerformance school={school} />;

  return (
    <section className="panel detail-panel performance-overview performance-overview-light">
      {showSubjectModal && (
        <SubjectPerformanceModal
          onClose={() => setShowSubjectModal(false)}
          onSave={(subject) => {
            setSubjects((current) => [...current, subject]);
            setShowSubjectModal(false);
          }}
        />
      )}
      <header className="performance-overview-heading performance-detail-heading">
        <div>
          <h2>{data.title}</h2>
          <p>{data.subtitle}</p>
        </div>
      </header>
      <div className="performance-metric-grid">
        {metricCards.map(([label, value, icon, note]) => (
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
            <p>
              Candidates who sat each subject and their mean score -{" "}
              {summary.year}
            </p>
          </div>
          <Button
            className="edit-school-button performance-add-subject-button"
            onClick={() => setShowSubjectModal(true)}
          >
            <Plus data-icon="inline-start" />
            Add subject
          </Button>
        </div>
        <div className="performance-table-scroll">
          <table className="performance-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Candidates</th>
                <th>Mean</th>
                <th>Exceeding</th>
                <th>Meeting</th>
                <th>Below</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((subject) => (
                <tr key={`${subject.subject}-${subject.mean}`}>
                  <th>{subject.subject}</th>
                  <td>{subject.candidates}</td>
                  <td className="score-good">{subject.mean}</td>
                  <td>{subject.exceeding}</td>
                  <td>{subject.meeting}</td>
                  <td>{subject.below}</td>
                  <td>
                    <span className="performance-status">{subject.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="performance-trend-panel">
        <div className="performance-section-title">
          <div>
            <h3>{data.title} Trend</h3>
            <p>Mean score by year</p>
          </div>
          <button type="button">All assessments</button>
        </div>
        <div className="performance-bars">
          {data.years.map((score, index) => (
            <div className="performance-bar-column" key={score}>
              <div
                className="performance-bar"
                style={{ height: `${42 + index * 12}px` }}
              />
              <strong>{score}</strong>
              <small>{2023 + index}</small>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
