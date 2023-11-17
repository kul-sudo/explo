// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use globmatch::is_hidden_path;
use lazy_static::lazy_static;
use regex::Regex;
use serde::Serialize;
use std::{
    collections::HashSet, fs::read_dir, mem::forget, path::PathBuf, sync::Arc, time::Duration,
};
use sysinfo::{Disk, DiskExt, System, SystemExt};
use tauri::{AppHandle, Manager};
use tokio::{sync::Mutex, time::interval};
use trash::delete;
use walkdir::WalkDir;

lazy_static! {
    static ref STOP_FINDING: Arc<Mutex<bool>> = Arc::new(Mutex::new(false));
}

macro_rules! bytes_to_gb {
    ($bytes:expr) => {
        ($bytes / (1e+9 as u64)) as u16
    };
}

#[derive(Serialize, PartialEq, Eq, Hash, Clone)]
struct Volume {
    is_removable: bool,
    kind: String,
    mountpoint: PathBuf,
    available_gb: u16,
    used_gb: u16,
    total_gb: u16,
}

#[derive(Serialize, Clone)]
struct Emit<'a> {
    is_folder: bool,
    name: &'a str,
    path: &'a str,
    extension: &'a str,
}

fn from_volume(disk: &Disk) -> Volume {
    let total_space = disk.total_space();
    let used_bytes = total_space - disk.available_space();
    let used_gb = bytes_to_gb!(used_bytes);
    let total_gb = bytes_to_gb!(total_space);
    let available_gb = total_gb - used_gb;

    let mountpoint = disk.mount_point().to_path_buf();
    let kind = format!("{:?}", disk.kind());
    let is_removable = disk.is_removable();

    return Volume {
        is_removable,
        kind,
        mountpoint,
        available_gb,
        used_gb,
        total_gb,
    };
}

#[tauri::command(async)]
fn get_volumes() -> HashSet<Volume> {
    let mut sys = System::new_all();

    sys.refresh_all();

    let volumes = sys
        .disks()
        .iter()
        .map(|volume| from_volume(volume))
        .collect::<HashSet<Volume>>();

    return volumes;
}

// is_match, but for a mask
fn match_mask(s: &str, mask: &str) -> bool {
    let mut s_index: usize = 0;
    let mut mask_index: usize = 0;
    let mut s_star: usize = 0;
    let mut mask_star: Option<usize> = None;

    while s_index < s.len() {
        if mask_index < mask.len()
            && (
                // Handling the case when for the current symbol in `s` the mask has '?' or the same symbol
                mask.chars().nth(mask_index) == Some('?')
                    || s.chars().nth(s_index) == mask.chars().nth(mask_index)
            )
        {
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
            2 => Regex::new($search_in_directory)
                .unwrap()
                .is_match($filename_without_extension),
            _ => false,
        }
    };
}

macro_rules! only_mountpoints {
    ($volumes_:expr) => {
        $volumes_
            .iter()
            .map(|volume| volume.mountpoint.to_str().unwrap())
            .collect::<HashSet<_>>()
    };
}

#[tauri::command(async)]
async fn stop_finding() {
    *STOP_FINDING.lock().await = true
}

#[tauri::command(async)]
async fn open_file_in_default_application(file_name: String) {
    let _ = open::that(file_name);
}

#[tauri::command(async)]
async fn delete_entry(entry_paths: Vec<String>) {
    for entry_path in entry_paths {
        let _ = delete(entry_path);
    }
}

#[tauri::command(async)]
async fn read_directory(app_handle: AppHandle, directory: String) {
    // Reading the top layer of the dir
    for entry in read_dir(directory).unwrap().filter_map(|e| e.ok()) {
        let entry_path = entry.path();

        // [isFolder, name, path, extension]
        let _ = app_handle.emit_all(
            "add",
            Emit {
                is_folder: entry_path.is_dir(),
                name: entry.file_name().to_str().unwrap(),
                path: entry_path.to_str().unwrap(),
                extension: entry
                    .path()
                    .extension()
                    .unwrap_or_default()
                    .to_str()
                    .unwrap(),
            },
        );
    }
}

#[tauri::command(async, rename_all = "snake_case")]
async fn find_files_and_folders(
    app_handle: AppHandle,
    current_directory: String,
    search_in_directory: String,
    include_hidden_folders: bool,
    include_file_extension: bool,
    searching_mode: u8,
) {
    // Recursively reading the dir
    for entry in WalkDir::new(&current_directory)
        .into_iter()
        .filter_map(|entry| entry.ok())
    {
        // When searching is supposed to be stopped, the variable gets set to true, so we need
        // to set its value back to true and quit the function by returning
        if *STOP_FINDING.lock().await {
            forget(entry);
            *STOP_FINDING.lock().await = false;

            return;
        }

        let entry_path = entry.path();
        let entry_filename = entry.file_name().to_str().unwrap();

        if (include_hidden_folders || !is_hidden_path(entry_path))
            && current_directory != entry_path.to_string_lossy()
            && is_suitable!(
                &search_in_directory,
                if include_file_extension {
                    entry_filename
                } else {
                    entry_path.file_stem().unwrap().to_str().unwrap()
                },
                searching_mode
            )
        {
            let _ = app_handle.emit_all(
                "add",
                Emit {
                    is_folder: entry_path.is_dir(),
                    name: entry_filename,
                    path: entry_path.to_str().unwrap(),
                    extension: entry
                        .path()
                        .extension()
                        .unwrap_or_default()
                        .to_str()
                        .unwrap(),
                },
            );
        }
    }
}

#[tokio::main]
async fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .on_page_load(|webview, _payload| {
            tokio::spawn(async move {
                let app_handle = webview.app_handle();

                let mut interval = interval(Duration::from_secs(1));
                let mut volumes = get_volumes();

                loop {
                    interval.tick().await;

                    let current_volumes = get_volumes();

                    if only_mountpoints!(volumes).ne(&only_mountpoints!(current_volumes)) {
                        let difference = volumes
                            .difference(&current_volumes)
                            .cloned()
                            .collect::<HashSet<Volume>>();
                        volumes = current_volumes;

                        let _ = app_handle.emit_all("volumes", vec![&difference, &volumes]);
                    }
                }
            });
        })
        .invoke_handler(tauri::generate_handler![
            open_file_in_default_application,
            find_files_and_folders,
            read_directory,
            stop_finding,
            get_volumes,
            delete_entry
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
