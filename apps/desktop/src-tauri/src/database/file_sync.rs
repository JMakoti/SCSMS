use serde_json::Value;
use sqlx::{Row, SqlitePool};
use std::{
    fs,
    path::{Component, Path},
};
use tauri::Manager;

const MAX_BYTES: u64 = 5 * 1024 * 1024;

fn valid_key(key: &str) -> bool {
    let mut parts = Path::new(key).components();
    matches!((parts.next(), parts.next(), parts.next()),
    (Some(Component::Normal(dir)), Some(Component::Normal(name)), None)
    if dir == "school-logos" && name.to_str().is_some_and(|name| {
        name.rsplit_once('.').is_some_and(|(id, ext)| {
            uuid::Uuid::parse_str(id).is_ok() && ["png", "jpg", "jpeg", "webp", "svg"].contains(&ext)
        })
    }))
}

async fn response_error(response: reqwest::Response) -> String {
    let status = response.status();
    let body = response.json::<Value>().await.unwrap_or(Value::Null);
    body["error"]
        .as_str()
        .map(String::from)
        .unwrap_or_else(|| format!("File sync returned {status}."))
}

pub async fn upload_pending(
    pool: &SqlitePool,
    client: &reqwest::Client,
    url: &str,
    token: &str,
    app: &tauri::AppHandle,
) -> Result<bool, String> {
    let pending = sqlx::query("SELECT id,record_id,payload_json FROM sync_queue WHERE table_name='__files' AND status IN ('pending','failed') ORDER BY attempts,rowid LIMIT 10")
        .fetch_all(pool).await.map_err(|e| e.to_string())?;
    let mut changed = false;
    let mut first_error = None;
    for event in pending {
        let id: String = event.get("id");
        let school_id: String = event.get("record_id");
        let payload: String = event.get("payload_json");
        let payload: Value = serde_json::from_str(&payload).map_err(|e| e.to_string())?;
        let path = payload["path"].as_str().ok_or("Invalid queued file path")?;
        let operation = async {
            let current: Option<Option<String>> = sqlx::query_scalar("SELECT logo_path FROM schools WHERE id=?")
                .bind(&school_id).fetch_optional(pool).await.map_err(|e| e.to_string())?;
            if current.flatten().as_deref() != Some(path) { return Ok::<(), String>(()); }
            let resolved = crate::file_storage::resolve_school_logo_path(app.clone(), path.into())?;
            if !valid_key(&resolved.relative_path) { return Err("Invalid managed school logo filename".into()); }
            let metadata = fs::metadata(&resolved.absolute_path).map_err(|_| "The queued logo file is missing")?;
            if metadata.len() == 0 || metadata.len() > MAX_BYTES { return Err("School logos must be non-empty and 5 MB or smaller".into()); }
            let bytes = fs::read(&resolved.absolute_path).map_err(|_| "Could not read the queued logo")?;
            let response = client.put(format!("{}/v1/files/{}", url.trim_end_matches('/'), resolved.relative_path))
                .bearer_auth(token).body(bytes).send().await.map_err(|_| "File upload server is unreachable; the logo stays queued")?;
            if !response.status().is_success() { return Err(response_error(response).await); }
            let mut tx = pool.begin().await.map_err(|e| e.to_string())?;
            // The normal capture trigger queues the portable reference for data sync.
            sqlx::query("UPDATE schools SET logo_path=?,logo_object_key=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND logo_path=?")
                .bind(&resolved.relative_path).bind(&resolved.relative_path).bind(&school_id).bind(path)
                .execute(&mut *tx).await.map_err(|e| e.to_string())?;
            // Migration from a legacy absolute path can create a replacement file event.
            sqlx::query("UPDATE sync_queue SET status='synced',synced_at=CURRENT_TIMESTAMP,last_error=NULL WHERE table_name='__files' AND record_id=? AND json_extract(payload_json,'$.path')=?")
                .bind(&school_id).bind(&resolved.relative_path).execute(&mut *tx).await.map_err(|e| e.to_string())?;
            tx.commit().await.map_err(|e| e.to_string())?;
            Ok(())
        }.await;
        match operation {
            Ok(()) => {
                sqlx::query("UPDATE sync_queue SET status='synced',synced_at=CURRENT_TIMESTAMP,last_error=NULL WHERE id=?")
                    .bind(&id).execute(pool).await.map_err(|e| e.to_string())?;
                changed = true;
            }
            Err(error) => {
                sqlx::query("UPDATE sync_queue SET status='failed',attempts=attempts+1,last_error=? WHERE id=?")
                    .bind(&error).bind(&id).execute(pool).await.map_err(|e| e.to_string())?;
                first_error.get_or_insert(error);
                // One unavailable file/storage request must not delay record sync
                // for an entire batch. Lower-attempt files get a turn next cycle.
                break;
            }
        }
    }
    first_error.map_or(Ok(changed), Err)
}

