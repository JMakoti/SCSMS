import { enrollmentRows, gradeEnrollmentSchools } from "@scsms/features/data/fixtures/enrollment";
import { moduleSeeders } from "@scsms/features/data/fixtures/modules";
import { rabaiSchools } from "@scsms/features/data/fixtures/rabai-schools";

type ModuleName = keyof typeof moduleSeeders;

export function generateItemStaticParams(moduleName: ModuleName) {
  return withFallback(
    moduleSeeders[moduleName].items.map((item) => ({ item })),
    { item: "overview" },
  );
}

export function generateEnrollmentStaticParams() {
  return enrollmentRows.map((row) => ({ item: row.school }));
}

export function generateGradeStaticParams() {
  return Object.keys(gradeEnrollmentSchools).map((grade) => ({ grade }));
}

export function generateSchoolStaticParams() {
  return rabaiSchools.map((school) => ({ code: school.id }));
}

export function generateFallbackItemStaticParams() {
  return [{ item: "overview" }];
}

function withFallback<T>(items: T[], fallback: T) {
  return items.length > 0 ? items : [fallback];
}
