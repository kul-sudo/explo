// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::collections::HashMap;

use walkdir::WalkDir;

#[tauri::command]
fn open_file_in_default_application(file_name: String) -> () {
    let _ = open::that(file_name);
}

async fn find_file_in_directory<'a>(directory: &'a str, target_file: &'a str) -> Result<Vec<HashMap<&'a str, String>>, ()> {
    let mut results: Vec<HashMap<&str, String>> = Vec::new();

    for entry in WalkDir::new(directory)
        .follow_links(true)
        .into_iter()
        .filter_map(|e| e.ok()) {
            let f_name = entry.file_name().to_string_lossy().to_string();
            if directory != entry.path().to_string_lossy().to_string() && f_name.contains(target_file) {
                if entry.path().is_dir() {
                    results.push(HashMap::from([
                        ("children", String::default()),
                        ("name", entry.file_name().to_string_lossy().to_string()),
                        ("path", entry.path().to_string_lossy().to_string())
                    ]))
                } else {
                    results.push(HashMap::from([
                        ("name", entry.file_name().to_string_lossy().to_string()),
                        ("path", entry.path().to_string_lossy().to_string())
                    ]))
                }
            }
        }

    Ok(results.into())
}

#[tauri::command]
async fn find_file(command: &str) -> Result<Vec<HashMap<&str, String>>, ()> {
    let args: Vec<&str> = command.split(',').collect();
    
    let directory = args[0];
    let target_file = args[1];

    return find_file_in_directory(directory, target_file).await
}

#[tokio::main]
async fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![open_file_in_default_application, find_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