pub async fn download_missing(
    pool: &SqlitePool,
    client: &reqwest::Client,
    url: &str,
    token: &str,
    app: &tauri::AppHandle,
) -> Result<bool, String> {
    let schools = sqlx::query("SELECT id,logo_object_key,logo_path FROM schools s WHERE logo_object_key IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sync_queue q WHERE q.table_name='__files' AND q.record_id=s.id AND q.status IN ('pending','failed') AND json_extract(q.payload_json,'$.path')=s.logo_path)")
        .fetch_all(pool).await.map_err(|e| e.to_string())?;
    let mut changed = false;
    let mut processed = 0;
    for school in schools {
        let id: String = school.get("id");
        let key: String = school.get("logo_object_key");
        if !valid_key(&key) {
            return Err("Cloud returned an invalid school logo reference".into());
        }
        let root = app.path().app_data_dir().map_err(|e| e.to_string())?;
        let target = root.join(&key);
        fs::create_dir_all(root.join("school-logos")).map_err(|e| e.to_string())?;
        if target.is_file()
            && school.get::<Option<String>, _>("logo_path").as_deref() == Some(key.as_str())
        {
            continue;
        }
        if processed >= 10 {
            break;
        }
        processed += 1;
        if !target.is_file() {
            let mut response = client
                .get(format!("{}/v1/files/{key}", url.trim_end_matches('/')))
                .bearer_auth(token)
                .send()
                .await
                .map_err(|_| "Logo download server is unreachable")?;
            if !response.status().is_success() {
                return Err(response_error(response).await);
            }
            let mut bytes = Vec::new();
            while let Some(chunk) = response
                .chunk()
                .await
                .map_err(|_| "Logo download interrupted")?
            {
                if bytes.len() + chunk.len() > MAX_BYTES as usize {
                    return Err("Downloaded logo exceeds 5 MB".into());
                }
                bytes.extend_from_slice(&chunk);
            }
            if bytes.is_empty() {
                return Err("Downloaded logo is empty".into());
            }
            let temp = root
                .join("school-logos")
                .join(format!("{}.part", uuid::Uuid::new_v4()));
            fs::write(&temp, &bytes).map_err(|e| e.to_string())?;
            fs::rename(&temp, &target).map_err(|e| e.to_string())?;
        }
        let mut tx = pool.begin().await.map_err(|e| e.to_string())?;
        sqlx::query("UPDATE __sync_meta SET applying=1 WHERE id=1")
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
        sqlx::query("UPDATE schools SET logo_path=? WHERE id=? AND logo_object_key=? AND NOT EXISTS (SELECT 1 FROM sync_queue q WHERE q.table_name='__files' AND q.record_id=schools.id AND q.status IN ('pending','failed') AND json_extract(q.payload_json,'$.path')=schools.logo_path)")
            .bind(&key).bind(&id).bind(&key).execute(&mut *tx).await.map_err(|e| e.to_string())?;
        sqlx::query("UPDATE __sync_meta SET applying=0 WHERE id=1")
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
        tx.commit().await.map_err(|e| e.to_string())?;
        changed = true;
    }
    Ok(changed)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn object_keys_stay_inside_managed_logo_storage() {
        assert!(valid_key(
            "school-logos/550e8400-e29b-41d4-a716-446655440000.png"
        ));
        for key in [
            "../secret.png",
            "school-logos/../../secret.svg",
            "school-logos/file.exe",
            "C:/secret.png",
        ] {
            assert!(!valid_key(key));
        }
    }
}
