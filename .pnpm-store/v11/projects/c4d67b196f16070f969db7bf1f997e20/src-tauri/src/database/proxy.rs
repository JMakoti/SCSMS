use serde_json::Value;
use sqlx::{Column, Row, SqlitePool, TypeInfo};

#[tauri::command]
pub async fn run_sql(
    pool: tauri::State<'_, SqlitePool>,
    sql: String,
    params: Vec<Value>,
    method: String,
) -> Result<Value, String> {
    let mut query = sqlx::query(&sql);

    for param in params {
        query = match param {
            Value::Null => query.bind(Option::<String>::None),

            Value::String(value) => query.bind(value),

            Value::Bool(value) => query.bind(value),

            Value::Number(value) => {
                if let Some(value) = value.as_i64() {
                    query.bind(value)
                } else if let Some(value) = value.as_f64() {
                    query.bind(value)
                } else {
                    return Err("Unsupported numeric parameter".to_string());
                }
            }

            _ => {
                return Err("Unsupported SQL parameter type".to_string());
            }
        };
    }

    match method.as_str() {
        "run" => {
            let result = query
                .execute(pool.inner())
                .await
                .map_err(|error| error.to_string())?;

            Ok(serde_json::json!({
                "rows": {
                    "changes": result.rows_affected()
                }
            }))
        }

        "all" | "values" => {
            let rows = query
                .fetch_all(pool.inner())
                .await
                .map_err(|error| error.to_string())?;

            let result = rows
                .iter()
                .map(row_to_json_array)
                .collect::<Result<Vec<_>, _>>()?;

            Ok(serde_json::json!({
                "rows": result
            }))
        }

        "get" => {
            let row = query
                .fetch_optional(pool.inner())
                .await
                .map_err(|error| error.to_string())?;

            match row {
                Some(row) => Ok(serde_json::json!({
                    "rows": row_to_json_array(&row)?
                })),

                None => Ok(serde_json::json!({
                    "rows": []
                })),
            }
        }

        _ => Err(format!("Unsupported Drizzle method: {method}")),
    }
}

fn row_to_json_array(row: &sqlx::sqlite::SqliteRow) -> Result<Vec<Value>, String> {
    let mut values = Vec::new();

    for column in row.columns() {
        let type_name = column.type_info().name();

        let value = match type_name {
            "INTEGER" => {
                let value: Option<i64> = row
                    .try_get(column.name())
                    .map_err(|error| error.to_string())?;

                value.map_or(Value::Null, |value| Value::Number(value.into()))
            }

            "REAL" => {
                let value: Option<f64> = row
                    .try_get(column.name())
                    .map_err(|error| error.to_string())?;

                match value {
                    Some(value) => serde_json::Number::from_f64(value)
                        .map(Value::Number)
                        .unwrap_or(Value::Null),

                    None => Value::Null,
                }
            }

            "TEXT" => {
                let value: Option<String> = row
                    .try_get(column.name())
                    .map_err(|error| error.to_string())?;

                value.map_or(Value::Null, Value::String)
            }

            "BLOB" => {
                let value: Option<Vec<u8>> = row
                    .try_get(column.name())
                    .map_err(|error| error.to_string())?;

                match value {
                    Some(value) => Value::Array(
                        value
                            .into_iter()
                            .map(|byte| Value::Number(byte.into()))
                            .collect(),
                    ),

                    None => Value::Null,
                }
            }

            _ => Value::Null,
        };

        values.push(value);
    }

    Ok(values)
}
