use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::process::Command;

#[derive(Serialize, Clone)]
pub struct PortEntry {
    pid: i32,
    port: u16,
    protocol: String,
    address: String,
    process_name: String,
    executable_path: String,
    command_line: String,
    user: String,
    started_at: String,
    category: String,
    parent_pid: i32,
    parent_name: String,
    cwd: String,
    /// Path used for the row icon: the process's own .app bundle, or the
    /// nearest ancestor's (e.g. the terminal that launched a dev server).
    app_path: String,
}

struct ProcInfo {
    user: String,
    started_at: String,
    executable_path: String,
    command_line: String,
    parent_pid: i32,
}

fn collect_proc_info() -> HashMap<i32, ProcInfo> {
    let mut map = HashMap::new();
    let output = Command::new("ps")
        .env("LC_ALL", "C")
        .args(["-axo", "pid=,ppid=,user=,lstart=,args="])
        .output();
    let Ok(output) = output else { return map };
    for line in String::from_utf8_lossy(&output.stdout).lines() {
        // fields: pid ppid user + 5 lstart tokens (Dow Mon DD HH:MM:SS YYYY) + args
        // columns are space-padded, so scan 8 whitespace-separated tokens by byte offset
        let bytes = line.as_bytes();
        let mut idx = 0usize;
        let mut tokens: Vec<&str> = Vec::with_capacity(8);
        for _ in 0..8 {
            while idx < bytes.len() && bytes[idx].is_ascii_whitespace() {
                idx += 1;
            }
            let start = idx;
            while idx < bytes.len() && !bytes[idx].is_ascii_whitespace() {
                idx += 1;
            }
            if idx > start {
                tokens.push(&line[start..idx]);
            }
        }
        if tokens.len() < 8 {
            continue;
        }
        let Ok(pid) = tokens[0].parse::<i32>() else { continue };
        let ppid = tokens[1].parse::<i32>().unwrap_or(0);
        let user = tokens[2];
        let started_at = tokens[3..8].join(" ");
        let command_line = line[idx..].trim().to_string();
        let executable_path = command_line
            .split_whitespace()
            .next()
            .unwrap_or("")
            .to_string();
        map.insert(
            pid,
            ProcInfo {
                user: user.to_string(),
                started_at,
                executable_path,
                command_line,
                parent_pid: ppid,
            },
        );
    }
    map
}

fn collect_cwds(pids: &[i32]) -> HashMap<i32, String> {
    let mut map = HashMap::new();
    if pids.is_empty() {
        return map;
    }
    let list = pids
        .iter()
        .map(|p| p.to_string())
        .collect::<Vec<_>>()
        .join(",");
    let output = Command::new("lsof")
        .args(["-a", "-d", "cwd", "-p", &list, "-Fpn"])
        .output();
    let Ok(output) = output else { return map };
    let mut cur_pid = 0i32;
    for line in String::from_utf8_lossy(&output.stdout).lines() {
        if let Some(rest) = line.strip_prefix('p') {
            cur_pid = rest.parse().unwrap_or(0);
        } else if let Some(rest) = line.strip_prefix('n') {
            if cur_pid > 0 {
                map.insert(cur_pid, rest.to_string());
            }
        }
    }
    map
}

/// Own .app bundle path, or walk up the parent chain to the nearest ancestor
/// that lives inside one (the terminal/editor that spawned the process).
fn resolve_app_path(pid: i32, exe: &str, procs: &HashMap<i32, ProcInfo>) -> String {
    if exe.contains(".app/") {
        return exe.to_string();
    }
    let mut cur = pid;
    for _ in 0..25 {
        let Some(info) = procs.get(&cur) else { break };
        if info.executable_path.contains(".app/") {
            return info.executable_path.clone();
        }
        if info.parent_pid <= 1 || info.parent_pid == cur {
            break;
        }
        cur = info.parent_pid;
    }
    String::new()
}

/// The user's terminal app, preferring one that's actually running, for icon
/// fallback when a dev process was reparented to launchd (terminal closed).
fn find_terminal_app(procs: &HashMap<i32, ProcInfo>) -> String {
    const TERMS: [&str; 9] = [
        "iTerm.app",
        "Warp.app",
        "Ghostty.app",
        "WezTerm.app",
        "kitty.app",
        "Alacritty.app",
        "Hyper.app",
        "Tabby.app",
        "Terminal.app",
    ];
    for info in procs.values() {
        let p = &info.executable_path;
        if let Some(i) = p.find(".app/") {
            if TERMS.iter().any(|t| p[..i + 4].ends_with(t)) {
                return p.clone();
            }
        }
    }
    for cand in [
        "/Applications/iTerm.app",
        "/Applications/Warp.app",
        "/Applications/Ghostty.app",
        "/Applications/WezTerm.app",
        "/Applications/kitty.app",
        "/Applications/Alacritty.app",
        "/System/Applications/Utilities/Terminal.app",
    ] {
        if std::path::Path::new(cand).exists() {
            return format!("{cand}/Contents/MacOS/placeholder");
        }
    }
    String::new()
}

