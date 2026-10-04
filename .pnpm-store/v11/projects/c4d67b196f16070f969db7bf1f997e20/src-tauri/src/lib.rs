mod database;

use database::connection::create_pool;
use database::migrations::run_migrations;
use database::proxy::run_sql;
use database::seed::seed_initial_data;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let handle = app.handle().clone();

            tauri::async_runtime::block_on(async move {
                let pool = create_pool("sqlite:scsms.db")
                    .await
                    .expect("Failed to connect to SQLite database");

                run_migrations(&pool)
                    .await
                    .expect("Failed to run SQLite migrations");

                seed_initial_data(&pool)
                    .await
                    .expect("Failed to seed SQLite database");

                handle.manage(pool);
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            run_sql,
            database::seed::seed_database
        ])
        .run(tauri::generate_context!())
        .expect("error while running SCSMS");
}
