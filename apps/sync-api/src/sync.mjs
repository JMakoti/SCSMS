import { tables, validateRequest } from "./tables.mjs";
import { fileContentType } from "../../../database/storage/client.mjs";

const quote = (name) => `"${name.replaceAll('"', '""')}"`;

export async function initialize(sql) {
  await sql.unsafe('ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS logo_object_key text');
  const metadata = new Map();
  const allColumns = await sql`SELECT table_name, column_name AS name, data_type AS type FROM information_schema.columns WHERE table_schema = 'public'`;
  const allKeys = await sql`SELECT c.relname AS table_name, array_agg(a.attname ORDER BY k.ord) AS columns
    FROM pg_index i JOIN pg_class c ON c.oid=i.indrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    CROSS JOIN LATERAL unnest(i.indkey) WITH ORDINALITY k(num, ord)
    JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=k.num
    WHERE n.nspname='public' AND i.indisunique AND i.indpred IS NULL AND i.indexprs IS NULL GROUP BY i.indexrelid,c.relname`;
  const allRefs = await sql`SELECT owner.relname AS table_name, a.attname AS column, f.relname AS target
    FROM pg_constraint c JOIN pg_class owner ON owner.oid=c.conrelid JOIN pg_namespace n ON n.oid=owner.relnamespace
    JOIN pg_class f ON f.oid=c.confrelid JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=c.conkey[1]
    WHERE n.nspname='public' AND c.contype='f'`;
  for (const table of tables) {
    const columns = allColumns.filter((c) => c.table_name === table);
    if (!columns.length) throw new Error(`Missing public.${table}; apply PostgreSQL migrations first`);
    const keys = allKeys.filter((k) => k.table_name === table);
    const refs = allRefs.filter((r) => r.table_name === table);
    metadata.set(table, { columns, keys: keys.map((k) => k.columns), refs });
  }
  await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(73627401)`;
    await tx.unsafe(`
      CREATE TABLE IF NOT EXISTS __sync_clock (id integer PRIMARY KEY CHECK (id = 1), revision bigint NOT NULL);
      INSERT INTO __sync_clock VALUES (1, 0) ON CONFLICT DO NOTHING;
      CREATE TABLE IF NOT EXISTS __sync_log (revision bigint PRIMARY KEY, table_name text NOT NULL, record_id text NOT NULL, operation text NOT NULL, payload jsonb);
      CREATE TABLE IF NOT EXISTS __sync_receipts (device_id text NOT NULL, event_id text NOT NULL, PRIMARY KEY(device_id, event_id));
      CREATE TABLE IF NOT EXISTS __sync_aliases (device_id text NOT NULL, table_name text NOT NULL, local_id text NOT NULL, cloud_id text NOT NULL,
        PRIMARY KEY(device_id, table_name, local_id), UNIQUE(device_id, table_name, cloud_id));
      CREATE OR REPLACE FUNCTION public.__sync_lock() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        PERFORM revision FROM public.__sync_clock WHERE id = 1 FOR UPDATE;
        RETURN NULL;
      END $$;
      CREATE OR REPLACE FUNCTION public.__sync_capture() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE r bigint; data jsonb;
      BEGIN
        UPDATE public.__sync_clock SET revision = revision + 1 WHERE id = 1 RETURNING revision INTO r;
        IF TG_OP = 'DELETE' THEN data := to_jsonb(OLD); ELSE data := to_jsonb(NEW); END IF;
        INSERT INTO public.__sync_log VALUES (r, TG_TABLE_NAME, data->>'id', lower(TG_OP), data);
        RETURN NULL;
      END $$;
    `);
    // Lock all tables before installing triggers and snapshotting; writes cannot fall in a gap.
    await tx.unsafe(`LOCK TABLE ${tables.map((t) => `public.${quote(t)}`).join(",")} IN SHARE ROW EXCLUSIVE MODE`);
    const [{ exists }] = await tx`SELECT EXISTS(SELECT 1 FROM __sync_log) AS exists`;
    await tx.unsafe(tables.map((table) => `DROP TRIGGER IF EXISTS __sync_lock ON public.${quote(table)};
        CREATE TRIGGER __sync_lock BEFORE INSERT OR UPDATE OR DELETE ON public.${quote(table)} FOR EACH STATEMENT EXECUTE FUNCTION public.__sync_lock();
        DROP TRIGGER IF EXISTS __sync_capture ON public.${quote(table)};
        CREATE TRIGGER __sync_capture AFTER INSERT OR UPDATE OR DELETE ON public.${quote(table)} FOR EACH ROW EXECUTE FUNCTION public.__sync_capture();`).join("\n"));
    for (const table of tables) {
      if (!exists) {
        // A no-op update records existing rows through the same transactional clock.
        await tx.unsafe(`UPDATE public.${quote(table)} SET id = id`);
      }
    }
  });
  return metadata;
}

export async function exchange(sql, metadata, body) {
  validateRequest(body);
  const { deviceId, changes } = body;
  return sql.begin(async (tx) => {
    // One exchange at a time per device, including retries after a lost response.
    await tx`SELECT pg_advisory_xact_lock(hashtextextended(${deviceId}, 0))`;
    const [clock] = await tx`SELECT revision::text FROM __sync_clock WHERE id=1`;
    if (BigInt(body.cursor) > BigInt(clock.revision)) throw new Error("Cursor is ahead of server history; check database restore state");
    const aliases = await tx`SELECT table_name, local_id, cloud_id FROM __sync_aliases WHERE device_id=${deviceId}`;
    const forward = new Map(aliases.map((a) => [`${a.table_name}:${a.local_id}`, a.cloud_id]));
    const reverse = new Map(aliases.map((a) => [`${a.table_name}:${a.cloud_id}`, a.local_id]));
    const alias = (table, id, backwards = false) => id == null ? id : (backwards ? reverse : forward).get(`${table}:${id}`) ?? id;
    const acknowledged = [];
    const receipts = changes.length ? await tx.unsafe(`SELECT event_id FROM __sync_receipts WHERE device_id=$1 AND event_id IN (${changes.map((_, i) => `$${i + 2}`).join(",")})`, [deviceId, ...changes.map((c) => c.id)]) : [];
    const duplicates = new Set(receipts.map((r) => r.event_id));
    for (const change of changes) {
      if (!duplicates.has(change.id)) {
        const meta = metadata.get(change.table);
        let id = alias(change.table, change.recordId);
        const row = { ...change.row, id };
        // Desktop logo paths refer to files on that device, not cloud data.
        // Downloads omit this column, preserving each desktop's existing logo.
        if (change.table === "schools") delete row.logo_path;
        if (change.table === "schools" && row.logo_object_key != null) fileContentType(row.logo_object_key);
        for (const key of Object.keys(row)) {
          const column = meta.columns.find((c) => c.name === key);
          if (!column) throw new Error(`Unknown column ${change.table}.${key}`);
          if (column.type === "boolean" && row[key] != null) {
            if (![true, false, 0, 1].includes(row[key])) throw new Error("Invalid boolean");
            row[key] = Boolean(row[key]);
          }
        }
        for (const ref of meta.refs) {
          if (row[ref.column] != null) row[ref.column] = alias(ref.target, row[ref.column]);
        }
        // Seeded databases have different UUIDs. Reconcile by unique business keys.
        const params = [];
        const conditions = [];
        for (const key of meta.keys) {
          if (key.some((c) => row[c] == null)) continue;
          conditions.push(`(${key.map((c) => { params.push(row[c]); return `${quote(c)}=$${params.length}`; }).join(" AND ")})`);
        }
        const found = await tx.unsafe(`SELECT id FROM public.${quote(change.table)} WHERE ${conditions.join(" OR ")}`, params);
        const matches = new Set(found.map((r) => r.id));
        if (matches.size > 1) throw new Error(`Conflicting unique keys in ${change.table}`);
        const existing = [...matches][0];
        if (existing) id = row.id = existing;
        let mutation = "";
        const writeParams = [deviceId, change.table, change.recordId, id, change.id];
        if (change.operation === "delete") {
          mutation = `, mutation AS (DELETE FROM public.${quote(change.table)} WHERE id=$4 RETURNING id)`;
        } else if (!(change.operation === "insert" && existing)) {
          const columns = Object.keys(row).map(quote);
          const updates = Object.keys(row).filter((c) => c !== "id").map((c) => `${quote(c)} = excluded.${quote(c)}`);
          mutation = `, mutation AS (INSERT INTO public.${quote(change.table)} (${columns.join(",")})
            SELECT ${columns.join(",")} FROM json_populate_record(NULL::public.${quote(change.table)}, $6::json)
            ON CONFLICT (id) DO ${updates.length ? `UPDATE SET ${updates.join(",")}` : "NOTHING"} RETURNING id)`;
          writeParams.push(row);
        }
        await tx.unsafe(`WITH alias AS (INSERT INTO __sync_aliases VALUES ($1,$2,$3,$4)
          ON CONFLICT (device_id, table_name, local_id) DO UPDATE SET cloud_id=excluded.cloud_id RETURNING 1)
          ${mutation} INSERT INTO __sync_receipts VALUES ($1,$5)`, writeParams);
        forward.set(`${change.table}:${change.recordId}`, id);
        reverse.set(`${change.table}:${id}`, change.recordId);
      }
      acknowledged.push(change.id);
    }
    const log = await tx`SELECT revision::text, table_name, record_id, operation, payload FROM __sync_log
      WHERE revision > ${String(body.cursor)}::bigint ORDER BY __sync_log.revision LIMIT 500`;
    const downloaded = [];
    for (const entry of log) {
      const row = { ...entry.payload };
      row.id = alias(entry.table_name, entry.record_id, true);
      for (const ref of metadata.get(entry.table_name).refs) {
        if (row[ref.column] != null) row[ref.column] = alias(ref.target, row[ref.column], true);
      }
      downloaded.push({ table: entry.table_name, recordId: row.id, operation: entry.operation, row });
    }
    return { acknowledged, changes: downloaded, cursor: log.at(-1)?.revision ?? String(body.cursor), hasMore: log.length === 500 };
  });
}
