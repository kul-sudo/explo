// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{fs::read_dir, path::Path, collections::HashMap};
use tauri::{AppHandle, Manager};
use walkdir::{WalkDir, DirEntry};

// lazy_static! {
//    static ref CACHE: Mutex<Vec<HashMap<String, String>>> = Mutex::new(Vec::new());
// }

fn remove_extension(full_filename: &str) -> String {
    if full_filename.matches(".").count() == 1 {
        return full_filename.to_string()
    }
    return Path::new(full_filename).file_stem().unwrap().to_string_lossy().to_string();
}

fn is_not_hidden(entry: &DirEntry, include_hidden: &str) -> bool {
    if include_hidden.to_string() == "true" {
        return true
    }

    !entry
        .path()
        .components()
        .any(|c| c.as_os_str().to_string_lossy().starts_with("."))
}

#[tauri::command(async)]
async fn open_file_in_default_application(file_name: String) {
    let _ = open::that(file_name);
}

#[tauri::command(async)]
async fn read_directory(app_handle: AppHandle, directory: String) {
    for entry in read_dir(directory).unwrap().filter_map(|e| e.ok()) {
        let emit_data = HashMap::from([
            ("isFolder", if entry.path().is_dir() { "yes" } else { "no" }.to_string()),
            ("name", entry.file_name().to_string_lossy().to_string()),
            ("path", entry.path().to_string_lossy().to_string())
        ]);

        let _ = app_handle.emit_all("add_found", emit_data);
    }
}

#[tauri::command(async)]
async fn find_files_and_folders(app_handle: AppHandle, command: String) {
    if let [directory, target_file, include_hidden] = command.split(',').collect::<Vec<_>>().as_slice() {
        for entry in WalkDir::new(directory)
            .follow_links(true)
            .into_iter()
            .filter_map(|entry: Result<walkdir::DirEntry, walkdir::Error>| entry.ok())
            .filter(|entry| *directory != entry.path().to_string_lossy() && remove_extension(entry.file_name().to_str().unwrap()).contains(target_file) && is_not_hidden(entry, include_hidden)) {
                let is_folder = entry.path().is_dir();
                let emit_data = HashMap::from([
                    ("isFolder", if is_folder { "yes" } else { "no" }.to_string()),
                    ("name", entry.file_name().to_string_lossy().to_string()),
                    ("path", entry.path().to_string_lossy().to_string())
                ]);

                let _ = app_handle.emit_all("add", emit_data);
            }
    }
}

#[tokio::main]
async fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![open_file_in_default_application, find_files_and_folders, read_directory])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
