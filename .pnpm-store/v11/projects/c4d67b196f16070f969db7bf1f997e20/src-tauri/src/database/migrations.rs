use sqlx::{Executor, SqlitePool};

const INITIAL_SCHEMA_VERSION: i64 = 1;
const SUBJECT_COMBINATIONS_SCHEMA_VERSION: i64 = 2;
const WARD_GEOGRAPHY_SCHEMA_VERSION: i64 = 3;
const WARD_SUBCOUNTY_SCHEMA_VERSION: i64 = 4;
const INFRASTRUCTURE_PROJECT_TERM_SCHEMA_VERSION: i64 = 5;
const SCHOOL_CLUSTER_LEVEL_SCHEMA_VERSION: i64 = 6;
const INITIAL_SCHEMA_SQL: &str =
    include_str!("../../../../../database/drizzle/sqlite/0000_empty_scourge.sql");
const SUBJECT_COMBINATIONS_SCHEMA_SQL: &str =
    include_str!("../../../../../database/drizzle/sqlite/0001_foamy_ultron.sql");
const WARD_GEOGRAPHY_SCHEMA_SQL: &str =
    include_str!("../../../../../database/drizzle/sqlite/0002_flaky_phil_sheldon.sql");
const WARD_SUBCOUNTY_SCHEMA_SQL: &str =
    include_str!("../../../../../database/drizzle/sqlite/0003_ward_subcounty_relation.sql");
const INFRASTRUCTURE_PROJECT_TERM_SCHEMA_SQL: &str =
    include_str!("../../../../../database/drizzle/sqlite/0004_hesitant_giant_man.sql");
const SCHOOL_CLUSTER_LEVEL_SCHEMA_SQL: &str =
    include_str!("../../../../../database/drizzle/sqlite/0005_school_cluster_level.sql");

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

    if !migration_exists(pool, INITIAL_SCHEMA_VERSION).await? {
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

        if !schema_already_exists {
            apply_migration(pool, INITIAL_SCHEMA_SQL).await?;
        }

        record_migration(pool, INITIAL_SCHEMA_VERSION, "initial sqlite schema").await?;
    }

    if !migration_exists(pool, SUBJECT_COMBINATIONS_SCHEMA_VERSION).await? {
        apply_migration(pool, SUBJECT_COMBINATIONS_SCHEMA_SQL).await?;
        record_migration(
            pool,
            SUBJECT_COMBINATIONS_SCHEMA_VERSION,
            "school subject combinations",
        )
        .await?;
    }

    if !migration_exists(pool, WARD_GEOGRAPHY_SCHEMA_VERSION).await? {
        apply_migration(pool, WARD_GEOGRAPHY_SCHEMA_SQL).await?;
        record_migration(pool, WARD_GEOGRAPHY_SCHEMA_VERSION, "ward geography fields").await?;
    }

    if !migration_exists(pool, WARD_SUBCOUNTY_SCHEMA_VERSION).await? {
        apply_migration(pool, WARD_SUBCOUNTY_SCHEMA_SQL).await?;
        record_migration(
            pool,
            WARD_SUBCOUNTY_SCHEMA_VERSION,
            "ward sub-county relationship",
        )
        .await?;
    }

    if !migration_exists(pool, INFRASTRUCTURE_PROJECT_TERM_SCHEMA_VERSION).await? {
        apply_migration(pool, INFRASTRUCTURE_PROJECT_TERM_SCHEMA_SQL).await?;
        record_migration(
            pool,
            INFRASTRUCTURE_PROJECT_TERM_SCHEMA_VERSION,
            "infrastructure project term",
        )
        .await?;
    }

    if !migration_exists(pool, SCHOOL_CLUSTER_LEVEL_SCHEMA_VERSION).await? {
        apply_migration(pool, SCHOOL_CLUSTER_LEVEL_SCHEMA_SQL).await?;
        record_migration(
            pool,
            SCHOOL_CLUSTER_LEVEL_SCHEMA_VERSION,
            "school cluster level",
        )
        .await?;
    }

    Ok(())
}

async fn migration_exists(pool: &SqlitePool, version: i64) -> Result<bool, String> {
    let existing = sqlx::query(
        r#"
        SELECT version
        FROM __scsms_migrations
        WHERE version = ?
        LIMIT 1
        "#,
    )
    .bind(version)
    .fetch_optional(pool)
    .await
    .map_err(|error| format!("Failed to check database migrations: {error}"))?;
    Ok(existing.is_some())
}

async fn apply_migration(pool: &SqlitePool, migration_sql: &str) -> Result<(), String> {
    let mut connection = pool
        .acquire()
        .await
        .map_err(|error| format!("Failed to acquire database connection for migration: {error}"))?;

    connection
        .execute("PRAGMA foreign_keys = OFF")
        .await
        .map_err(|error| format!("Failed to disable SQLite foreign keys for migration: {error}"))?;
    if let Err(error) = connection.execute("BEGIN IMMEDIATE").await {
        let foreign_keys_error = connection.execute("PRAGMA foreign_keys = ON").await.err();
        return Err(format!(
            "Failed to begin SQLite migration transaction: {error}; foreign-key restore error: {foreign_keys_error:?}"
        ));
    }

    for statement in migration_sql.split("--> statement-breakpoint") {
        let statement = statement.trim();

        if statement.is_empty() {
            continue;
        }

        if let Err(error) = connection.execute(statement).await {
            let rollback_error = connection.execute("ROLLBACK").await.err();
            let foreign_keys_error = connection.execute("PRAGMA foreign_keys = ON").await.err();
            return Err(format!(
                "Failed to apply database migration: {error}; rollback error: {rollback_error:?}; foreign-key restore error: {foreign_keys_error:?}"
            ));
        }
    }

    if let Err(error) = connection.execute("COMMIT").await {
        let rollback_error = connection.execute("ROLLBACK").await.err();
        let foreign_keys_error = connection.execute("PRAGMA foreign_keys = ON").await.err();
        return Err(format!(
            "Failed to commit SQLite migration: {error}; rollback error: {rollback_error:?}; foreign-key restore error: {foreign_keys_error:?}"
        ));
    }
    connection
        .execute("PRAGMA foreign_keys = ON")
        .await
        .map_err(|error| format!("Failed to restore SQLite foreign keys: {error}"))?;

    Ok(())
}

async fn record_migration(
    pool: &SqlitePool,
    version: i64,
    description: &str,
) -> Result<(), String> {
    sqlx::query(
        r#"
        INSERT OR IGNORE INTO __scsms_migrations (version, description)
        VALUES (?, ?)
        "#,
    )
    .bind(version)
    .bind(description)
    .execute(pool)
    .await
    .map_err(|error| format!("Failed to record database migration: {error}"))?;

    Ok(())
}
