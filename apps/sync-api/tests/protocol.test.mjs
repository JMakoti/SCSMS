import assert from "node:assert/strict";
import { test } from "node:test";
import { validateRequest, tables } from "../src/tables.mjs";

const valid = () => ({ deviceId: "desktop-1", cursor: "0", changes: [
  { id: "event-1", table: "academic_years", recordId: "year-1", operation: "insert", row: { id: "year-1", name: "2026" } },
] });

test("validates bounded sync envelopes and rejects untrusted identifiers", () => {
  assert.doesNotThrow(() => validateRequest(valid()));
  for (const body of [null, {}, { ...valid(), deviceId: "../bad" }, { ...valid(), cursor: "-1" },
    { ...valid(), cursor: "1;DROP TABLE users" }, { ...valid(), changes: Array(101).fill(valid().changes[0]) }]) {
    assert.throws(() => validateRequest(body));
  }
  for (const change of [null, { ...valid().changes[0], table: "users; DROP TABLE schools" },
    { ...valid().changes[0], table: "sync_queue" }, { ...valid().changes[0], operation: "execute" },
    { ...valid().changes[0], row: { id: "different-id" } }, { ...valid().changes[0], row: [] }]) {
    assert.throws(() => validateRequest({ ...valid(), changes: [change] }));
  }
  assert.equal(new Set(tables).size, tables.length);
});

test("delete tombstones do not require a row", () => {
  const change = { ...valid().changes[0], operation: "delete" };
  delete change.row;
  assert.doesNotThrow(() => validateRequest({ ...valid(), changes: [change] }));
});