fn categorize(path: &str, user: &str, cmdline: &str) -> String {
    let p = path.to_lowercase();
    let c = cmdline.to_lowercase();
    if user == "root"
        || user.starts_with('_')
        || p.starts_with("/system/")
        || p.starts_with("/usr/libexec/")
        || p.starts_with("/usr/sbin/")
        || p.starts_with("/sbin/")
    {
        return "system".into();
    }
    if p.contains(".app/") || p.starts_with("/applications/") {
        return "app".into();
    }
    if p.contains("/node_modules/")
        || p.ends_with("/node")
        || p == "node"
        || p.ends_with("/bun")
        || p.ends_with("/deno")
        || p.ends_with("/python")
        || p.ends_with("/python3")
        || p.contains("python3.")
        || p.ends_with("/ruby")
        || p.ends_with("/java")
        || p.ends_with("/cargo")
        || p.contains("/.cargo/")
        || p.contains("/homebrew/")
        || p.contains("/.nvm/")
        || p.contains("/.bun/")
        || c.contains("vite")
        || c.contains("next dev")
        || c.contains("npm ")
        || c.contains("pnpm")
        || c.contains("yarn")
    {
        return "dev".into();
    }
    "other".into()
}

#[tauri::command]
async fn list_ports() -> Result<Vec<PortEntry>, String> {
    tauri::async_runtime::spawn_blocking(collect_ports)
        .await
        .map_err(|e| e.to_string())?
}

fn collect_ports() -> Result<Vec<PortEntry>, String> {
    let output = Command::new("lsof")
        .args(["-nP", "-i", "-sTCP:LISTEN", "-FpcPn"])
        .output()
        .map_err(|e| format!("failed to run lsof: {e}"))?;
    let text = String::from_utf8_lossy(&output.stdout);

    let procs = collect_proc_info();
    let mut entries: Vec<PortEntry> = Vec::new();
    let mut seen: std::collections::HashSet<(i32, u16, String, String)> =
        std::collections::HashSet::new();

    let mut cur_pid: i32 = 0;
    let mut cur_cmd = String::new();
    let mut cur_proto = String::new();
    let mut terminal_app: Option<String> = None;

    for line in text.lines() {
        if line.is_empty() {
            continue;
        }
        let (tag, val) = line.split_at(1);
        match tag {
            "p" => cur_pid = val.parse().unwrap_or(0),
            "c" => cur_cmd = val.to_string(),
            "P" => cur_proto = val.to_string(),
            "n" => {
                // skip connected sockets (e.g. UDP "a:1->b:2") — only bound/listening ones
                if val.contains("->") {
                    continue;
                }
                // val like "*:5000", "127.0.0.1:8080", "[::1]:443"
                let Some(idx) = val.rfind(':') else { continue };
                let Ok(port) = val[idx + 1..].parse::<u16>() else {
                    continue;
                };
                let address = val[..idx].to_string();
                let key = (cur_pid, port, cur_proto.clone(), address.clone());
                if !seen.insert(key) {
                    continue;
                }
                let terminal_app = terminal_app.get_or_insert_with(|| find_terminal_app(&procs));
                let info = procs.get(&cur_pid);
                let path = info.map(|i| i.executable_path.clone()).unwrap_or_default();
                let cmdline = info.map(|i| i.command_line.clone()).unwrap_or_default();
                let user = info.map(|i| i.user.clone()).unwrap_or_default();
                let parent_pid = info.map(|i| i.parent_pid).unwrap_or(0);
                let parent_name = procs
                    .get(&parent_pid)
                    .map(|i| {
                        i.executable_path
                            .rsplit('/')
                            .next()
                            .unwrap_or("")
                            .to_string()
                    })
                    .unwrap_or_default();
                let category = categorize(&path, &user, &cmdline);
                let mut app_path = resolve_app_path(cur_pid, &path, &procs);
                if app_path.is_empty() && category == "dev" {
                    app_path = terminal_app.clone();
                }
                entries.push(PortEntry {
                    pid: cur_pid,
                    port,
                    protocol: cur_proto.clone(),
                    address,
                    process_name: cur_cmd.clone(),
                    category,
                    app_path,
                    executable_path: path,
                    command_line: cmdline,
                    user,
                    started_at: info.map(|i| i.started_at.clone()).unwrap_or_default(),
                    parent_pid,
                    parent_name,
                    cwd: String::new(),
                });
            }
            _ => {}
        }
    }
    let mut pids: Vec<i32> = entries.iter().map(|e| e.pid).collect();
    pids.sort_unstable();
    pids.dedup();
    let cwds = collect_cwds(&pids);
    for e in &mut entries {
        if let Some(cwd) = cwds.get(&e.pid) {
            e.cwd = cwd.clone();
        }
    }

    entries.sort_by(|a, b| a.port.cmp(&b.port).then(a.pid.cmp(&b.pid)));
    Ok(entries)
}

