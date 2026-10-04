use bcrypt::{hash, DEFAULT_COST};
use sqlx::Row;
use sqlx::SqlitePool;
use tauri::State;

const ADMIN_EMAIL: &str = "admin@scsms.go.ke";
const DEFAULT_ADMIN_PASSWORD: &str = "Admin@123";

/// Seed the complete initial SCSMS database.
///
/// This command is intentionally idempotent:
/// running it multiple times will not create duplicate
/// subcounties, roles, or administrator accounts.
#[tauri::command]
pub async fn seed_database(pool: State<'_, SqlitePool>) -> Result<(), String> {
    seed_initial_data(pool.inner()).await
}

pub async fn seed_initial_data(pool: &SqlitePool) -> Result<(), String> {
    println!("Starting SCSMS database seed...");

    seed_subcounty(pool).await?;
    seed_administrator(pool).await?;

    println!("SCSMS database seeding completed.");

    Ok(())
}

/// Seed the default Rabai subcounty.
async fn seed_subcounty(pool: &SqlitePool) -> Result<(), String> {
    println!("Seeding sub-county...");

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
        println!("Rabai already exists - skipping");
        return Ok(());
    }

    sqlx::query(
        r#"
        INSERT INTO subcounty (
            id,
            county,
            county_code,
            sub_county,
            sub_county_code,
            constituency,
            constituency_code,
            notes,
            is_active
        )
        VALUES (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?
        )
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

    println!("Created Rabai");

    Ok(())
}

/// Seed the administrator role and administrator account.
async fn seed_administrator(pool: &SqlitePool) -> Result<(), String> {
    println!("Seeding administrator...");

    // --------------------------------------------------
    // 1. Get or create administrator role
    // --------------------------------------------------

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

    let role_id: String;

    if let Some(role) = existing_role {
        role_id = role
            .try_get::<String, _>("id")
            .map_err(|error| format!("Failed to read administrator role ID: {error}"))?;

        println!("Administrator role already exists");
    } else {
        role_id = uuid::Uuid::new_v4().to_string();

        sqlx::query(
            r#"
            INSERT INTO roles (
                id,
                name,
                description,
                permissions_json,
                is_system
            )
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

        println!("Administrator role created");
    }

    // --------------------------------------------------
    // 2. Find the active subcounty
    // --------------------------------------------------

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
            .try_get::<String, _>("id")
            .map_err(|error| format!("Failed to read subcounty ID: {error}"))?,

        None => {
            return Err(
                "No active sub-county found. Seed the sub-county before creating the administrator."
                    .to_string(),
            );
        }
    };

    // --------------------------------------------------
    // 3. Check whether administrator already exists
    // --------------------------------------------------

    let existing_admin = sqlx::query(
        r#"
        SELECT id
        FROM users
        WHERE email = ?
        LIMIT 1
        "#,
    )
    .bind(ADMIN_EMAIL)
    .fetch_optional(pool)
    .await
    .map_err(|error| format!("Failed to check administrator account: {error}"))?;

    if existing_admin.is_some() {
        println!("{} already exists - skipping", ADMIN_EMAIL);

        return Ok(());
    }

    // --------------------------------------------------
    // 4. Get administrator password
    // --------------------------------------------------

    let password = std::env::var("SCSMS_ADMIN_PASSWORD")
        .unwrap_or_else(|_| DEFAULT_ADMIN_PASSWORD.to_string());

    if password.len() < 8 {
        return Err("SCSMS_ADMIN_PASSWORD must contain at least 8 characters.".to_string());
    }

    // --------------------------------------------------
    // 5. Hash password
    // --------------------------------------------------

    let password_hash = hash(password, DEFAULT_COST)
        .map_err(|error| format!("Failed to hash administrator password: {error}"))?;

    // --------------------------------------------------
    // 6. Create administrator
    // --------------------------------------------------

    sqlx::query(
        r#"
        INSERT INTO users (
            id,
            role_id,
            subcounty_id,
            name,
            email,
            password_hash,
            status
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

    println!("Administrator created: {}", ADMIN_EMAIL);

    Ok(())
}
