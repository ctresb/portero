<p align="center">
  <img src="icon.png" alt="Portero icon" width="128" height="128" />
</p>

<h1 align="center">Portero</h1>

<p align="center">
  See, understand, and control everything listening on your Mac's ports.
</p>

## Why

When you're working on multiple projects at the same time, it's easy to lose track of what's running. A database here, a dev server there, an API you forgot was still open... before long, your ports become a mess.

Portero gives you a clear view of everything running on your machine, so you always know what's using each port, can stop what you don't need, and get back to building instead of debugging port conflicts.

## What it does

- **Live port list.** Every listening TCP and UDP port, refreshed automatically, with process name, PID, address, protocol, user, and start time.
- **Plain-language explanations.** Portero recognizes hundreds of common processes, dev tools, and well-known ports, and tells you what each one actually is: "Vite dev server", "PostgreSQL database", "AirDrop and sharing", instead of a cryptic binary name.
- **Categories.** Processes are grouped into System, Apps, Terminal (dev servers you started), and Other, so you can tell at a glance what is safe to touch.
- **Kill processes.** End a process gracefully (SIGTERM) or force it (SIGKILL) when it refuses to die. Select several rows and kill them all at once.
- **Conflict detection.** When more than one process listens on the same port (the classic "address already in use"), Portero flags it and lets you filter straight to the conflicts.
- **Block ports.** Block inbound and/or outbound traffic on any port using the built-in macOS firewall (pf). Rules live in a dedicated anchor, no system files are edited.
- **Open in browser.** When a port answers HTTP (a frontend or dev server), a globe button appears to open it directly in your browser.
- **Favorites.** Star a process to protect it. Favorited processes cannot be killed until you unstar them.
- **Search, filter, and sort** by port, process, path, command line, or PID.
- **Two languages.** English and Portuguese, switchable in Settings.

## Install

Grab the latest `.dmg` for your Mac (Apple Silicon or Intel) from the [Releases](../../releases) page, open it, and drag Portero to Applications.

Builds are not signed with an Apple Developer certificate yet. The first time you open the app, right-click it in Applications and choose **Open**.

## How to use

1. Open Portero. The table shows every listening port on your machine.
2. Click a row to expand it and see the full command line, working directory, parent process, and a plain-language description of what it is.
3. Use the filter tabs (All, System, Apps, Terminal, Other, Favorites, Conflicts) or the search box to find what you're looking for.
4. Click **Kill** on a row to stop a process. You'll get a confirmation dialog with the choice between a graceful stop and a forced kill.
5. Click the lock icon to block a port's traffic through the macOS firewall. macOS will ask for your administrator password.
6. Click the globe icon (shown only when the port serves HTTP) to open that server in your browser.
7. Star anything you never want to kill by accident.
8. Open **Settings** (gear icon) to change the language, toggle interface sounds, adjust the refresh interval, or reapply firewall rules.

> **Note:** pf firewall rules do not survive a reboot, but Portero remembers your blocks. After restarting your Mac, open Settings and click **Reapply rules**.

## How it works

Portero is a native macOS app built with [Tauri 2](https://tauri.app). The Rust backend shells out to standard system tools:

- `lsof` and `ps` to discover listening ports and enrich them with process details
- `pfctl` to manage firewall rules inside a dedicated `com.apple/portero` anchor, which the stock `/etc/pf.conf` already references, so no system file is ever modified
- `osascript` to request administrator privileges only when applying firewall changes

The frontend is React 19 + TypeScript + Tailwind CSS 4.

## Build from source

Requirements: macOS, [Rust](https://rustup.rs), [Node.js](https://nodejs.org) 22+, and [pnpm](https://pnpm.io).

```sh
pnpm install

# run in development mode
pnpm tauri dev

# build a release bundle (.app / .dmg)
pnpm tauri build
```

Tagged pushes (`v*`) also build automatically on GitHub Actions for both Apple Silicon and Intel, and attach the bundles to a draft release.

## License

No license yet.