#[tauri::command]
async fn kill_process(pid: i32, force: bool) -> Result<(), String> {
    if pid <= 1 {
        return Err("invalid pid".into());
    }
    let sig = if force { "-9" } else { "-15" };
    let status = tauri::async_runtime::spawn_blocking(move || {
        Command::new("kill").args([sig, &pid.to_string()]).status()
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())?;
    if status.success() {
        Ok(())
    } else {
        Err(format!(
            "kill failed (exit {:?}), process may require elevated privileges",
            status.code()
        ))
    }
}

/// Extract a small PNG data-URI icon from the .app bundle that owns `exe_path`.
/// Uses the OUTERMOST .app in the path so helper sub-apps inherit the main icon.
fn icon_for_exe(exe_path: &str) -> Option<String> {
    use base64::Engine;
    use std::path::Path;

    let app_root = &exe_path[..exe_path.find(".app/")? + 4];
    let resources = format!("{app_root}/Contents/Resources");

    let named = Command::new("plutil")
        .args([
            "-extract",
            "CFBundleIconFile",
            "raw",
            "-o",
            "-",
            &format!("{app_root}/Contents/Info.plist"),
        ])
        .output()
        .ok()
        .filter(|o| o.status.success())
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .map(|s| s.trim().trim_end_matches(".icns").to_string())
        .filter(|s| !s.is_empty())
        .map(|s| format!("{resources}/{s}.icns"))
        .filter(|p| Path::new(p).exists());

    let icns = named.or_else(|| {
        std::fs::read_dir(&resources).ok()?.flatten().find_map(|e| {
            let p = e.path();
            (p.extension()? == "icns").then(|| p.to_string_lossy().into_owned())
        })
    })?;

    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    std::hash::Hash::hash(&icns, &mut hasher);
    let tmp = std::env::temp_dir().join(format!(
        "portero-icon-{:x}.png",
        std::hash::Hasher::finish(&hasher)
    ));

    if !tmp.exists() {
        let ok = Command::new("sips")
            .args(["-s", "format", "png", "--resampleHeightWidthMax", "64"])
            .arg(&icns)
            .arg("--out")
            .arg(&tmp)
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false);
        if !ok {
            return None;
        }
    }

    let bytes = std::fs::read(&tmp).ok()?;
    Some(format!(
        "data:image/png;base64,{}",
        base64::engine::general_purpose::STANDARD.encode(bytes)
    ))
}

