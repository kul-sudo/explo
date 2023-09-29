// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{fs::read_dir, sync::Arc, path::{Path, PathBuf}};
use regex::Regex;
use tauri::{AppHandle, Manager};
use tokio::sync::Mutex;
use walkdir::WalkDir;
use sysinfo::{System, SystemExt, Disk, DiskExt};
use serde::Serialize;
use serde_json::Value;
use lazy_static::lazy_static;
use globmatch::is_hidden_path;

lazy_static! {
   static ref STOP_FINDING: Arc<Mutex<bool>> = Arc::new(Mutex::new(false));
}

macro_rules! bytes_to_gb {
    ($bytes:expr) => {
        ($bytes / (1e+9 as u64)) as u16
    };
}

#[derive(Serialize)]
struct Volume {
    is_removable: bool,
    kind: String,
    mountpoint: PathBuf,
    available_gb: u16,
    used_gb: u16,
    total_gb: u16,
}

fn from_volume(disk: &Disk) -> Volume {
    let used_bytes = disk.total_space() - disk.available_space();
    let available_gb = bytes_to_gb!(disk.available_space());
    let used_gb = bytes_to_gb!(used_bytes);
    let total_gb = bytes_to_gb!(disk.total_space());

    let mountpoint = disk.mount_point().to_path_buf();
    let kind = format!("{:?}", disk.kind());
    let is_removable = disk.is_removable();

    Volume {
        is_removable,
        kind,
        mountpoint,
        available_gb,
        used_gb,
        total_gb
    }
}

#[tauri::command]
fn get_volumes() -> Vec<Volume> {
    let mut sys = System::new_all();

    sys.refresh_all();

    let volumes = sys
        .disks()
        .iter()
        .map(|disk| {
            let volume = from_volume(disk);

            return volume
        })
        .collect();

    return volumes
}

// is_match, but for a mask
fn match_mask(s: &str, mask: &str) -> bool {
    let mut s_index = 0;
    let mut mask_index = 0;
    let mut s_star = 0;
    let mut mask_star = None;

    while s_index < s.len() {
        if mask_index < mask.len() && (mask.chars().nth(mask_index) == Some('?') || s.chars().nth(s_index) == mask.chars().nth(mask_index)) {
            s_index += 1;
            mask_index += 1;
        } else if mask_index < mask.len() && mask.chars().nth(mask_index) == Some('*') {
            mask_star = Some(mask_index);
            mask_index += 1;
            s_star = s_index;
        } else if mask_star.is_some() {
            mask_index = mask_star.unwrap() + 1;
            s_star += 1;
            s_index = s_star;
        } else {
            return false;
        }
    }

    while mask_index < mask.len() && mask.chars().nth(mask_index) == Some('*') {
        mask_index += 1;
    }

    mask_index == mask.len()
}

macro_rules! is_suitable {
    ($search_in_directory:expr, $filename_without_extension:expr, $searching_mode:expr) => {
        match $searching_mode {
            // Pure text
            0 => $filename_without_extension.contains($search_in_directory),
            // Mask (a simplified type of regex)
            1 => match_mask($filename_without_extension, $search_in_directory),
            // Regex
            2 => Regex::new($search_in_directory).unwrap().is_match($filename_without_extension),
            _ => false
        }
    };
}

#[tauri::command(async)]
async fn stop_finding() {
    *STOP_FINDING.lock().await = true
}

macro_rules! remove_extension {
    ($full_filename:expr) => {
        Path::new($full_filename).file_stem().unwrap().to_str().unwrap()
    };
}

macro_rules! get_extension {
    ($full_filename:expr) => {
        Path::new($full_filename).extension().and_then(|c| c.to_str())
    };
}

#[tauri::command(async)]
async fn open_file_in_default_application(file_name: String) {
    let _ = open::that(file_name);
}

#[tauri::command(async)]
async fn read_directory(app_handle: AppHandle, directory: String) {
    if directory.is_empty() {
        return
    };

    // Reading the top layer of the dir
    for entry in read_dir(directory).unwrap().filter_map(|e| e.ok()) {
        let filename = entry.file_name().to_string_lossy().to_string();
        let extension = get_extension!(&filename).unwrap_or_default();
        let entry_path = entry.path();

        // [isFolder, name, path, extension]
        let _ = app_handle.emit_all("add", (
            Value::Bool(entry_path.is_dir()),
            Value::String(filename.to_string()),
            Value::String(entry_path.to_string_lossy().to_string()),
            Value::String(extension.to_string())
        ));
    }
}


#[tauri::command(async, rename_all = "snake_case")]
async fn find_files_and_folders(app_handle: AppHandle, current_directory: String, search_in_directory: String, include_hidden_folders: bool, include_file_extension: bool, searching_mode: u8) {
    // Recursively reading the dir
    for entry in WalkDir::new(&current_directory)
        .follow_links(true)
        .into_iter()
        .filter_map(|entry: Result<walkdir::DirEntry, walkdir::Error>| entry.ok()) {
            // When searching is supposed to be stopped, the variable gets set to true, so we need
            // to set its value back to true and quit the function by returning
            if *STOP_FINDING.lock().await {
                *STOP_FINDING.lock().await = false;
                return
            }

            let entry_path = entry.path();
            let entry_filename = entry.file_name().to_str().unwrap();

            if current_directory != entry_path.to_string_lossy() &&
            (include_hidden_folders || !is_hidden_path(entry_path)) &&
            is_suitable!(&search_in_directory, if include_file_extension { entry_filename } else { remove_extension!(entry_filename) }, searching_mode) {
                let extension = get_extension!(entry_filename).unwrap_or_default();

                // [isFolder, name, path, extension]
                let _ = app_handle.emit_all("add", (
                    Value::Bool(entry_path.is_dir()),
                    Value::String(entry_filename.to_string()),
                    Value::String(entry_path.to_string_lossy().to_string()),
                    Value::String(extension.to_string())
                ));
            }

        }
}

#[tokio::main]
async fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![open_file_in_default_application, find_files_and_folders, read_directory, stop_finding, get_volumes])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
