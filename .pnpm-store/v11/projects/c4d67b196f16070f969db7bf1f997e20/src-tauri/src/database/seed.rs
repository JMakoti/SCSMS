use bcrypt::{hash, DEFAULT_COST};
use sqlx::{Row, SqlitePool};
use tauri::State;

const ADMIN_EMAIL: &str = "admin@scsms.go.ke";
const DEFAULT_ADMIN_PASSWORD: &str = "Admin@123";

#[tauri::command]
pub async fn seed_database(pool: State<'_, SqlitePool>) -> Result<(), String> {
    seed_initial_data(pool.inner()).await
}

pub async fn seed_initial_data(pool: &SqlitePool) -> Result<(), String> {
    seed_subcounty(pool).await?;
    seed_administrator(pool).await?;
    Ok(())
}

async fn seed_subcounty(pool: &SqlitePool) -> Result<(), String> {
    let existing = sqlx::query(
        r#"
        SELECT id
        FROM subcounty
        WHERE sub_county_code = ?
        LIMIT 1
        "#,
    )
    .bind("00301")
    .fetch_optional(pool)
    .await
    .map_err(|error| format!("Failed to check subcounty: {error}"))?;

    if existing.is_some() {
        return Ok(());
    }

    sqlx::query(
        r#"
        INSERT INTO subcounty (
            id, county, county_code, sub_county, sub_county_code,
            constituency, constituency_code, notes, is_active
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(uuid::Uuid::new_v4().to_string())
    .bind("Kilifi")
    .bind("003")
    .bind("Rabai")
    .bind("00301")
    .bind("Rabai")
    .bind("00301")
    .bind("Rabai Sub-County")
    .bind(true)
    .execute(pool)
    .await
    .map_err(|error| format!("Failed to create Rabai subcounty: {error}"))?;

    Ok(())
}

async fn seed_administrator(pool: &SqlitePool) -> Result<(), String> {
    let existing_role = sqlx::query(
        r#"
        SELECT id
        FROM roles
        WHERE name = ?
        LIMIT 1
        "#,
    )
    .bind("administrator")
    .fetch_optional(pool)
    .await
    .map_err(|error| format!("Failed to check administrator role: {error}"))?;

    let role_id: String = if let Some(role) = existing_role {
        role.try_get("id")
            .map_err(|error| format!("Failed to read administrator role ID: {error}"))?
    } else {
        let role_id = uuid::Uuid::new_v4().to_string();
        sqlx::query(
            r#"
            INSERT INTO roles (id, name, description, permissions_json, is_system)
            VALUES (?, ?, ?, ?, ?)
            "#,
        )
        .bind(&role_id)
        .bind("administrator")
        .bind("System administrator with full access to SCSMS.")
        .bind(r#"["*"]"#)
        .bind(true)
        .execute(pool)
        .await
        .map_err(|error| format!("Failed to create administrator role: {error}"))?;
        role_id
    };

    let active_subcounty = sqlx::query(
        r#"
        SELECT id
        FROM subcounty
        WHERE is_active = ?
        LIMIT 1
        "#,
    )
    .bind(true)
    .fetch_optional(pool)
    .await
    .map_err(|error| format!("Failed to find active subcounty: {error}"))?;

    let subcounty_id: String = match active_subcounty {
        Some(row) => row
            .try_get("id")
            .map_err(|error| format!("Failed to read subcounty ID: {error}"))?,
        None => {
            return Err(
                "No active sub-county found. Seed the sub-county before creating the administrator."
                    .to_string(),
            );
        }
    };

    let existing_admin = sqlx::query(
        r#"
        SELECT id
        FROM users
        WHERE email = ? OR role_id = ?
        LIMIT 1
        "#,
    )
    .bind(ADMIN_EMAIL)
    .bind(&role_id)
    .fetch_optional(pool)
    .await
    .map_err(|error| format!("Failed to check administrator account: {error}"))?;

    if existing_admin.is_some() {
        return Ok(());
    }

    let password = std::env::var("SCSMS_ADMIN_PASSWORD")
        .unwrap_or_else(|_| DEFAULT_ADMIN_PASSWORD.to_string());
    if password.len() < 8 {
        return Err("SCSMS_ADMIN_PASSWORD must contain at least 8 characters.".to_string());
    }

    let password_hash = hash(password, DEFAULT_COST)
        .map_err(|error| format!("Failed to hash administrator password: {error}"))?;

    sqlx::query(
        r#"
        INSERT INTO users (
            id, role_id, subcounty_id, name, email, password_hash, status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(uuid::Uuid::new_v4().to_string())
    .bind(&role_id)
    .bind(&subcounty_id)
    .bind("System Administrator")
    .bind(ADMIN_EMAIL)
    .bind(password_hash)
    .bind("active")
    .execute(pool)
    .await
    .map_err(|error| format!("Failed to create administrator: {error}"))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn startup_preserves_an_administrator_with_an_updated_email() {
        tauri::async_runtime::block_on(async {
            let pool = sqlx::sqlite::SqlitePoolOptions::new()
                .max_connections(1)
                .connect("sqlite::memory:")
                .await
                .unwrap();
            sqlx::query("CREATE TABLE roles (id TEXT PRIMARY KEY, name TEXT)")
                .execute(&pool)
                .await
                .unwrap();
            sqlx::query("CREATE TABLE subcounty (id TEXT PRIMARY KEY, sub_county_code TEXT, is_active INTEGER)").execute(&pool).await.unwrap();
            sqlx::query("CREATE TABLE users (id TEXT PRIMARY KEY, role_id TEXT, email TEXT)")
                .execute(&pool)
                .await
                .unwrap();
            sqlx::query("INSERT INTO roles VALUES ('admin-role', 'administrator')")
                .execute(&pool)
                .await
                .unwrap();
            sqlx::query("INSERT INTO subcounty VALUES ('area', '00301', 1)")
                .execute(&pool)
                .await
                .unwrap();
            sqlx::query(
                "INSERT INTO users VALUES ('officer', 'admin-role', 'updated@example.com')",
            )
            .execute(&pool)
            .await
            .unwrap();
            seed_initial_data(&pool).await.unwrap();
            let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM users")
                .fetch_one(&pool)
                .await
                .unwrap();
            assert_eq!(count, 1);
        });
    }
}
