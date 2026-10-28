use bcrypt::{hash, verify};
use serde::{Deserialize, Serialize};
use sqlx::{Row, SqlitePool};
use std::sync::Mutex;
use tauri::State;

#[derive(Default)]
pub struct AccountSession {
    user_id: Mutex<Option<String>>,
}

impl AccountSession {
    fn user_id(&self) -> Result<String, String> {
        self.user_id
            .lock()
            .map_err(|_| "Account session unavailable.".to_string())?
            .clone()
            .ok_or_else(|| "Sign in to update your account.".to_string())
    }
}

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
    session: State<'_, AccountSession>,
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

    *session
        .user_id
        .lock()
        .map_err(|_| "Account session unavailable.".to_string())? = Some(user_id.clone());

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

#[tauri::command]
pub fn logout(session: State<'_, AccountSession>) -> Result<(), String> {
    *session
        .user_id
        .lock()
        .map_err(|_| "Account session unavailable.".to_string())? = None;
    Ok(())
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileUpdate {
    name: String,
    email: String,
    phone: String,
    subcounty_id: String,
}

#[tauri::command]
pub async fn update_account_profile(
    pool: State<'_, SqlitePool>,
    session: State<'_, AccountSession>,
    values: ProfileUpdate,
) -> Result<ProfileUpdate, String> {
    let user_id = session.user_id()?;
    save_account_profile(pool.inner(), &user_id, values).await
}

async fn save_account_profile(
    pool: &SqlitePool,
    user_id: &str,
    values: ProfileUpdate,
) -> Result<ProfileUpdate, String> {
    let mut values = ProfileUpdate {
        name: values.name.trim().to_string(),
        email: values.email.trim().to_lowercase(),
        phone: values.phone.trim().to_string(),
        subcounty_id: values.subcounty_id,
    };
    if values.name.is_empty()
        || values.name.chars().count() > 200
        || values.email.len() > 320
        || values.email.chars().any(char::is_whitespace)
        || !values.email.split_once('@').is_some_and(|(name, domain)| {
            !name.is_empty() && domain.contains('.') && !domain.contains('@')
        })
        || values.phone.chars().count() > 40
        || values.subcounty_id.len() > 36
    {
        return Err("Enter valid profile details.".to_string());
    }
    let account =
        sqlx::query("SELECT email, subcounty_id FROM users WHERE id = ? AND status = 'active'")
            .bind(user_id)
            .fetch_optional(pool)
            .await
            .map_err(|_| "Your account could not be read.".to_string())?
            .ok_or_else(|| "Your account is no longer active. Sign in again.".to_string())?;
    let current_email: String = account
        .try_get("email")
        .map_err(|_| "Your account could not be read.".to_string())?;
    let current_area: Option<String> = account
        .try_get("subcounty_id")
        .map_err(|_| "Your account could not be read.".to_string())?;
    if values.email != current_email.to_lowercase() {
        return Err("Your sign-in email cannot be changed.".to_string());
    }
    if values.subcounty_id != current_area.unwrap_or_default() {
        return Err("Your assigned sub-county cannot be changed.".to_string());
    }
    values.email = current_email;
    let updated = sqlx::query("UPDATE users SET name = ?, phone = NULLIF(?, ''), updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'active'")
        .bind(&values.name).bind(&values.phone).bind(user_id)
        .execute(pool).await.map_err(|_| "Your profile could not be saved. Please try again.".to_string())?;
    if updated.rows_affected() != 1 {
        return Err("Your account is no longer active. Sign in again.".to_string());
    }
    Ok(values)
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PasswordUpdate {
    current_password: String,
    new_password: String,
    confirm_password: String,
}

fn replacement_password(values: &PasswordUpdate, existing_hash: &str) -> Result<String, String> {
    if values.current_password.is_empty() || values.current_password.len() > 1024 {
        return Err("Enter your current password.".to_string());
    }
    if values.new_password.chars().count() < 8 || values.new_password.len() > 72 {
        return Err(
            "Use at least 8 characters and at most 72 bytes for your new password.".to_string(),
        );
    }
    if values.new_password != values.confirm_password {
        return Err("Passwords do not match.".to_string());
    }
    if values.new_password == values.current_password {
        return Err("Choose a different password.".to_string());
    }
    if !verify(&values.current_password, existing_hash)
        .map_err(|_| "Your password could not be verified.".to_string())?
    {
        return Err("Your current password is incorrect.".to_string());
    }
    hash(&values.new_password, 12).map_err(|_| "Your password could not be updated.".to_string())
}

#[tauri::command]
pub async fn change_account_password(
    pool: State<'_, SqlitePool>,
    session: State<'_, AccountSession>,
    values: PasswordUpdate,
) -> Result<(), String> {
    let user_id = session.user_id()?;
    let row = sqlx::query("SELECT password_hash FROM users WHERE id = ? AND status = 'active'")
        .bind(&user_id)
        .fetch_optional(pool.inner())
        .await
        .map_err(|_| "Your account could not be read.".to_string())?
        .ok_or_else(|| "Your account is no longer active. Sign in again.".to_string())?;
    let existing_hash: String = row
        .try_get("password_hash")
        .map_err(|_| "Your account could not be read.".to_string())?;
    let previous_hash = existing_hash.clone();
    let new_hash =
        tauri::async_runtime::spawn_blocking(move || replacement_password(&values, &existing_hash))
            .await
            .map_err(|_| "Your password could not be updated.".to_string())??;
    let result = sqlx::query("UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND password_hash = ? AND status = 'active'")
        .bind(new_hash).bind(user_id).bind(previous_hash).execute(pool.inner()).await
        .map_err(|_| "Your password could not be updated.".to_string())?;
    if result.rows_affected() != 1 {
        return Err("Your account changed during this request. Sign in again.".to_string());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn account_updates_require_a_session() {
        let session = AccountSession::default();
        assert!(session.user_id().is_err());
        *session.user_id.lock().unwrap() = Some("signed-in-user".to_string());
        assert_eq!(session.user_id().unwrap(), "signed-in-user");
        *session.user_id.lock().unwrap() = None;
        assert!(session.user_id().is_err());
    }

    #[test]
    fn password_change_checks_current_password_and_hashes_the_replacement() {
        let original = hash("OldPassword123", 4).unwrap();
        let mut values = PasswordUpdate {
            current_password: "wrong password".to_string(),
            new_password: "NewPassword456".to_string(),
            confirm_password: "NewPassword456".to_string(),
        };
        assert!(replacement_password(&values, &original)
            .unwrap_err()
            .contains("incorrect"));
        values.current_password = "OldPassword123".to_string();
        let updated = replacement_password(&values, &original).unwrap();
        assert_ne!(updated, values.new_password);
        assert!(verify("NewPassword456", &updated).unwrap());
        assert!(!verify("OldPassword123", &updated).unwrap());
        values.confirm_password = "different".to_string();
        assert!(replacement_password(&values, &original).is_err());
        values.new_password = "short".to_string();
        values.confirm_password = "short".to_string();
        assert!(replacement_password(&values, &original).is_err());
        values.new_password = "x".repeat(73);
        values.confirm_password = values.new_password.clone();
        assert!(replacement_password(&values, &original).is_err());
    }

    #[test]
    fn profile_updates_only_the_signed_in_account_and_keeps_email_unchanged() {
        tauri::async_runtime::block_on(async {
            let pool = sqlx::sqlite::SqlitePoolOptions::new()
                .max_connections(1)
                .connect("sqlite::memory:")
                .await
                .unwrap();
            sqlx::query("CREATE TABLE subcounty (id TEXT PRIMARY KEY)")
                .execute(&pool)
                .await
                .unwrap();
            sqlx::query("CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT, email TEXT UNIQUE, phone TEXT, subcounty_id TEXT, status TEXT, updated_at TEXT)")
                .execute(&pool).await.unwrap();
            sqlx::query("INSERT INTO users (id,name,email,status) VALUES ('self','Officer','old@example.com','active'), ('other','Other','other@example.com','active')")
                .execute(&pool).await.unwrap();
            sqlx::query("UPDATE users SET subcounty_id = 'area-a' WHERE id = 'self'")
                .execute(&pool)
                .await
                .unwrap();
            let input = ProfileUpdate {
                name: "Updated Officer".to_string(),
                email: "old@example.com".to_string(),
                phone: "+254700000000".to_string(),
                subcounty_id: "area-a".to_string(),
            };
            save_account_profile(&pool, "self", input).await.unwrap();
            let name: String = sqlx::query_scalar("SELECT name FROM users WHERE id = 'other'")
                .fetch_one(&pool)
                .await
                .unwrap();
            assert_eq!(name, "Other");
            let email: String = sqlx::query_scalar("SELECT email FROM users WHERE id = 'self'")
                .fetch_one(&pool)
                .await
                .unwrap();
            assert_eq!(email, "old@example.com");
            let changed_email = ProfileUpdate {
                name: "Officer".to_string(),
                email: "new-address@example.com".to_string(),
                phone: String::new(),
                subcounty_id: String::new(),
            };
            let error = save_account_profile(&pool, "self", changed_email)
                .await
                .unwrap_err();
            assert!(error.contains("email cannot be changed"));
            let changed_area = ProfileUpdate {
                name: "Officer".to_string(),
                email: "old@example.com".to_string(),
                phone: String::new(),
                subcounty_id: "area-b".to_string(),
            };
            let error = save_account_profile(&pool, "self", changed_area)
                .await
                .unwrap_err();
            assert!(error.contains("sub-county cannot be changed"));
            let area: String =
                sqlx::query_scalar("SELECT subcounty_id FROM users WHERE id = 'self'")
                    .fetch_one(&pool)
                    .await
                    .unwrap();
            assert_eq!(area, "area-a");
        });
    }
}
