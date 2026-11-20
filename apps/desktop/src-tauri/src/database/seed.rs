use serde::Deserialize;
use sqlx::{Row, SqlitePool};
use tauri::State;

const REFERENCE_DATA: &str = include_str!("../../../../../database/src/seed/reference-data.json");
const SYNC_RECONCILIATION_PREFIX: &str =
    "Existing sync state requires coordinated seed ID reconciliation";

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Seeds {
    sub_counties: Vec<SubCounty>,
    administrator_role: Role,
    scde_role: Role,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SubCounty {
    id: String,
    county: String,
    county_code: String,
    sub_county: String,
    sub_county_code: String,
    knec_code: String,
    constituency: String,
    constituency_code: String,
    notes: String,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Role {
    id: String,
    name: String,
    description: String,
    permissions_json: String,
    is_system: bool,
}

#[tauri::command]
pub async fn seed_database(pool: State<'_, SqlitePool>) -> Result<(), String> {
    seed_initial_data(pool.inner()).await
}

pub async fn seed_initial_data(pool: &SqlitePool) -> Result<(), String> {
    let mut data: Seeds =
        serde_json::from_str(REFERENCE_DATA).map_err(|e| format!("Invalid seed data: {e}"))?;
    data.sub_counties
        .sort_by_key(|x| x.sub_county_code != "00304");
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;
    for item in &data.sub_counties {
        let rows = sqlx::query(
            "SELECT id, sub_county_code FROM subcounty WHERE lower(sub_county) = lower(?)",
        )
        .bind(&item.sub_county)
        .fetch_all(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
        if rows.len() > 1 {
            return Err(format!(
                "Multiple sub-counties named {}; resolve before seeding",
                item.sub_county
            ));
        }
        let old = rows.first().map(|r| r.get::<String, _>("id"));
        let legacy_rabai = item.sub_county_code == "00304"
            && rows
                .first()
                .and_then(|r| r.get::<Option<String>, _>("sub_county_code"))
                .as_deref()
                == Some("00301");
        let occupied =
            sqlx::query("SELECT id FROM subcounty WHERE sub_county_code = ? AND id != ?")
                .bind(&item.sub_county_code)
                .bind(old.as_deref().unwrap_or(&item.id))
                .fetch_optional(&mut *tx)
                .await
                .map_err(|e| e.to_string())?;
        if occupied.is_some() {
            return Err(format!(
                "Sub-county code {} belongs to another record",
                item.sub_county_code
            ));
        }
        if let Some(ref existing_id) = old {
            sqlx::query("UPDATE subcounty SET knec_code = ? WHERE id = ? AND knec_code IS NULL")
                .bind(&item.knec_code)
                .bind(existing_id)
                .execute(&mut *tx)
                .await
                .map_err(|e| e.to_string())?;
        }
        match old {
            Some(old) if old != item.id => {
                let pending = sqlx::query("SELECT id FROM sync_queue WHERE status != 'synced' AND (record_id = ? OR instr(coalesce(payload_json, ''), ?) > 0) LIMIT 1").bind(&old).bind(&old).fetch_optional(&mut *tx).await.map_err(|e| e.to_string())?;
                let sync_initialized: i64 = sqlx::query_scalar("SELECT count(*) FROM sqlite_master WHERE type='trigger' AND name='__sync_subcounty_insert'").fetch_one(&mut *tx).await.map_err(|e| e.to_string())?;
                if pending.is_some() || sync_initialized != 0 {
                    // Keep the referenced ID, but free Kilifi North's code from
                    // the incorrect legacy Rabai record. Sync triggers capture
                    // the correction without modifying existing queued events.
                    if legacy_rabai {
                        sqlx::query("UPDATE subcounty SET sub_county_code = ?, constituency = ?, constituency_code = ? WHERE id = ?")
                            .bind(&item.sub_county_code).bind(&item.constituency).bind(&item.constituency_code).bind(&old)
                            .execute(&mut *tx).await.map_err(|e| e.to_string())?;
                    }
                    log::warn!("{SYNC_RECONCILIATION_PREFIX}: {old}");
                    continue;
                }
                sqlx::query("UPDATE subcounty SET sub_county_code = NULL WHERE id = ?")
                    .bind(&old)
                    .execute(&mut *tx)
                    .await
                    .map_err(|e| e.to_string())?;
                sqlx::query("INSERT INTO subcounty (id, county, county_code, sub_county, sub_county_code, knec_code, constituency, constituency_code, notes, boundary_geojson, is_active, created_at, updated_at) SELECT ?, county, county_code, sub_county, ?, knec_code, constituency, constituency_code, notes, boundary_geojson, is_active, created_at, updated_at FROM subcounty WHERE id = ?").bind(&item.id).bind(&item.sub_county_code).bind(&old).execute(&mut *tx).await.map_err(|e| e.to_string())?;
                if legacy_rabai {
                    sqlx::query(
                        "UPDATE subcounty SET constituency = ?, constituency_code = ? WHERE id = ?",
                    )
                    .bind(&item.constituency)
                    .bind(&item.constituency_code)
                    .bind(&item.id)
                    .execute(&mut *tx)
                    .await
                    .map_err(|e| e.to_string())?;
                }
                sqlx::query("UPDATE wards SET sub_county_id = ? WHERE sub_county_id = ?")
                    .bind(&item.id)
                    .bind(&old)
                    .execute(&mut *tx)
                    .await
                    .map_err(|e| e.to_string())?;
                sqlx::query("UPDATE users SET subcounty_id = ? WHERE subcounty_id = ?")
                    .bind(&item.id)
                    .bind(&old)
                    .execute(&mut *tx)
                    .await
                    .map_err(|e| e.to_string())?;
                sqlx::query("UPDATE audit_logs SET entity_id = ? WHERE entity_type = 'subcounty' AND entity_id = ?").bind(&item.id).bind(&old).execute(&mut *tx).await.map_err(|e| e.to_string())?;
                sqlx::query("DELETE FROM subcounty WHERE id = ?")
                    .bind(&old)
                    .execute(&mut *tx)
                    .await
                    .map_err(|e| e.to_string())?;
            }
            Some(_) => {
                sqlx::query("UPDATE subcounty SET sub_county_code = ? WHERE id = ? AND sub_county_code IS NOT ?")
                    .bind(&item.sub_county_code)
                    .bind(&item.id)
                    .bind(&item.sub_county_code)
                    .execute(&mut *tx)
                    .await
                    .map_err(|e| e.to_string())?;
            }
            None => {
                sqlx::query("INSERT INTO subcounty (id, county, county_code, sub_county, sub_county_code, knec_code, constituency, constituency_code, notes, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(&item.id).bind(&item.county).bind(&item.county_code).bind(&item.sub_county).bind(&item.sub_county_code).bind(&item.knec_code).bind(&item.constituency).bind(&item.constituency_code).bind(&item.notes).bind(true).execute(&mut *tx).await.map_err(|e| e.to_string())?;
            }
        }
    }
    let role = &data.administrator_role;
    let existing = sqlx::query("SELECT id FROM roles WHERE name = ?")
        .bind(&role.name)
        .fetch_optional(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    if let Some(row) = existing {
        let old: String = row.get("id");
        if old != role.id {
            let pending = sqlx::query("SELECT id FROM sync_queue WHERE status != 'synced' AND (record_id = ? OR instr(coalesce(payload_json, ''), ?) > 0) LIMIT 1").bind(&old).bind(&old).fetch_optional(&mut *tx).await.map_err(|e| e.to_string())?;
            let sync_initialized: i64 = sqlx::query_scalar("SELECT count(*) FROM sqlite_master WHERE type='trigger' AND name='__sync_roles_insert'").fetch_one(&mut *tx).await.map_err(|e| e.to_string())?;
            if pending.is_some() || sync_initialized != 0 {
                log::warn!("{SYNC_RECONCILIATION_PREFIX}: {old}");
            } else {
                sqlx::query("UPDATE roles SET name = ? WHERE id = ?")
                    .bind(format!("__seed_migration_{old}"))
                    .bind(&old)
                    .execute(&mut *tx)
                    .await
                    .map_err(|e| e.to_string())?;
                sqlx::query("INSERT INTO roles (id, name, description, permissions_json, is_system, created_at, updated_at) SELECT ?, ?, description, permissions_json, is_system, created_at, updated_at FROM roles WHERE id = ?").bind(&role.id).bind(&role.name).bind(&old).execute(&mut *tx).await.map_err(|e| e.to_string())?;
                sqlx::query("UPDATE users SET role_id = ? WHERE role_id = ?")
                    .bind(&role.id)
                    .bind(&old)
                    .execute(&mut *tx)
                    .await
                    .map_err(|e| e.to_string())?;
                sqlx::query(
                "UPDATE audit_logs SET entity_id = ? WHERE entity_type = 'roles' AND entity_id = ?",
            )
            .bind(&role.id)
            .bind(&old)
            .execute(&mut *tx)
            .await
            .map_err(|e| e.to_string())?;
                sqlx::query("DELETE FROM roles WHERE id = ?")
                    .bind(&old)
                    .execute(&mut *tx)
                    .await
                    .map_err(|e| e.to_string())?;
            }
        }
    } else {
        sqlx::query("INSERT INTO roles (id, name, description, permissions_json, is_system) VALUES (?, ?, ?, ?, ?)").bind(&role.id).bind(&role.name).bind(&role.description).bind(&role.permissions_json).bind(role.is_system).execute(&mut *tx).await.map_err(|e| e.to_string())?;
    }
    let scde = &data.scde_role;
    sqlx::query("INSERT INTO roles (id, name, description, permissions_json, is_system) VALUES (?, ?, ?, ?, ?) ON CONFLICT(name) DO NOTHING")
        .bind(&scde.id).bind(&scde.name).bind(&scde.description).bind(&scde.permissions_json).bind(scde.is_system)
        .execute(&mut *tx).await.map_err(|e| format!("Failed to seed SCDE role: {e}"))?;
    tx.commit().await.map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::migrations::run_migrations;

    #[test]
    fn seed_populates_knec_codes_and_preserves_existing_values() {
        tauri::async_runtime::block_on(async {
            let pool = sqlx::sqlite::SqlitePoolOptions::new()
                .max_connections(1)
                .connect("sqlite::memory:")
                .await
                .unwrap();
            run_migrations(&pool).await.unwrap();
            sqlx::query("INSERT INTO subcounty (id, sub_county, sub_county_code) VALUES ('legacy', 'Rabai', '00304')")
                .execute(&pool).await.unwrap();
            seed_initial_data(&pool).await.unwrap();
            let codes: Vec<(String, Option<String>)> =
                sqlx::query_as("SELECT sub_county, knec_code FROM subcounty ORDER BY sub_county")
                    .fetch_all(&pool)
                    .await
                    .unwrap();
            let data: Seeds = serde_json::from_str(REFERENCE_DATA).unwrap();
            assert_eq!(codes.len(), data.sub_counties.len());
            for item in &data.sub_counties {
                assert!(codes.iter().any(|(name, code)| name == &item.sub_county
                    && code.as_deref() == Some(item.knec_code.as_str())));
            }
            sqlx::query("UPDATE subcounty SET knec_code = '99999' WHERE sub_county = 'Rabai'")
                .execute(&pool)
                .await
                .unwrap();
            seed_initial_data(&pool).await.unwrap();
            let code: String =
                sqlx::query_scalar("SELECT knec_code FROM subcounty WHERE sub_county = 'Rabai'")
                    .fetch_one(&pool)
                    .await
                    .unwrap();
            assert_eq!(code, "99999");
        });
    }

    #[test]
    fn startup_defers_reconciliation_without_changing_pending_data() {
        tauri::async_runtime::block_on(async {
            let pool = sqlx::sqlite::SqlitePoolOptions::new()
                .max_connections(1)
                .connect("sqlite::memory:")
                .await
                .unwrap();
            run_migrations(&pool).await.unwrap();
            sqlx::query("INSERT INTO subcounty (id, county, county_code, sub_county, sub_county_code) VALUES ('old-area', 'Kilifi', '003', 'Rabai', '00301')").execute(&pool).await.unwrap();
            crate::database::sync::initialize(&pool).await.unwrap();
            sqlx::query("INSERT INTO sync_queue (id, table_name, record_id, operation, payload_json, status) VALUES ('event', 'users', 'user', 'update', '{\"subcounty_id\":\"old-area\"}', 'failed')").execute(&pool).await.unwrap();

            seed_initial_data(&pool).await.unwrap();
            let area: (String, String) = sqlx::query_as(
                "SELECT id, sub_county_code FROM subcounty WHERE sub_county='Rabai'",
            )
            .fetch_one(&pool)
            .await
            .unwrap();
            assert_eq!(area, ("old-area".into(), "00304".into()));
            let count: i64 =
                sqlx::query_scalar("SELECT COUNT(*) FROM subcounty WHERE is_active = 1")
                    .fetch_one(&pool)
                    .await
                    .unwrap();
            assert_eq!(count, 9);
            let north: String = sqlx::query_scalar(
                "SELECT sub_county FROM subcounty WHERE sub_county_code='00301'",
            )
            .fetch_one(&pool)
            .await
            .unwrap();
            assert_eq!(north, "Kilifi North");
            let event: (String, String) =
                sqlx::query_as("SELECT payload_json, status FROM sync_queue WHERE id='event'")
                    .fetch_one(&pool)
                    .await
                    .unwrap();
            assert_eq!(
                event,
                ("{\"subcounty_id\":\"old-area\"}".into(), "failed".into())
            );
            sqlx::query("UPDATE sync_queue SET status='synced' WHERE id='event'")
                .execute(&pool)
                .await
                .unwrap();
            let queue_before: i64 = sqlx::query_scalar("SELECT count(*) FROM sync_queue")
                .fetch_one(&pool)
                .await
                .unwrap();
            seed_initial_data(&pool).await.unwrap();
            let queue_after: i64 = sqlx::query_scalar("SELECT count(*) FROM sync_queue")
                .fetch_one(&pool)
                .await
                .unwrap();
            assert_eq!(queue_before, queue_after);
            let unchanged: String =
                sqlx::query_scalar("SELECT id FROM subcounty WHERE sub_county='Rabai'")
                    .fetch_one(&pool)
                    .await
                    .unwrap();
            assert_eq!(unchanged, "old-area");
        });
    }

    #[test]
    fn seeds_stable_ids_and_preserves_legacy_references() {
        tauri::async_runtime::block_on(async {
            let pool = sqlx::sqlite::SqlitePoolOptions::new()
                .max_connections(1)
                .connect("sqlite::memory:")
                .await
                .unwrap();
            run_migrations(&pool).await.unwrap();
            sqlx::query("INSERT INTO subcounty (id, county, county_code, sub_county, sub_county_code) VALUES ('old-area', 'Kilifi', '003', 'Rabai', '00301')").execute(&pool).await.unwrap();
            sqlx::query("INSERT INTO roles (id, name) VALUES ('old-role', 'administrator')")
                .execute(&pool)
                .await
                .unwrap();
            sqlx::query("INSERT INTO users (id, role_id, subcounty_id, name, email, password_hash) VALUES ('user', 'old-role', 'old-area', 'Test', 'test@example.org', 'hash')").execute(&pool).await.unwrap();
            seed_initial_data(&pool).await.unwrap();
            seed_initial_data(&pool).await.unwrap();
            let data: Seeds = serde_json::from_str(REFERENCE_DATA).unwrap();
            let scde_id: String = sqlx::query_scalar("SELECT id FROM roles WHERE name='scde'")
                .fetch_one(&pool)
                .await
                .unwrap();
            assert_eq!(scde_id, data.scde_role.id);
            let rabai = data
                .sub_counties
                .iter()
                .find(|x| x.sub_county_code == "00304")
                .unwrap();
            let row = sqlx::query("SELECT role_id, subcounty_id FROM users WHERE id = 'user'")
                .fetch_one(&pool)
                .await
                .unwrap();
            assert_eq!(row.get::<String, _>("role_id"), data.administrator_role.id);
            assert_eq!(row.get::<String, _>("subcounty_id"), rabai.id);
            let count: i64 = sqlx::query_scalar("SELECT count(*) FROM subcounty")
                .fetch_one(&pool)
                .await
                .unwrap();
            assert_eq!(count, 9);
            let north: String = sqlx::query_scalar(
                "SELECT sub_county FROM subcounty WHERE sub_county_code = '00301'",
            )
            .fetch_one(&pool)
            .await
            .unwrap();
            assert_eq!(north, "Kilifi North");
        });
    }
}
