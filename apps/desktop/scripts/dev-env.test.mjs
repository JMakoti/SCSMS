import { test } from "node:test";
import assert from "node:assert/strict";
import { desktopDevEnv } from "./dev-env.mjs";

test("desktop development inherits sync credentials and the local API port from root env", () => {
  const env = desktopDevEnv("SCSMS_SYNC_TOKEN=test-secret\nSCSMS_SYNC_PORT=4010\nDATABASE_URL=private-db\nSCSMS_SESSION_SECRET=private-session", { PATH: "existing-path" });
  assert.equal(env.SCSMS_SYNC_TOKEN, "test-secret");
  assert.equal(env.SCSMS_SYNC_URL, "http://127.0.0.1:4010");
  assert.equal(env.PATH, "existing-path");
  assert.equal(env.DATABASE_URL, undefined);
  assert.equal(env.SCSMS_SESSION_SECRET, undefined);
});

test("explicit runtime credentials override root env and missing configuration permits offline work", () => {
  assert.equal(desktopDevEnv("SCSMS_SYNC_TOKEN=file-token\nSCSMS_SYNC_URL=https://file.example", { SCSMS_SYNC_TOKEN: "runtime-token", SCSMS_SYNC_URL: "https://runtime.example" }).SCSMS_SYNC_URL, "https://runtime.example");
  assert.equal(desktopDevEnv("", {}).SCSMS_SYNC_URL, undefined);
  assert.equal(desktopDevEnv("SCSMS_SYNC_TOKEN=file-token", {}).SCSMS_SYNC_URL, "http://127.0.0.1:4001");
});
