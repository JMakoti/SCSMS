import { pgTable, text, real, uniqueIndex, index } from "drizzle-orm/pg-core";
import { performanceRecords } from "./performance";

export const performanceCandidatureSummaries = pgTable("performance_candidature_summaries", {
  id: text("id").primaryKey(),
  performanceRecordId: text("performance_record_id").notNull().references(() => performanceRecords.id, { onDelete: "cascade" }),
  summaryJson: text("summary_json").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => ({ recordIdx: uniqueIndex("performance_candidature_record_idx").on(table.performanceRecordId) }));

export const performanceCandidates = pgTable("performance_candidates", {
  id: text("id").primaryKey(),
  performanceRecordId: text("performance_record_id").notNull().references(() => performanceRecords.id, { onDelete: "cascade" }),
  examinationNumber: text("examination_number").notNull(),
  candidateName: text("candidate_name").notNull(),
  gender: text("gender", { enum: ["male", "female", "unknown"] }).notNull(),
  cohort: text("cohort"),
  status: text("status", { enum: ["missing", "submitted", "absent", "withheld"] }).notNull().default("missing"),
  overallGrade: text("overall_grade"),
  overallScore: real("overall_score"),
  updatedAt: text("updated_at").notNull(),
}, (table) => ({
  candidateIdx: uniqueIndex("performance_candidate_number_idx").on(table.performanceRecordId, table.examinationNumber),
  scopeIdx: index("performance_candidate_scope_idx").on(table.performanceRecordId, table.gender, table.status),
}));

export const performanceCandidateSubjects = pgTable("performance_candidate_subjects", {
  id: text("id").primaryKey(),
  candidateId: text("candidate_id").notNull().references(() => performanceCandidates.id, { onDelete: "cascade" }),
  subjectCode: text("subject_code").notNull(),
  subjectName: text("subject_name").notNull(),
  status: text("status", { enum: ["missing", "submitted", "absent", "withheld"] }).notNull(),
  grade: text("grade"),
  score: real("score"),
}, (table) => ({
  subjectIdx: uniqueIndex("performance_candidate_subject_idx").on(table.candidateId, table.subjectCode),
  subjectScopeIdx: index("performance_subject_code_idx").on(table.subjectCode, table.status),
}));
