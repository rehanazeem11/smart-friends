#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // In dev, resources aren't copied — server.js lives in the project root
            // (one level up from src-tauri). In a bundled app, it's in resource_dir.
            let resource_dir = app
                .path()
                .resource_dir()
                .expect("failed to resolve resource dir");

            // Candidate locations for server.js
            let bundled = resource_dir.join("server.js");
            let dev_path = std::env::current_dir()
                .unwrap_or_default()
                .parent()
                .map(|p| p.join("server.js"))
                .unwrap_or_default();

            // Pick whichever actually exists
            let server_path = if bundled.exists() {
                bundled.clone()
            } else {
                dev_path.clone()
            };

            let work_dir = server_path
                .parent()
                .map(|p| p.to_path_buf())
                .unwrap_or(resource_dir);

            println!("[tauri] launching server: {}", server_path.display());

            let sidecar = app
                .shell()
                .sidecar("node")
                .expect("failed to create node sidecar")
                .arg(server_path.to_string_lossy().to_string())
                .current_dir(work_dir);

            let (mut rx, _child) = sidecar
                .spawn()
                .expect("failed to spawn node server");

            tauri::async_runtime::spawn(async move {
                use std::io::Write;
                let log_path = std::env::temp_dir().join("smart-friends-server.log");
                let mut file = std::fs::OpenOptions::new()
                    .create(true)
                    .append(true)
                    .open(&log_path)
                    .ok();

                while let Some(event) = rx.recv().await {
                    let line = match event {
                        CommandEvent::Stdout(l) => format!("[node] {}", String::from_utf8_lossy(&l)),
                        CommandEvent::Stderr(l) => format!("[node-err] {}", String::from_utf8_lossy(&l)),
                        _ => continue,
                    };
                    println!("{}", line);
                    if let Some(f) = file.as_mut() {
                        let _ = writeln!(f, "{}", line);
                    }
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}