// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use walkdir::WalkDir;

#[tauri::command]
fn open_file_in_default_application(file_name: String) -> () {
    let _ = open::that(file_name);
}

async fn find_file_in_directory(directory: &str, target_file: &str) {
    let mut items = Vec::new();

    for entry in WalkDir::new(directory)
        .follow_links(true)
        .into_iter()
        .filter_map(|e| e.ok()) {
            let f_name = entry.file_name().to_string_lossy().to_string();
            if f_name.contains(target_file) {
                println!("Found: {}", entry.path().display());
                items.push(f_name)
            }
        }

    println!("File '{}' not found in directory '{}'", target_file, directory);
}

#[tauri::command]
async fn find_file(command: String) {
    let args: Vec<&str> = command.split(',').collect();
    
    if args.len() != 2 {
        println!("Usage: find_file <directory_path>,<target_file>");
        return;
    }
    let directory = args[0];
    let target_file = args[1];
    find_file_in_directory(directory, target_file).await;
}

#[tokio::main]
async fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![open_file_in_default_application, find_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
