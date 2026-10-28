type ModuleName = string;

export function generateItemStaticParams(_moduleName: ModuleName) {
  void _moduleName;
  return [{ item: "overview" }];
}

export function generateEnrollmentStaticParams() {
  return [{ item: "overview" }];
}

export function generateGradeStaticParams() {
  return [{ grade: "overview" }];
}

export function generateSchoolStaticParams() {
  return [{ code: "overview" }];
}

export function generateFallbackItemStaticParams() {
  return [{ item: "overview" }];
}