#[tauri::command]
async fn app_icon(exe_path: String) -> Option<String> {
    tauri::async_runtime::spawn_blocking(move || icon_for_exe(&exe_path))
        .await
        .ok()
        .flatten()
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Block {
    port: u16,
    protocol: String,
    inbound: bool,
    outbound: bool,
}

fn blocks_path() -> Option<std::path::PathBuf> {
    let home = std::env::var("HOME").ok()?;
    let dir = std::path::PathBuf::from(home).join("Library/Application Support/com.portero.app");
    std::fs::create_dir_all(&dir).ok()?;
    Some(dir.join("blocks.json"))
}

fn read_blocks() -> Vec<Block> {
    blocks_path()
        .and_then(|p| std::fs::read_to_string(p).ok())
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn write_blocks(blocks: &[Block]) -> Result<(), String> {
    let path = blocks_path().ok_or("no config dir")?;
    let json = serde_json::to_string_pretty(blocks).map_err(|e| e.to_string())?;
    std::fs::write(path, json).map_err(|e| e.to_string())
}

/// Regenerate the pf ruleset from all blocks and (re)load it into a sub-anchor
/// of com.apple/* — that wildcard is referenced by the stock /etc/pf.conf, so
/// our rules take effect without editing any system file. Needs admin once per
/// apply (prompted via osascript).
fn apply_blocks(blocks: &[Block]) -> Result<(), String> {
    let mut rules = String::new();
    for b in blocks {
        let proto = if b.protocol.eq_ignore_ascii_case("udp") {
            "udp"
        } else {
            "tcp"
        };
        if b.inbound {
            rules.push_str(&format!(
                "block drop in proto {proto} from any to any port {}\n",
                b.port
            ));
        }
        if b.outbound {
            rules.push_str(&format!(
                "block drop out proto {proto} from any to any port {}\n",
                b.port
            ));
        }
    }

    let rules_file = std::env::temp_dir().join("portero.pf.conf");
    std::fs::write(&rules_file, &rules).map_err(|e| e.to_string())?;
    let file = rules_file.to_string_lossy();

    // NB: `pfctl -e` fails when pf is already enabled, so tolerate only that
    // step — a failed rule load must still surface as an error.
    let shell = if rules.is_empty() {
        "pfctl -a com.apple/portero -F rules 2>/dev/null; true".to_string()
    } else {
        format!("pfctl -a com.apple/portero -f '{file}' && (pfctl -e 2>/dev/null || true)")
    };

    let apple_script = format!(
        "do shell script \"{}\" with administrator privileges",
        shell.replace('\\', "\\\\").replace('"', "\\\"")
    );
    let status = Command::new("osascript")
        .args(["-e", &apple_script])
        .output()
        .map_err(|e| e.to_string())?;
    if status.status.success() {
        Ok(())
    } else {
        let err = String::from_utf8_lossy(&status.stderr);
        if err.contains("User canceled") || err.contains("-128") {
            Err("cancelled".into())
        } else {
            Err(format!("failed to apply firewall rule: {}", err.trim()))
        }
    }
}

#[tauri::command]
fn list_blocks() -> Vec<Block> {
    read_blocks()
}

#[tauri::command]
async fn set_block(
    port: u16,
    protocol: String,
    inbound: bool,
    outbound: bool,
) -> Result<Vec<Block>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let mut blocks = read_blocks();
        blocks.retain(|b| !(b.port == port && b.protocol.eq_ignore_ascii_case(&protocol)));
        if inbound || outbound {
            blocks.push(Block {
                port,
                protocol,
                inbound,
                outbound,
            });
        }
        apply_blocks(&blocks)?;
        write_blocks(&blocks)?;
        Ok(blocks)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn unblock_port(port: u16, protocol: String) -> Result<Vec<Block>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let mut blocks = read_blocks();
        blocks.retain(|b| !(b.port == port && b.protocol.eq_ignore_ascii_case(&protocol)));
        apply_blocks(&blocks)?;
        write_blocks(&blocks)?;
        Ok(blocks)
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Re-load the saved blocks into pf. Rules don't survive a reboot (the anchor
/// is flushed), while blocks.json does — this lets the user resync them.
#[tauri::command]
async fn reapply_blocks() -> Result<Vec<Block>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let blocks = read_blocks();
        if !blocks.is_empty() {
            apply_blocks(&blocks)?;
        }
        Ok(blocks)
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Quick check whether something on `host:port` speaks HTTP, used to decide
/// if an "open in browser" action makes sense for a listening port.
#[tauri::command]
async fn http_probe(host: String, port: u16) -> bool {
    tauri::async_runtime::spawn_blocking(move || {
        use std::io::{Read, Write};
        use std::net::{IpAddr, Ipv4Addr, SocketAddr, TcpStream};
        use std::time::Duration;

        let ip: IpAddr = host.parse().unwrap_or(IpAddr::V4(Ipv4Addr::LOCALHOST));
        let addr = SocketAddr::new(ip, port);
        let Ok(mut stream) = TcpStream::connect_timeout(&addr, Duration::from_millis(400)) else {
            return false;
        };
        let _ = stream.set_write_timeout(Some(Duration::from_millis(400)));
        let _ = stream.set_read_timeout(Some(Duration::from_millis(800)));
        let req = format!("GET / HTTP/1.0\r\nHost: {host}:{port}\r\nConnection: close\r\n\r\n");
        if stream.write_all(req.as_bytes()).is_err() {
            return false;
        }
        let mut buf = [0u8; 8];
        let mut n = 0;
        while n < 5 {
            match stream.read(&mut buf[n..]) {
                Ok(0) | Err(_) => break,
                Ok(k) => n += k,
            }
        }
        n >= 5 && &buf[..5] == b"HTTP/"
    })
    .await
    .unwrap_or(false)
}

#[tauri::command]
fn start_drag(window: tauri::Window) {
    let _ = window.start_dragging();
}

#[tauri::command]
fn toggle_maximize(window: tauri::Window) {
    if window.is_maximized().unwrap_or(false) {
        let _ = window.unmaximize();
    } else {
        let _ = window.maximize();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            list_ports,
            kill_process,
            app_icon,
            list_blocks,
            set_block,
            unblock_port,
            reapply_blocks,
            http_probe,
            start_drag,
            toggle_maximize
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
