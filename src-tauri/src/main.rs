// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{fs::read_dir, path::Path, collections::HashMap, sync::Mutex};
use serde_json::Value;
use tauri::{AppHandle, Manager};
use walkdir::{WalkDir, DirEntry};
use lazy_static::lazy_static;

lazy_static! {
   static ref STOP: Mutex<bool> = Mutex::new(false);
}

#[tauri::command(async)]
async fn set_stop(value: bool) {
    *STOP.lock().unwrap() = value
}

fn remove_extension(full_filename: &str) -> String {
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
        let emit_data: HashMap<&str, Value> = HashMap::from([
            ("isFolder", Value::Bool(if entry.path().is_dir() { true } else { false })),
            ("name", Value::String(entry.file_name().to_string_lossy().to_string())),
            ("path", Value::String(entry.path().to_string_lossy().to_string()))
        ]);

        let _ = app_handle.emit_all("add", emit_data);
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
                if *STOP.lock().unwrap() {
                    *STOP.lock().unwrap() = false;
                    return
                }
                
                let emit_data: HashMap<&str, Value> = HashMap::from([
                    ("isFolder", Value::Bool(if entry.path().is_dir() { true } else { false })),
                    ("name", Value::String(entry.file_name().to_string_lossy().to_string())),
                    ("path", Value::String(entry.path().to_string_lossy().to_string()))
                ]);

                let _ = app_handle.emit_all("add", emit_data);
            }
    }
}

#[tokio::main]
async fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![open_file_in_default_application, find_files_and_folders, read_directory, set_stop])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
