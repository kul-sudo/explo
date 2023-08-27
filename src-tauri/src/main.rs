// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::collections::HashMap;

use tauri::{AppHandle, Manager};
use walkdir::WalkDir;

fn remove_extension(full_filename: String) -> String {
    let pos: Option<usize> = full_filename.rfind('.');

    if pos == None {
        return full_filename
    } else {
        return full_filename[0..pos.unwrap()].to_string()
    }
}

#[tauri::command]
fn open_file_in_default_application(file_name: String) -> () {
    let _ = open::that(file_name);
}

#[tauri::command]
async fn find_files_and_folders(app_handle: AppHandle, command: String) {
    let args: Vec<&str> = command.split(',').collect();

    let directory: &str = args[0];
    let target_file: &str = args[1];

    for entry in WalkDir::new(directory)
        .follow_links(true)
        .into_iter()
        .filter_map(|entry: Result<walkdir::DirEntry, walkdir::Error>| entry.ok())
        .filter(|entry| directory != entry.path().to_string_lossy().to_string() && remove_extension(entry.file_name().to_string_lossy().to_string()).contains(target_file)) {
            if entry.path().is_dir() {
                let _ = app_handle.emit_all("add", HashMap::from([
                    ("isFolder", "yes".to_string()),
                    ("name", entry.file_name().to_string_lossy().to_string()),
                    ("path", entry.path().to_string_lossy().to_string())
                ]));
            } else {
                let _ = app_handle.emit_all("add", HashMap::from([
                    ("isFolder", "no".to_string()),
                    ("name", entry.file_name().to_string_lossy().to_string()),
                    ("path", entry.path().to_string_lossy().to_string())
                ]));
            }
        }
}

#[tokio::main]
async fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![open_file_in_default_application, find_files_and_folders])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
