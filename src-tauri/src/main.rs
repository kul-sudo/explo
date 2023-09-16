// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{fs::read_dir, path::{Path, PathBuf}, collections::HashMap, sync::Mutex};
use serde_json::Value;
use tauri::{AppHandle, Manager};
use walkdir::{WalkDir, DirEntry};
use lazy_static::lazy_static;
use sysinfo::{System, SystemExt, Disk, DiskExt};
use serde::Serialize;

lazy_static! {
   static ref STOP: Mutex<bool> = Mutex::new(false);
}

fn bytes_to_gb(bytes: u64) -> u16 {
    (bytes / (1e+9 as u64)) as u16
}

#[derive(Serialize)]
pub struct Volume {
    mountpoint: PathBuf,
    available_gb: u16,
    used_gb: u16,
    total_gb: u16,
}

impl Volume {
    fn from(disk: &Disk) -> Self {
        let used_bytes = disk.total_space() - disk.available_space();
        let available_gb = bytes_to_gb(disk.available_space());
        let used_gb = bytes_to_gb(used_bytes);
        let total_gb = bytes_to_gb(disk.total_space());

        let mountpoint = disk.mount_point().to_path_buf();
        
        Self {
            mountpoint,
            available_gb,
            used_gb,
            total_gb
        }
    }
}

#[tauri::command]
fn get_volumes() -> Result<Vec<Volume>, ()> {
    let mut sys = System::new_all();
    sys.refresh_all();

    let volumes = sys
        .disks()
        .iter()
        .map(|disk| {
            let volume = Volume::from(disk);

            volume
        })
        .collect();

    Ok(volumes)
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
        .invoke_handler(tauri::generate_handler![open_file_in_default_application, find_files_and_folders, read_directory, set_stop, get_volumes])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
