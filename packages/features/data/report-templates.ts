import type { FeatureReport } from "./feature-data-context";
import { reportDetails } from "./fixtures/reports";

// Keep the built-in report catalogue available before database templates are configured.
// Only template metadata is restored; report rows still come from current feature data.
const builtInReportTemplates: FeatureReport[] = reportDetails.map((report) => ({
  id: `built-in:${report.key}`,
  key: report.key,
  title: report.title,
  code: report.code,
  category: report.category,
  description: report.description,
  frequency: report.frequency,
  recordsIncluded: 0,
  lastGenerated: null,
  status: "Not generated",
}));

export function getReportTemplates(templates: FeatureReport[]): FeatureReport[] {
  return templates.length ? templates : builtInReportTemplates;
}
