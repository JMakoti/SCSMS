use bcrypt::verify;
use serde::{Deserialize, Serialize};
use sqlx::{Row, SqlitePool};
use tauri::State;

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    email: String,
    password: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginUser {
    id: String,
    name: String,
    email: String,
    role_id: String,
    role_name: String,
    permissions: Vec<String>,
}

#[tauri::command]
pub async fn login(
    pool: State<'_, SqlitePool>,
    credentials: LoginRequest,
) -> Result<LoginUser, String> {
    let email = credentials.email.trim().to_lowercase();

    if email.is_empty() || credentials.password.is_empty() {
        return Err("Email and password are required.".to_string());
    }

    let row = sqlx::query(
        r#"
        SELECT
            users.id,
            users.name,
            users.email,
            users.password_hash,
            users.status,
            users.role_id,
            roles.name AS role_name,
            roles.permissions_json
        FROM users
        INNER JOIN roles ON roles.id = users.role_id
        WHERE lower(users.email) = ?
        LIMIT 1
        "#,
    )
    .bind(&email)
    .fetch_optional(pool.inner())
    .await
    .map_err(|error| format!("Failed to read user account: {error}"))?;

    let Some(row) = row else {
        return Err("Invalid email or password.".to_string());
    };

    let status = row
        .try_get::<String, _>("status")
        .map_err(|error| format!("Failed to read user status: {error}"))?;

    if status != "active" {
        return Err("This account is not active.".to_string());
    }

    let password_hash = row
        .try_get::<String, _>("password_hash")
        .map_err(|error| format!("Failed to read password hash: {error}"))?;

    let is_valid = verify(credentials.password, &password_hash)
        .map_err(|error| format!("Failed to verify password: {error}"))?;

    if !is_valid {
        return Err("Invalid email or password.".to_string());
    }

    let permissions_json = row
        .try_get::<String, _>("permissions_json")
        .map_err(|error| format!("Failed to read role permissions: {error}"))?;
    let permissions = serde_json::from_str::<Vec<String>>(&permissions_json).unwrap_or_default();
    let user_id = row
        .try_get::<String, _>("id")
        .map_err(|error| format!("Failed to read user ID: {error}"))?;

    sqlx::query(
        r#"
        UPDATE users
        SET last_login_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        "#,
    )
    .bind(&user_id)
    .execute(pool.inner())
    .await
    .map_err(|error| format!("Failed to update login timestamp: {error}"))?;

    Ok(LoginUser {
        id: user_id,
        name: row
            .try_get::<String, _>("name")
            .map_err(|error| format!("Failed to read user name: {error}"))?,
        email: row
            .try_get::<String, _>("email")
            .map_err(|error| format!("Failed to read user email: {error}"))?,
        role_id: row
            .try_get::<String, _>("role_id")
            .map_err(|error| format!("Failed to read user role ID: {error}"))?,
        role_name: row
            .try_get::<String, _>("role_name")
            .map_err(|error| format!("Failed to read user role name: {error}"))?,
        permissions,
    })
}
