use std::{fs, path::PathBuf};

use serde::Serialize;
use tauri::{AppHandle, Manager};
use uuid::Uuid;

const ALLOWED_LOGO_EXTENSIONS: &[&str] = &["png", "jpg", "jpeg", "webp", "svg"];

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolvedSchoolLogo {
    absolute_path: String,
    relative_path: String,
}

#[tauri::command]
pub fn store_school_logo(app: AppHandle, source_path: String) -> Result<String, String> {
    let source = PathBuf::from(&source_path);
    let metadata = fs::metadata(&source)
        .map_err(|error| format!("Unable to read the selected logo file: {error}"))?;
    if !metadata.is_file() {
        return Err("The selected school logo must be a file.".to_string());
    }

    let extension = source
        .extension()
        .and_then(|value| value.to_str())
        .map(str::to_ascii_lowercase)
        .filter(|extension| ALLOWED_LOGO_EXTENSIONS.contains(&extension.as_str()))
        .ok_or_else(|| "Choose a PNG, JPG, JPEG, WEBP, or SVG image.".to_string())?;

    let logo_directory = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Unable to locate the application data directory: {error}"))?
        .join("school-logos");
    fs::create_dir_all(&logo_directory)
        .map_err(|error| format!("Unable to create the school logo directory: {error}"))?;

    let stored_path = logo_directory.join(format!("{}.{}", Uuid::new_v4(), extension));
    fs::copy(&source, &stored_path)
        .map_err(|error| format!("Unable to copy the school logo into app storage: {error}"))?;

    let file_name = stored_path
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or_else(|| "The stored school logo filename is not valid UTF-8.".to_string())?;

    Ok(format!("school-logos/{file_name}"))
}

#[tauri::command]
pub fn resolve_school_logo_path(
    app: AppHandle,
    logo_path: String,
) -> Result<ResolvedSchoolLogo, String> {
    let relative_path = PathBuf::from(&logo_path);
    let mut components = relative_path.components();
    let valid_relative_path = matches!(
        (components.next(), components.next(), components.next()),
        (
            Some(std::path::Component::Normal(directory)),
            Some(std::path::Component::Normal(file_name)),
            None
        ) if directory == "school-logos" && !file_name.is_empty()
    );
    let logo_directory = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Unable to locate the application data directory: {error}"))?
        .join("school-logos");
    let logo_file = if valid_relative_path {
        logo_directory.join(
            relative_path
                .file_name()
                .ok_or_else(|| "The school logo filename is invalid.".to_string())?,
        )
    } else {
        let legacy_source = PathBuf::from(&logo_path);
        let metadata = fs::metadata(&legacy_source)
            .map_err(|error| format!("Unable to read the legacy school logo file: {error}"))?;
        if !metadata.is_file() {
            return Err("The legacy school logo path is not a file.".to_string());
        }
        let extension = legacy_source
            .extension()
            .and_then(|value| value.to_str())
            .map(str::to_ascii_lowercase)
            .filter(|extension| ALLOWED_LOGO_EXTENSIONS.contains(&extension.as_str()))
            .ok_or_else(|| "The legacy school logo file type is not supported.".to_string())?;
        fs::create_dir_all(&logo_directory)
            .map_err(|error| format!("Unable to create the school logo directory: {error}"))?;
        let managed_path = logo_directory.join(format!("{}.{}", Uuid::new_v4(), extension));
        fs::copy(&legacy_source, &managed_path)
            .map_err(|error| format!("Unable to migrate the legacy school logo: {error}"))?;
        managed_path
    };
    fs::create_dir_all(&logo_directory)
        .map_err(|error| format!("Unable to create the school logo directory: {error}"))?;
    let canonical_directory = logo_directory
        .canonicalize()
        .map_err(|error| format!("Unable to access the school logo directory: {error}"))?;
    let canonical_file = logo_file
        .canonicalize()
        .map_err(|error| format!("Unable to access the school logo file: {error}"))?;
    if !canonical_file.starts_with(&canonical_directory) || !canonical_file.is_file() {
        return Err("The school logo file is unavailable.".to_string());
    }

    let absolute_path = canonical_file
        .to_str()
        .map(str::to_owned)
        .ok_or_else(|| "The school logo path is not valid UTF-8.".to_string())?;
    let file_name = canonical_file
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or_else(|| "The school logo filename is not valid UTF-8.".to_string())?;

    Ok(ResolvedSchoolLogo {
        absolute_path,
        relative_path: format!("school-logos/{file_name}"),
    })
}
