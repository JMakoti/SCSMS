import { parseEnv } from "node:util";

export function desktopDevEnv(source, inherited = process.env) {
  const values = parseEnv(source);
  const env = { ...inherited };
  const token = inherited.SCSMS_SYNC_TOKEN ?? values.SCSMS_SYNC_TOKEN;
  const url = inherited.SCSMS_SYNC_URL ?? values.SCSMS_SYNC_URL;
  if (token !== undefined) {
    env.SCSMS_SYNC_TOKEN = token;
    env.SCSMS_SYNC_URL = url ?? `http://127.0.0.1:${inherited.SCSMS_SYNC_PORT ?? values.SCSMS_SYNC_PORT ?? "4001"}`;
  } else if (url !== undefined) {
    env.SCSMS_SYNC_URL = url;
  }
  return env;
}
