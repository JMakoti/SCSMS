import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appName = basename(process.cwd());
if (appName !== "desktop" && appName !== "web") {
  throw new Error("Run this script from an app directory.");
}

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const featuresRequire = createRequire(resolve(workspaceRoot, "packages/features/package.json"));
const workerPath = featuresRequire.resolve("maplibre-gl/dist/maplibre-gl-worker.mjs");
const workerDirectory = dirname(workerPath);
const publicDirectory = resolve(process.cwd(), "public");

await mkdir(publicDirectory, { recursive: true });
await Promise.all(
  ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"].map((file) =>
    copyFile(resolve(workerDirectory, file), resolve(publicDirectory, file)),
  ),
);
