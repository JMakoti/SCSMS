use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};
use sqlx::{Row, SqlitePool};
use std::{
    collections::HashSet,
    sync::{Arc, Mutex},
    time::Duration,
};
use tauri::{Emitter, Manager};
use tokio::sync::Notify;

const TABLES: &[&str] = &[
    "subcounty",
    "roles",
    "users",
    "academic_years",
    "terms",
    "wards",
    "schools",
    "school_subject_combinations",
    "contacts",
    "staff",
    "enrollment_snapshots",
    "enrollment_grade_rows",
    "infrastructure_snapshots",
    "infrastructure_facility_rows",
    "infrastructure_projects",
    "performance_records",
    "performance_subject_rows",
    "report_templates",
    "report_runs",
    "settings",
    "data_quality_checks",
    "dashboard_snapshots",
    "audit_logs",
];

fn quoted(name: &str) -> String {
    format!("\"{}\"", name.replace('"', "\"\""))
}

#[derive(Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncStatus {
    configured: bool,
    syncing: bool,
    last_success: Option<String>,
    error: Option<String>,
}

#[derive(Clone, Default)]
pub struct SyncRuntime {
    notify: Arc<Notify>,
    status: Arc<Mutex<SyncStatus>>,
}

#[derive(Deserialize)]
struct Config {
    url: String,
    token: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Change {
    table: String,
    record_id: String,
    operation: String,
    row: Map<String, Value>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Reply {
    acknowledged: Vec<String>,
    changes: Vec<Change>,
    cursor: String,
    has_more: bool,
}

#[tauri::command]
pub fn sync_status(runtime: tauri::State<'_, SyncRuntime>) -> Result<SyncStatus, String> {
    runtime
        .status
        .lock()
        .map(|s| s.clone())
        .map_err(|_| "Sync status unavailable".into())
}

#[tauri::command]
pub fn sync_now(
    app: tauri::AppHandle,
    runtime: tauri::State<'_, SyncRuntime>,
) -> Result<(), String> {
    config(&app)?.ok_or_else(|| "Cloud sync is not configured. For development, restart with pnpm dev:desktop after setting SCSMS_SYNC_TOKEN in root .env. Installed apps need a sync URL and token in sync.json.".to_string())?;
    runtime.notify.notify_one();
    Ok(())
}

// Triggers capture every writer, including account commands and cascading deletes.
// Applying cloud rows and advancing the cursor share a single SQLite transaction.
pub async fn initialize(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    let mut tx = pool.begin().await?;
    sqlx::raw_sql("CREATE TABLE IF NOT EXISTS __sync_meta (id INTEGER PRIMARY KEY CHECK(id=1), device_id TEXT NOT NULL, cursor TEXT NOT NULL DEFAULT '0', applying INTEGER NOT NULL DEFAULT 0);
        CREATE TABLE IF NOT EXISTS __sync_outbox (seq INTEGER PRIMARY KEY AUTOINCREMENT, event_id TEXT UNIQUE NOT NULL);")
        .execute(&mut *tx).await?;
    sqlx::query("INSERT OR IGNORE INTO __sync_meta(id, device_id) VALUES (1, ?)")
        .bind(uuid::Uuid::new_v4().to_string())
        .execute(&mut *tx)
        .await?;
    let initialized: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM sqlite_master WHERE type='trigger' AND name='__sync_subcounty_insert'")
        .fetch_one(&mut *tx).await?;
    for table in TABLES {
        let columns = sqlx::query(&format!("PRAGMA table_info({})", quoted(table)))
            .fetch_all(&mut *tx)
            .await?;
        let object = columns
            .iter()
            .map(|c| {
                let name: String = c.get("name");
                format!("'{}', NEW.{}", name.replace('\'', "''"), quoted(&name))
            })
            .collect::<Vec<_>>()
            .join(",");
        for op in ["insert", "update", "delete"] {
            let source = if op == "delete" { "OLD" } else { "NEW" };
            let payload = object.replace("NEW.", &format!("{source}."));
            sqlx::raw_sql(&format!("DROP TRIGGER IF EXISTS __sync_{table}_{op}; CREATE TRIGGER __sync_{table}_{op} AFTER {op} ON {} WHEN (SELECT applying FROM __sync_meta WHERE id=1)=0 BEGIN
                INSERT INTO sync_queue(id, table_name, record_id, operation, payload_json)
                VALUES(lower(hex(randomblob(16))), '{table}', {source}.id, '{op}', json_object({payload}));
                INSERT INTO __sync_outbox(event_id) SELECT id FROM sync_queue WHERE rowid=last_insert_rowid();
                END;", quoted(table))).execute(&mut *tx).await?;
        }
        if initialized == 0 {
            // Queue pre-existing offline records once; never overwrite a cloud seed on insert.
            let payload = object.replace("NEW.", "");
            sqlx::query(&format!("INSERT INTO sync_queue(id, table_name, record_id, operation, payload_json)
                SELECT lower(hex(randomblob(16))), '{table}', id, 'insert', json_object({payload}) FROM {} ORDER BY rowid", quoted(table)))
                .execute(&mut *tx).await?;
            sqlx::query("INSERT INTO __sync_outbox(event_id) SELECT id FROM sync_queue WHERE table_name=? AND status='pending' AND id NOT IN (SELECT event_id FROM __sync_outbox) ORDER BY rowid")
                .bind(table).execute(&mut *tx).await?;
        }
    }
    sqlx::raw_sql("CREATE TRIGGER IF NOT EXISTS __sync_logo_insert AFTER INSERT ON schools WHEN NEW.logo_path IS NOT NULL AND NEW.logo_path<>'' AND (SELECT applying FROM __sync_meta WHERE id=1)=0 BEGIN
        INSERT INTO sync_queue(id,table_name,record_id,operation,payload_json) VALUES(lower(hex(randomblob(16))),'__files',NEW.id,'insert',json_object('path',NEW.logo_path)); END;
        CREATE TRIGGER IF NOT EXISTS __sync_logo_update AFTER UPDATE OF logo_path ON schools WHEN NEW.logo_path IS NOT OLD.logo_path AND NEW.logo_path IS NOT NULL AND NEW.logo_path<>'' AND (SELECT applying FROM __sync_meta WHERE id=1)=0 BEGIN
        INSERT INTO sync_queue(id,table_name,record_id,operation,payload_json) VALUES(lower(hex(randomblob(16))),'__files',NEW.id,'insert',json_object('path',NEW.logo_path)); END;
        INSERT INTO sync_queue(id,table_name,record_id,operation,payload_json)
        SELECT lower(hex(randomblob(16))),'__files',s.id,'insert',json_object('path',s.logo_path) FROM schools s
        WHERE s.logo_path IS NOT NULL AND s.logo_path<>'' AND (s.logo_object_key IS NULL OR s.logo_object_key<>s.logo_path)
        AND NOT EXISTS(SELECT 1 FROM sync_queue q WHERE q.table_name='__files' AND q.record_id=s.id AND json_extract(q.payload_json,'$.path')=s.logo_path AND q.status IN ('pending','failed')); ")
        .execute(&mut *tx).await?;
    tx.commit().await
}

fn config(app: &tauri::AppHandle) -> Result<Option<Config>, String> {
    let env_url = std::env::var("SCSMS_SYNC_URL").ok();
    let env_token = std::env::var("SCSMS_SYNC_TOKEN").ok();
    let value = match (env_url, env_token) {
        (Some(url), Some(token)) => Some(Config { url, token }),
        (None, None) => {
            let path = app
                .path()
                .app_data_dir()
                .map_err(|e| e.to_string())?
                .join("sync.json");
            match std::fs::read(path) {
                Ok(bytes) => Some(
                    serde_json::from_slice::<Config>(&bytes)
                        .map_err(|_| "Invalid sync.json configuration")?,
                ),
                Err(e) if e.kind() == std::io::ErrorKind::NotFound => None,
                Err(_) => return Err("Cannot read sync.json".into()),
            }
        }
        _ => return Err("Set both SCSMS_SYNC_URL and SCSMS_SYNC_TOKEN".into()),
    };
    if let Some(ref value) = value {
        let url = reqwest::Url::parse(&value.url).map_err(|_| "Invalid sync URL")?;
        if value.token.len() < 32
            || !(url.scheme() == "https"
                || (url.scheme() == "http"
                    && matches!(url.host_str(), Some("localhost" | "127.0.0.1" | "[::1]"))))
        {
            return Err(
                "Sync requires HTTPS (except localhost) and a token of at least 32 characters"
                    .into(),
            );
        }
    }
    Ok(value)
}

pub fn start(app: tauri::AppHandle, pool: SqlitePool, runtime: SyncRuntime) {
    tauri::async_runtime::spawn(async move {
        let client = match reqwest::Client::builder()
            .timeout(Duration::from_secs(60))
            .redirect(reqwest::redirect::Policy::none())
            .build()
        {
            Ok(client) => client,
            Err(error) => {
                log::error!("Cannot initialize sync HTTP client: {error}");
                return;
            }
        };
        let mut delay = 1;
        loop {
            let settings = config(&app);
            let configured = matches!(settings, Ok(Some(_)));
            if let Ok(mut status) = runtime.status.lock() {
                status.configured = configured;
                status.syncing = configured;
                status.error = None;
            }
            let _ = app.emit(
                "scsms:sync-status",
                runtime.status.lock().map(|s| s.clone()).unwrap_or_default(),
            );
            let result = match settings {
                Ok(Some(settings)) => cycle(&pool, &client, &settings, &app).await,
                Ok(None) => Err("Cloud sync is not configured. Set the sync URL and token, then click Sync Now.".into()),
                Err(error) => Err(error),
            };
            if let Ok(mut status) = runtime.status.lock() {
                status.syncing = false;
                match result {
                    Ok(changed) => {
                        delay = 15;
                        if configured {
                            status.last_success = Some(
                                std::time::SystemTime::now()
                                    .duration_since(std::time::UNIX_EPOCH)
                                    .unwrap_or_default()
                                    .as_millis()
                                    .to_string(),
                            );
                        }
                        if changed {
                            let _ = app.emit("scsms:sync-complete", ());
                        }
                    }
                    Err(ref error) => {
                        status.error = Some(error.clone());
                        delay = (delay * 2).clamp(5, 60);
                    }
                }
                let _ = app.emit("scsms:sync-status", status.clone());
            }
            let _ =
                tokio::time::timeout(Duration::from_secs(delay), runtime.notify.notified()).await;
        }
    });
}

async fn cycle(
    pool: &SqlitePool,
    client: &reqwest::Client,
    config: &Config,
    app: &tauri::AppHandle,
) -> Result<bool, String> {
    let files =
        super::file_sync::upload_pending(pool, client, &config.url, &config.token, app).await;
    let records = exchange_all(pool, client, config, app).await;
    let downloads = if records.is_ok() {
        super::file_sync::download_missing(pool, client, &config.url, &config.token, app).await
    } else {
        Ok(false)
    };
    let result = records
        .and_then(|changed| files.map(|files_changed| changed || files_changed))
        .and_then(|changed| downloads.map(|downloaded| changed || downloaded));
    if let Err(ref error) = result {
        let _ = sqlx::query("UPDATE sync_queue SET status='failed', attempts=attempts+1, last_error=? WHERE id IN (SELECT event_id FROM __sync_outbox)")
            .bind(error).execute(pool).await;
    }
    result
}

async fn exchange_all(
    pool: &SqlitePool,
    client: &reqwest::Client,
    config: &Config,
    app: &tauri::AppHandle,
) -> Result<bool, String> {
    let meta = sqlx::query("SELECT device_id, cursor FROM __sync_meta WHERE id=1")
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())?;
    let device: String = meta.get("device_id");
    let mut cursor: String = meta.get("cursor");
    let mut changed = false;
    // Bound a cycle so manual requests and backoff remain responsive on large databases.
    for _ in 0..100 {
        let pending = sqlx::query("SELECT q.* FROM __sync_outbox o JOIN sync_queue q ON q.id=o.event_id ORDER BY o.seq LIMIT 10")
            .fetch_all(pool).await.map_err(|e| e.to_string())?;
        let mut changes = Vec::new();
        for record in &pending {
            let payload: String = record.get("payload_json");
            let row: Value = serde_json::from_str(&payload).map_err(|e| e.to_string())?;
            changes.push(json!({"id":record.get::<String,_>("id"), "table":record.get::<String,_>("table_name"),
                "recordId":record.get::<String,_>("record_id"), "operation":record.get::<String,_>("operation"), "row":row}));
        }
        let response = client
            .post(format!("{}/v1/sync", config.url.trim_end_matches('/')))
            .bearer_auth(&config.token)
            .json(&json!({"deviceId":device,"cursor":cursor,"changes":changes}))
            .send()
            .await
            .map_err(|_| "Sync server unreachable. Changes are saved locally.".to_string())?;
        if !response.status().is_success() {
            return Err(format!(
                "Sync server returned {}. Changes are saved locally.",
                response.status()
            ));
        }
        let reply: Reply = response
            .json()
            .await
            .map_err(|_| "Invalid response from sync server")?;
        if reply.cursor.parse::<u64>().is_err()
            || reply.cursor.parse::<u64>().ok() < cursor.parse::<u64>().ok()
        {
            return Err("Invalid sync cursor".into());
        }
        let sent: HashSet<String> = changes
            .iter()
            .filter_map(|v| v["id"].as_str().map(String::from))
            .collect();
        if reply.acknowledged.iter().any(|id| !sent.contains(id))
            || reply.acknowledged.len() != sent.len()
        {
            return Err("Invalid sync acknowledgement".into());
        }
        let mut tx = pool.begin().await.map_err(|e| e.to_string())?;
        // Take the SQLite write lock before checking the queue or suppressing capture.
        sqlx::query("UPDATE __sync_meta SET applying=1 WHERE id=1")
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
        for id in &reply.acknowledged {
            sqlx::query("UPDATE sync_queue SET status='synced', synced_at=CURRENT_TIMESTAMP, last_error=NULL WHERE id=?")
                .bind(id).execute(&mut *tx).await.map_err(|e| e.to_string())?;
            sqlx::query("DELETE FROM __sync_outbox WHERE event_id=?")
                .bind(id)
                .execute(&mut *tx)
                .await
                .map_err(|e| e.to_string())?;
        }
        let remaining: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM __sync_outbox")
            .fetch_one(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
        // Establish all seed aliases before downloading any cloud rows.
        if remaining == 0 {
            sqlx::query("PRAGMA defer_foreign_keys=ON")
                .execute(&mut *tx)
                .await
                .map_err(|e| e.to_string())?;
            for change in &reply.changes {
                apply(&mut tx, change).await?;
            }
            sqlx::query("UPDATE __sync_meta SET cursor=? WHERE id=1")
                .bind(&reply.cursor)
                .execute(&mut *tx)
                .await
                .map_err(|e| e.to_string())?;
            cursor = reply.cursor;
            changed |= !reply.changes.is_empty();
        }
        sqlx::query("UPDATE __sync_meta SET applying=0 WHERE id=1")
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
        tx.commit().await.map_err(|e| e.to_string())?;
        if !reply.acknowledged.is_empty() || (remaining == 0 && !reply.changes.is_empty()) {
            let _ = app.emit("scsms:sync-complete", ());
        }
        changed |= !reply.acknowledged.is_empty();
        if remaining == 0 && !reply.has_more {
            return Ok(changed);
        }
    }
    Ok(changed)
}

async fn apply(
    tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    change: &Change,
) -> Result<(), String> {
    if !TABLES.contains(&change.table.as_str())
        || change.row.get("id").and_then(Value::as_str) != Some(change.record_id.as_str())
    {
        return Err("Invalid downloaded table or record".into());
    }
    if change.operation == "delete" {
        sqlx::query(&format!("DELETE FROM {} WHERE id=?", quoted(&change.table)))
            .bind(&change.record_id)
            .execute(&mut **tx)
            .await
            .map_err(|e| e.to_string())?;
        return Ok(());
    }
    if !["insert", "update"].contains(&change.operation.as_str()) {
        return Err("Invalid downloaded operation".into());
    }
    let info = sqlx::query(&format!("PRAGMA table_info({})", quoted(&change.table)))
        .fetch_all(&mut **tx)
        .await
        .map_err(|e| e.to_string())?;
    let allowed: HashSet<String> = info.iter().map(|r| r.get("name")).collect();
    let keys: Vec<&String> = change.row.keys().collect();
    if keys.iter().any(|k| !allowed.contains(*k)) {
        return Err("Cloud and desktop schemas differ; update the desktop application".into());
    }
    let updates = keys
        .iter()
        .filter(|k| k.as_str() != "id")
        .map(|k| format!("{}=excluded.{}", quoted(k), quoted(k)))
        .collect::<Vec<_>>()
        .join(",");
    if change.table == "schools" && change.row.contains_key("logo_object_key") {
        let object_key = change.row["logo_object_key"].as_str();
        sqlx::query("UPDATE schools SET logo_path=NULL WHERE id=? AND logo_object_key IS NOT ? AND NOT EXISTS (SELECT 1 FROM sync_queue q WHERE q.table_name='__files' AND q.record_id=schools.id AND q.status IN ('pending','failed') AND json_extract(q.payload_json,'$.path')=schools.logo_path)")
            .bind(&change.record_id).bind(object_key).execute(&mut **tx).await.map_err(|e| e.to_string())?;
    }
    let sql = format!(
        "INSERT INTO {} ({}) VALUES ({}) ON CONFLICT(id) DO UPDATE SET {}",
        quoted(&change.table),
        keys.iter().map(|k| quoted(k)).collect::<Vec<_>>().join(","),
        vec!["?"; keys.len()].join(","),
        updates
    );
    let mut query = sqlx::query(&sql);
    for key in keys {
        query = match &change.row[key] {
            Value::Null => query.bind(Option::<String>::None),
            Value::Bool(v) => query.bind(*v),
            Value::String(v) => query.bind(v),
            Value::Number(v) if v.is_i64() => query.bind(v.as_i64().unwrap()),
            Value::Number(v) => query.bind(v.as_f64().ok_or("Invalid number")?),
            _ => return Err("Unsupported cloud value".into()),
        };
    }
    query.execute(&mut **tx).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn file_queue_tracks_replacements_and_preserves_unsent_local_logos() {
        tauri::async_runtime::block_on(async {
            let pool = sqlx::sqlite::SqlitePoolOptions::new()
                .max_connections(1)
                .connect("sqlite::memory:")
                .await
                .unwrap();
            super::super::migrations::run_migrations(&pool)
                .await
                .unwrap();
            initialize(&pool).await.unwrap();
            sqlx::query("INSERT INTO subcounty(id) VALUES('area')")
                .execute(&pool)
                .await
                .unwrap();
            sqlx::query("INSERT INTO wards(id,sub_county_id,ward_code,ward_name) VALUES('ward','area','001','Ward')").execute(&pool).await.unwrap();
            sqlx::query("INSERT INTO schools(id,school_code,uic_code,official_name,display_name,institution_type,level,ownership_type,ward_id,logo_path) VALUES('school','001','001','School','School','regular','primary','goverment','ward','school-logos/550e8400-e29b-41d4-a716-446655440000.png')").execute(&pool).await.unwrap();
            sqlx::query("UPDATE schools SET display_name='Updated' WHERE id='school'")
                .execute(&pool)
                .await
                .unwrap();
            let count: i64 =
                sqlx::query_scalar("SELECT count(*) FROM sync_queue WHERE table_name='__files'")
                    .fetch_one(&pool)
                    .await
                    .unwrap();
            assert_eq!(
                count, 1,
                "Ordinary school edits must not enqueue duplicate file uploads"
            );
            sqlx::query("UPDATE schools SET logo_path='school-logos/650e8400-e29b-41d4-a716-446655440000.png' WHERE id='school'").execute(&pool).await.unwrap();
            let cloud: Change = serde_json::from_value(json!({"table":"schools","recordId":"school","operation":"update","row":{
                "id":"school","school_code":"001","uic_code":"001","official_name":"School","display_name":"Cloud school","institution_type":"regular","level":"primary","ownership_type":"goverment","ward_id":"ward","logo_object_key":"school-logos/750e8400-e29b-41d4-a716-446655440000.png"
            }})).unwrap();
            let mut tx = pool.begin().await.unwrap();
            sqlx::query("UPDATE __sync_meta SET applying=1")
                .execute(&mut *tx)
                .await
                .unwrap();
            apply(&mut tx, &cloud).await.unwrap();
            sqlx::query("UPDATE __sync_meta SET applying=0")
                .execute(&mut *tx)
                .await
                .unwrap();
            tx.commit().await.unwrap();
            let path: String =
                sqlx::query_scalar("SELECT logo_path FROM schools WHERE id='school'")
                    .fetch_one(&pool)
                    .await
                    .unwrap();
            assert!(
                path.contains("650e8400"),
                "An incoming reference must not erase an unsent local replacement"
            );
            sqlx::query("UPDATE sync_queue SET status='synced' WHERE table_name='__files'")
                .execute(&pool)
                .await
                .unwrap();
            let mut cloud = cloud;
            cloud.row.insert(
                "logo_object_key".into(),
                json!("school-logos/850e8400-e29b-41d4-a716-446655440000.png"),
            );
            let mut tx = pool.begin().await.unwrap();
            sqlx::query("UPDATE __sync_meta SET applying=1")
                .execute(&mut *tx)
                .await
                .unwrap();
            apply(&mut tx, &cloud).await.unwrap();
            sqlx::query("UPDATE __sync_meta SET applying=0")
                .execute(&mut *tx)
                .await
                .unwrap();
            tx.commit().await.unwrap();
            let path: Option<String> =
                sqlx::query_scalar("SELECT logo_path FROM schools WHERE id='school'")
                    .fetch_one(&pool)
                    .await
                    .unwrap();
            assert_eq!(
                path, None,
                "A changed cloud logo must invalidate the previous local cache"
            );
            let count: i64 =
                sqlx::query_scalar("SELECT count(*) FROM sync_queue WHERE table_name='__files'")
                    .fetch_one(&pool)
                    .await
                    .unwrap();
            assert_eq!(
                count, 2,
                "Downloads must not echo into the file upload queue"
            );
        });
    }

    #[test]
    fn durable_capture_and_atomic_downloads() {
        tauri::async_runtime::block_on(async {
            let pool = sqlx::sqlite::SqlitePoolOptions::new()
                .max_connections(1)
                .connect("sqlite::memory:")
                .await
                .unwrap();
            super::super::migrations::run_migrations(&pool)
                .await
                .unwrap();
            sqlx::query("INSERT INTO academic_years(id,name,starts_on,ends_on) VALUES('local-year','2026','2026-01-01','2026-12-31')").execute(&pool).await.unwrap();
            initialize(&pool).await.unwrap();
            let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM __sync_outbox")
                .fetch_one(&pool)
                .await
                .unwrap();
            assert_eq!(count, 1, "Pre-existing records must be queued once");
            initialize(&pool).await.unwrap();
            let count_again: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM __sync_outbox")
                .fetch_one(&pool)
                .await
                .unwrap();
            assert_eq!(count, count_again);
            sqlx::query("UPDATE academic_years SET name='2027' WHERE id='local-year'")
                .execute(&pool)
                .await
                .unwrap();
            let operations: Vec<String> = sqlx::query_scalar("SELECT q.operation FROM __sync_outbox o JOIN sync_queue q ON q.id=o.event_id ORDER BY o.seq").fetch_all(&pool).await.unwrap();
            assert_eq!(operations, ["insert", "update"]);
            let cloud: Change = serde_json::from_value(json!({"table":"academic_years","recordId":"cloud-year","operation":"insert","row":{"id":"cloud-year","name":"2028","starts_on":"2028-01-01","ends_on":"2028-12-31","is_current":true}})).unwrap();
            let mut tx = pool.begin().await.unwrap();
            sqlx::query("UPDATE __sync_meta SET applying=1 WHERE id=1")
                .execute(&mut *tx)
                .await
                .unwrap();
            apply(&mut tx, &cloud).await.unwrap();
            sqlx::query("UPDATE __sync_meta SET applying=0,cursor='10' WHERE id=1")
                .execute(&mut *tx)
                .await
                .unwrap();
            tx.commit().await.unwrap();
            let queued: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM __sync_outbox")
                .fetch_one(&pool)
                .await
                .unwrap();
            assert_eq!(queued, 2, "Downloads must not echo into the upload queue");
            let mut tx = pool.begin().await.unwrap();
            sqlx::query("UPDATE __sync_meta SET applying=1,cursor='20' WHERE id=1")
                .execute(&mut *tx)
                .await
                .unwrap();
            let invalid: Change = serde_json::from_value(json!({"table":"academic_years","recordId":"bad","operation":"insert","row":{"id":"bad","unknown_column":1}})).unwrap();
            assert!(apply(&mut tx, &invalid).await.is_err());
            tx.rollback().await.unwrap();
            let state = sqlx::query("SELECT cursor,applying FROM __sync_meta")
                .fetch_one(&pool)
                .await
                .unwrap();
            assert_eq!(state.get::<String, _>("cursor"), "10");
            assert_eq!(state.get::<i64, _>("applying"), 0);
            sqlx::query("DELETE FROM academic_years WHERE id='local-year'")
                .execute(&pool)
                .await
                .unwrap();
            let last: String = sqlx::query_scalar("SELECT q.operation FROM __sync_outbox o JOIN sync_queue q ON q.id=o.event_id ORDER BY o.seq DESC LIMIT 1").fetch_one(&pool).await.unwrap();
            assert_eq!(last, "delete");
        });
    }
}
