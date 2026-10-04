import { enrollmentRows, gradeEnrollmentSchools } from "../../../database/seeders/enrollment";
import { moduleSeeders } from "../../../database/seeders/modules";
import { rabaiSchools } from "../../../database/seeders/rabai-schools";

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
