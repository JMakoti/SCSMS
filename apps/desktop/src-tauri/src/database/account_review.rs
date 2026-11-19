use serde::{Deserialize, Serialize};
use sqlx::{Row, SqlitePool};
use tauri::State;

use super::auth::AccountSession;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReviewAccount {
    id: String,
    name: String,
    email: String,
    phone: Option<String>,
    role: String,
    role_id: String,
    subcounty: Option<String>,
    subcounty_id: Option<String>,
    status: String,
    created_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AccountOptions {
    current_user_id: String,
    roles: Vec<AvailableRole>,
}

#[derive(Serialize)]
pub struct AvailableRole {
    id: String,
    name: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AccountAction {
    account_id: String,
    expected_status: String,
    expected_role_id: String,
    action: String,
    new_role_id: Option<String>,
}

async fn administrator(pool: &SqlitePool, actor: &str) -> Result<(), String> {
    let authorized: i64 = sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ? AND u.status = 'active' AND lower(r.name) = 'administrator')")
        .bind(actor).fetch_one(pool).await.map_err(|_| "Unable to check administrator access.".to_string())?;
    if authorized == 0 {
        return Err("Only an active administrator can review accounts.".into());
    }
    Ok(())
}

async fn list_accounts(pool: &SqlitePool, actor: &str) -> Result<Vec<ReviewAccount>, String> {
    administrator(pool, actor).await?;
    let rows = sqlx::query("SELECT u.id, u.name, u.email, u.phone, u.role_id, u.subcounty_id, r.name AS role, s.sub_county AS subcounty, u.status, u.created_at FROM users u JOIN roles r ON r.id=u.role_id LEFT JOIN subcounty s ON s.id=u.subcounty_id ORDER BY CASE WHEN u.status='inactive' THEN 0 ELSE 1 END, u.created_at DESC, u.id")
        .fetch_all(pool).await.map_err(|_| "Unable to load accounts.".to_string())?;
    rows.into_iter()
        .map(|row| {
            Ok(ReviewAccount {
                id: row.try_get("id").map_err(|_| "Unable to read account.")?,
                name: row.try_get("name").map_err(|_| "Unable to read account.")?,
                email: row
                    .try_get("email")
                    .map_err(|_| "Unable to read account.")?,
                phone: row
                    .try_get("phone")
                    .map_err(|_| "Unable to read account.")?,
                role: row.try_get("role").map_err(|_| "Unable to read account.")?,
                role_id: row
                    .try_get("role_id")
                    .map_err(|_| "Unable to read account.")?,
                subcounty: row
                    .try_get("subcounty")
                    .map_err(|_| "Unable to read account.")?,
                subcounty_id: row
                    .try_get("subcounty_id")
                    .map_err(|_| "Unable to read account.")?,
                status: row
                    .try_get("status")
                    .map_err(|_| "Unable to read account.")?,
                created_at: row
                    .try_get("created_at")
                    .map_err(|_| "Unable to read account.")?,
            })
        })
        .collect()
}

async fn verify_account(
    pool: &SqlitePool,
    actor: &str,
    target: &str,
    role: &str,
    subcounty: Option<&str>,
) -> Result<(), String> {
    if target.is_empty() || target.len() > 36 {
        return Err("Invalid account.".into());
    }
    let mut tx = pool
        .begin()
        .await
        .map_err(|_| "Unable to start account verification.".to_string())?;
    // Recheck authorization in the same write transaction as activation.
    let changed = sqlx::query("UPDATE users SET status='active', updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='inactive' AND role_id=? AND subcounty_id IS ? AND EXISTS (SELECT 1 FROM users a JOIN roles r ON r.id=a.role_id WHERE a.id=? AND a.status='active' AND lower(r.name)='administrator')")
        .bind(target).bind(role).bind(subcounty).bind(actor).execute(&mut *tx).await.map_err(|_| "Unable to verify account.".to_string())?;
    if changed.rows_affected() != 1 {
        return Err("Account is no longer inactive, or administrator access is unavailable. Refresh and try again.".into());
    }
    sqlx::query("INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, before_json, after_json) VALUES (?, ?, 'verify_account', 'users', ?, ?, ?)")
        .bind(uuid::Uuid::new_v4().to_string()).bind(actor).bind(target).bind(r#"{"status":"inactive"}"#).bind(r#"{"status":"active"}"#)
        .execute(&mut *tx).await.map_err(|_| "Unable to record account verification.".to_string())?;
    tx.commit()
        .await
        .map_err(|_| "Unable to complete account verification.".to_string())
}

#[tauri::command]
pub async fn review_accounts(
    pool: State<'_, SqlitePool>,
    session: State<'_, AccountSession>,
) -> Result<Vec<ReviewAccount>, String> {
    list_accounts(pool.inner(), &session.user_id()?).await
}

#[tauri::command]
pub async fn account_review_options(
    pool: State<'_, SqlitePool>,
    session: State<'_, AccountSession>,
) -> Result<AccountOptions, String> {
    let actor = session.user_id()?;
    administrator(pool.inner(), &actor).await?;
    let rows = sqlx::query("SELECT id, name FROM roles ORDER BY name")
        .fetch_all(pool.inner())
        .await
        .map_err(|_| "Unable to load roles.".to_string())?;
    let roles = rows
        .into_iter()
        .map(|row| {
            Ok(AvailableRole {
                id: row.try_get("id").map_err(|_| "Unable to read role.")?,
                name: row.try_get("name").map_err(|_| "Unable to read role.")?,
            })
        })
        .collect::<Result<Vec<_>, String>>()?;
    Ok(AccountOptions {
        current_user_id: actor,
        roles,
    })
}

async fn manage_account(
    pool: &SqlitePool,
    actor: &str,
    input: &AccountAction,
) -> Result<(), String> {
    if input.account_id.is_empty() || input.account_id.len() > 36 || input.account_id == actor {
        return Err("You cannot change or delete your own account here.".into());
    }
    let (statement, new_status, new_role) = match input.action.as_str() {
        "lock" if input.expected_status == "active" || input.expected_status == "inactive" =>
            ("UPDATE users SET status='locked', updated_at=CURRENT_TIMESTAMP", Some("locked"), None),
        "unlock" if input.expected_status == "locked" =>
            ("UPDATE users SET status='inactive', updated_at=CURRENT_TIMESTAMP", Some("inactive"), None),
        "role" if input.new_role_id.as_ref().is_some_and(|id| !id.is_empty() && id.len() <= 36 && id != &input.expected_role_id) =>
            ("UPDATE users SET role_id=(SELECT id FROM roles WHERE id=?), updated_at=CURRENT_TIMESTAMP", None, input.new_role_id.as_deref()),
        "delete" => ("DELETE FROM users", None, None),
        _ => return Err("Invalid account action or unchanged role.".into()),
    };
    let mut tx = pool
        .begin()
        .await
        .map_err(|_| "Unable to start account update.".to_string())?;
    let query = format!("{statement} WHERE id=? AND status=? AND role_id=? AND EXISTS (SELECT 1 FROM users a JOIN roles r ON r.id=a.role_id WHERE a.id=? AND a.status='active' AND lower(r.name)='administrator')");
    let mut operation = sqlx::query(&query);
    if let Some(role) = new_role {
        operation = operation.bind(role);
    }
    let changed = operation
        .bind(&input.account_id)
        .bind(&input.expected_status)
        .bind(&input.expected_role_id)
        .bind(actor)
        .execute(&mut *tx)
        .await
        .map_err(|_| {
            "Unable to update account. Check the selected role and related records.".to_string()
        })?;
    if changed.rows_affected() != 1 {
        return Err("Account or administrator access has changed. Refresh and try again.".into());
    }
    let before =
        serde_json::json!({"status": input.expected_status, "roleId": input.expected_role_id});
    let after = if input.action == "delete" {
        serde_json::Value::Null
    } else {
        serde_json::json!({"status": new_status.unwrap_or(&input.expected_status), "roleId": new_role.unwrap_or(&input.expected_role_id)})
    };
    let audit_action = match input.action.as_str() {
        "lock" => "lock_account",
        "unlock" => "unlock_account",
        "role" => "change_account_role",
        _ => "delete_account",
    };
    sqlx::query("INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, before_json, after_json) VALUES (?, ?, ?, 'users', ?, ?, ?)")
        .bind(uuid::Uuid::new_v4().to_string()).bind(actor).bind(audit_action).bind(&input.account_id)
        .bind(before.to_string()).bind(after.to_string()).execute(&mut *tx).await.map_err(|_| "Unable to record account action.".to_string())?;
    tx.commit()
        .await
        .map_err(|_| "Unable to complete account action.".to_string())
}

#[tauri::command]
pub async fn manage_reviewed_account(
    pool: State<'_, SqlitePool>,
    session: State<'_, AccountSession>,
    input: AccountAction,
) -> Result<(), String> {
    manage_account(pool.inner(), &session.user_id()?, &input).await
}

#[tauri::command]
pub async fn activate_account(
    pool: State<'_, SqlitePool>,
    session: State<'_, AccountSession>,
    account_id: String,
    expected_role_id: String,
    expected_subcounty_id: Option<String>,
) -> Result<(), String> {
    verify_account(
        pool.inner(),
        &session.user_id()?,
        &account_id,
        &expected_role_id,
        expected_subcounty_id.as_deref(),
    )
    .await
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::database::migrations::run_migrations;

    #[test]
    fn account_management_checks_authorization_and_records_actions() {
        tauri::async_runtime::block_on(async {
            let pool = sqlx::sqlite::SqlitePoolOptions::new()
                .max_connections(1)
                .connect("sqlite::memory:")
                .await
                .unwrap();
            run_migrations(&pool).await.unwrap();
            sqlx::query("INSERT INTO roles(id,name) VALUES ('admin-role','administrator'),('staff-role','officer')").execute(&pool).await.unwrap();
            sqlx::query("INSERT INTO users(id,role_id,name,email,password_hash,status) VALUES ('admin','admin-role','Admin','admin@example.com','hash','active'),('staff','staff-role','Staff','staff@example.com','hash','active')").execute(&pool).await.unwrap();
            crate::database::sync::initialize(&pool).await.unwrap();
            let mut action = AccountAction {
                account_id: "staff".into(),
                expected_status: "active".into(),
                expected_role_id: "staff-role".into(),
                action: "lock".into(),
                new_role_id: None,
            };
            assert!(manage_account(&pool, "staff", &action).await.is_err());
            action.account_id = "admin".into();
            action.expected_role_id = "admin-role".into();
            assert!(manage_account(&pool, "staff", &action).await.is_err());
            assert!(manage_account(&pool, "admin", &action).await.is_err());
            action.account_id = "staff".into();
            action.expected_role_id = "staff-role".into();
            manage_account(&pool, "admin", &action).await.unwrap();
            assert!(manage_account(&pool, "admin", &action).await.is_err());
            action.expected_status = "locked".into();
            action.action = "role".into();
            action.new_role_id = Some("missing".into());
            assert!(manage_account(&pool, "admin", &action).await.is_err());
            action.new_role_id = Some("admin-role".into());
            manage_account(&pool, "admin", &action).await.unwrap();
            action.expected_role_id = "admin-role".into();
            action.action = "unlock".into();
            action.new_role_id = None;
            manage_account(&pool, "admin", &action).await.unwrap();
            action.expected_status = "inactive".into();
            action.action = "delete".into();
            manage_account(&pool, "admin", &action).await.unwrap();
            let count: i64 = sqlx::query_scalar("SELECT count(*) FROM users WHERE id='staff'")
                .fetch_one(&pool)
                .await
                .unwrap();
            assert_eq!(count, 0);
            let deletion: i64 = sqlx::query_scalar("SELECT count(*) FROM sync_queue WHERE table_name='users' AND record_id='staff' AND operation='delete'").fetch_one(&pool).await.unwrap();
            assert_eq!(deletion, 1);
            let audit: i64 = sqlx::query_scalar("SELECT count(*) FROM audit_logs WHERE actor_user_id='admin' AND entity_id='staff' AND action IN ('lock_account','unlock_account','change_account_role','delete_account')").fetch_one(&pool).await.unwrap();
            assert_eq!(audit, 4);
            sqlx::query("INSERT INTO users(id,role_id,name,email,password_hash,status) VALUES ('target','staff-role','Target','target@example.com','hash','active')").execute(&pool).await.unwrap();
            sqlx::query("DROP TABLE audit_logs")
                .execute(&pool)
                .await
                .unwrap();
            action.account_id = "target".into();
            action.expected_status = "active".into();
            action.expected_role_id = "staff-role".into();
            action.action = "lock".into();
            assert!(manage_account(&pool, "admin", &action).await.is_err());
            let status: String = sqlx::query_scalar("SELECT status FROM users WHERE id='target'")
                .fetch_one(&pool)
                .await
                .unwrap();
            assert_eq!(status, "active");
        });
    }

    #[test]
    fn only_active_administrators_can_review_and_verify_inactive_accounts() {
        tauri::async_runtime::block_on(async {
            let pool = sqlx::sqlite::SqlitePoolOptions::new()
                .max_connections(1)
                .connect("sqlite::memory:")
                .await
                .unwrap();
            run_migrations(&pool).await.unwrap();
            sqlx::query("INSERT INTO roles(id,name) VALUES ('admin-role','administrator'), ('staff-role','officer')").execute(&pool).await.unwrap();
            sqlx::query("INSERT INTO users(id,role_id,name,email,password_hash,status) VALUES ('admin','admin-role','Admin','admin@example.com','hash','active'), ('staff','staff-role','Staff','staff@example.com','hash','active'), ('pending','admin-role','Pending','pending@example.com','hash','inactive'), ('locked','staff-role','Locked','locked@example.com','hash','locked')").execute(&pool).await.unwrap();
            assert!(list_accounts(&pool, "staff").await.is_err());
            assert!(list_accounts(&pool, "missing").await.is_err());
            assert!(
                verify_account(&pool, "staff", "pending", "admin-role", None)
                    .await
                    .is_err()
            );
            assert_eq!(list_accounts(&pool, "admin").await.unwrap().len(), 4);
            assert!(verify_account(&pool, "admin", "locked", "staff-role", None)
                .await
                .is_err());
            assert!(
                verify_account(&pool, "admin", "pending", "staff-role", None)
                    .await
                    .is_err()
            );
            verify_account(&pool, "admin", "pending", "admin-role", None)
                .await
                .unwrap();
            assert!(
                verify_account(&pool, "admin", "pending", "admin-role", None)
                    .await
                    .is_err()
            );
            let status: String = sqlx::query_scalar("SELECT status FROM users WHERE id='pending'")
                .fetch_one(&pool)
                .await
                .unwrap();
            assert_eq!(status, "active");
            let audit: i64 = sqlx::query_scalar("SELECT count(*) FROM audit_logs WHERE actor_user_id='admin' AND action='verify_account' AND entity_id='pending'").fetch_one(&pool).await.unwrap();
            assert_eq!(audit, 1);
            sqlx::query("INSERT INTO users(id,role_id,name,email,password_hash,status) VALUES ('pending2','staff-role','Pending','pending2@example.com','hash','inactive')").execute(&pool).await.unwrap();
            sqlx::query("DROP TABLE audit_logs")
                .execute(&pool)
                .await
                .unwrap();
            assert!(
                verify_account(&pool, "admin", "pending2", "staff-role", None)
                    .await
                    .is_err()
            );
            let rolled_back: String =
                sqlx::query_scalar("SELECT status FROM users WHERE id='pending2'")
                    .fetch_one(&pool)
                    .await
                    .unwrap();
            assert_eq!(rolled_back, "inactive");
            sqlx::query("UPDATE users SET status='inactive' WHERE id='admin'")
                .execute(&pool)
                .await
                .unwrap();
            assert!(list_accounts(&pool, "admin").await.is_err());
        });
    }
}
