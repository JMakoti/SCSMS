import { test } from "node:test";
import assert from "node:assert/strict";
import { completenessReport, isRecorded, schoolCompleteness } from "../../../packages/features/data/completeness.ts";

const school = {
  id: "school-a", schoolCode: "001", officialName: "Example School", displayName: "Example",
  registrationStatus: "REGISTERED", institutionType: "PRIMARY", ownershipType: "PUBLIC",
  genderType: "MIXED", boardingType: "DAY", titleDeed: "NO", sne: "NO",
  county: "County", subCounty: "Sub County", ward: "Ward", location: "Village",
  address: "PO Box 1", phone: "0700000000", email: "school@example.com", latitude: 0, longitude: 0,
};

test("zero coordinates and explicit No answers count; placeholders do not", () => {
  for (const value of [0, false, "NO", "  Recorded  "]) assert.equal(isRecorded(value), true);
  for (const value of [null, undefined, " ", "UNKNOWN", " unknown ", "Not provided", "Not recorded", NaN, Infinity]) assert.equal(isRecorded(value), false);
  assert.equal(schoolCompleteness(school, true, true).percent, 100);
});

test("missing fields and actual academic year records drive the breakdown", () => {
  const result = schoolCompleteness({ ...school, phone: "  ", genderType: "UNKNOWN", registrationStatus: null }, false, false);
  assert.equal(result.total, 21);
  assert.equal(result.completed, 16);
  assert.equal(result.percent, 76);
  assert.deepEqual(result.groups[0].missing, ["Registration status", "Gender"]);
  assert.deepEqual(result.groups[1].missing, ["Phone"]);
  assert.equal(result.groups[2].missing.length, 1);
  assert.equal(result.groups[3].missing.length, 1);
});

test("year and school scoping do not borrow enrollment or facilities from other records", () => {
  const data = {
    schools: [school, { ...school, id: "school-b" }],
    enrollmentRows: [{ schoolId: "school-a", academicYearId: "2026", male: 0, female: 0 }, { schoolId: "school-b", academicYearId: "2025" }],
    infrastructureFacilities: [{ schoolId: "school-a", academicYearId: "2026", available: 0 }],
  };
  const current = completenessReport(data, "2026");
  assert.equal(current.complete, 1);
  assert.equal(current.incomplete, 1);
  assert.equal(current.records[0].percent, 100);
  assert.equal(current.records[1].completed, 19);
  assert.equal(current.percent, 95);
  const previous = completenessReport(data, "2025");
  assert.equal(previous.complete, 0);
  assert.equal(previous.records[0].completed, 19);
  assert.equal(previous.records[1].completed, 20);
  data.enrollmentRows.push({ schoolId: "school-b", academicYearId: "2026" });
  data.infrastructureFacilities.push({ schoolId: "school-b", academicYearId: "2026" });
  assert.equal(completenessReport(data, "2026").complete, 2);
});

test("an empty registry reports zero without division errors", () => {
  const result = completenessReport({ schools: [], enrollmentRows: [], infrastructureFacilities: [] }, "2026");
  assert.equal(result.percent, 0);
  assert.equal(result.complete, 0);
  assert.equal(result.incomplete, 0);
});
