// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[tauri::command]
fn open_file_in_default_application(file_name: String) -> () {
    let _ = open::that(file_name);
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![open_file_in_default_application])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
