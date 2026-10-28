import { invoke } from "@tauri-apps/api/core";
import { drizzle } from "drizzle-orm/sqlite-proxy";

import * as schema from "@scsms/db";

export const db = drizzle(
    async (sql, params, method) => {
        return await invoke("run_sql", {
            sql,
            params,
            method,
        });
    },
    {
        schema,
    },
);