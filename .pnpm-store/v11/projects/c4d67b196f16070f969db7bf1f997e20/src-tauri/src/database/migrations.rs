use sqlx::{Executor, SqlitePool};

const INITIAL_SCHEMA_VERSION: i64 = 1;
const INITIAL_SCHEMA_SQL: &str =
    include_str!("../../../../../database/drizzle/sqlite/0000_empty_scourge.sql");

pub async fn run_migrations(pool: &SqlitePool) -> Result<(), String> {
    pool.execute(
        r#"
        CREATE TABLE IF NOT EXISTS __scsms_migrations (
            version INTEGER PRIMARY KEY NOT NULL,
            description TEXT NOT NULL,
            applied_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
        "#,
    )
    .await
    .map_err(|error| format!("Failed to create migration bookkeeping table: {error}"))?;

    let existing = sqlx::query(
        r#"
        SELECT version
        FROM __scsms_migrations
        WHERE version = ?
        LIMIT 1
        "#,
    )
    .bind(INITIAL_SCHEMA_VERSION)
    .fetch_optional(pool)
    .await
    .map_err(|error| format!("Failed to check database migrations: {error}"))?;

    if existing.is_some() {
        return Ok(());
    }

    let schema_already_exists = sqlx::query(
        r#"
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name = 'users'
        LIMIT 1
        "#,
    )
    .fetch_optional(pool)
    .await
    .map_err(|error| format!("Failed to inspect database schema: {error}"))?
    .is_some();

    if schema_already_exists {
        record_initial_schema_migration(pool).await?;

        return Ok(());
    }

    for statement in INITIAL_SCHEMA_SQL.split("--> statement-breakpoint") {
        let statement = statement.trim();

        if statement.is_empty() {
            continue;
        }

        pool.execute(statement)
            .await
            .map_err(|error| format!("Failed to apply initial schema statement: {error}"))?;
    }

    record_initial_schema_migration(pool).await?;

    Ok(())
}

async fn record_initial_schema_migration(pool: &SqlitePool) -> Result<(), String> {
    sqlx::query(
        r#"
        INSERT OR IGNORE INTO __scsms_migrations (version, description)
        VALUES (?, ?)
        "#,
    )
    .bind(INITIAL_SCHEMA_VERSION)
    .bind("initial sqlite schema")
    .execute(pool)
    .await
    .map_err(|error| format!("Failed to record database migration: {error}"))?;

    Ok(())
}
