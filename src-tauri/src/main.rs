// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{fs::read_dir, path::{Path, PathBuf}, collections::HashMap, sync::{Arc, atomic::{AtomicBool, Ordering}}};
use regex::Regex;
use tauri::{AppHandle, Manager};
use walkdir::WalkDir;
use sysinfo::{System, SystemExt, Disk, DiskExt};
use serde::Serialize;
use serde_json::Value;
use lazy_static::lazy_static;
use globmatch::is_hidden_path;

lazy_static! {
   static ref STOP_FINDING: Arc<AtomicBool> = Arc::new(AtomicBool::new(false));
}

macro_rules! bytes_to_gb {
    ($bytes:expr) => {
        ($bytes / (1e+9 as u64)) as u16
    };
}

#[derive(Serialize)]
pub struct Volume {
    is_removable: bool,
    kind: String,
    mountpoint: PathBuf,
    available_gb: u16,
    used_gb: u16,
    total_gb: u16,
}

impl Volume {
    fn from(disk: &Disk) -> Self {
        let used_bytes = disk.total_space() - disk.available_space();
        let available_gb = bytes_to_gb!(disk.available_space());
        let used_gb = bytes_to_gb!(used_bytes);
        let total_gb = bytes_to_gb!(disk.total_space());

        let mountpoint = disk.mount_point().to_path_buf();
        let kind = format!("{:?}", disk.kind());
        let is_removable = disk.is_removable();

        Self {
            is_removable,
            kind,
            mountpoint,
            available_gb,
            used_gb,
            total_gb
        }
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
            let volume = Volume::from(disk);

            return volume
        })
        .collect();

    return volumes
}

#[tauri::command(async)]
async fn stop_finding() {
    STOP_FINDING.store(true, Ordering::Relaxed)
}

macro_rules! remove_extension {
    ($full_filename:expr) => {
        Path::new($full_filename).file_stem().unwrap().to_string_lossy()
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

    for entry in read_dir(directory).unwrap().filter_map(|e| e.ok()) {
        let file_name = entry.file_name().to_string_lossy().to_string();
        let extension = get_extension!(&file_name).unwrap_or_default();

        let emit_data: HashMap<&str, Value> = HashMap::from([
            ("isFolder", Value::Bool(entry.path().is_dir())),
            ("name", Value::String(entry.file_name().to_string_lossy().to_string())),
            ("path", Value::String(entry.path().to_string_lossy().to_string())),
            ("extension", Value::String(extension.to_string()))
        ]);

        let _ = app_handle.emit_all("add", emit_data);
    }
}

fn is_suitable_regex_or_mask(search_in_directory: &str, filename_without_extension: &str, searching_mode: &str, regex: &Regex) -> bool {
    match searching_mode {
        "1" => match_mask(filename_without_extension, search_in_directory),
        "2" => regex.is_match(filename_without_extension),
        _ => false
    }
}

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

#[tauri::command(async, rename_all = "snake_case")]
async fn find_files_and_folders(app_handle: AppHandle, current_directory: String, search_in_directory: String, include_hidden_folders: bool, searching_mode: String) {
    // Precompile the regex pattern if needed
    let regex_wrapped: Option<Regex> = if searching_mode == "1" || searching_mode == "2" {
        match Regex::new(&search_in_directory) {
            Ok(regex) => Some(regex),
            Err(_) => {
                println!("Error in regex");
                return;
            }
        }
    } else {
        None
    };

    for entry in WalkDir::new(&current_directory)
        .follow_links(true)
        .into_iter()
        .filter_map(|entry: Result<walkdir::DirEntry, walkdir::Error>| entry.ok())
    {
        let file_name = entry.file_name().to_string_lossy().to_string();
        let extension_match = get_extension!(&file_name).unwrap_or_default();
        let file_name_without_extension = remove_extension!(&entry.file_name()).to_lowercase();

        // Apply the conditions within the filter
        let matches = if STOP_FINDING.load(Ordering::Relaxed) {
            STOP_FINDING.store(false, Ordering::Relaxed);
            false
        } else if let Some(regex) = &regex_wrapped {
            is_suitable_regex_or_mask(&search_in_directory, &file_name_without_extension, &searching_mode, regex)
        } else {
            file_name_without_extension.contains(&search_in_directory)
        };

        let is_hidden = !include_hidden_folders && is_hidden_path(entry.path());

        // Combined condition for the filter
        if matches && !is_hidden {
            // Emit data here
            let emit_data: HashMap<&str, Value> = HashMap::from([
                ("isFolder", Value::Bool(entry.path().is_dir())),
                ("name", Value::String(entry.file_name().to_string_lossy().to_string())),
                ("path", Value::String(entry.path().to_string_lossy().to_string())),
                ("extension", Value::String(extension_match.to_string())),
            ]);

            let _ = app_handle.emit_all("add", emit_data);
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
