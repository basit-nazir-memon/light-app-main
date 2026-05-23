# Yova Auto — Windows PC setup (fresh machine)

Use this when the PC has **no Node.js, npm, or SQLite** installed. One setup run prepares everything; after that you open the app like any desktop shortcut.

## Quick start

1. Copy the whole project folder to the PC (e.g. `C:\YovaAuto\light-app-main`).
2. Double-click **`setup\Setup-YovaAuto.bat`**.
3. Wait until setup finishes (first run downloads Node.js and npm packages — **internet required**).
4. Use the desktop shortcut **Yova Auto** (opens `http://127.0.0.1:8081` in your browser).

**Default login:** `admin@yovaauto.co.uk` / `admin`

## What setup does

| Step | Action |
|------|--------|
| Node.js | Downloads portable Node LTS into `setup\runtime\node` (does not require admin) |
| SQLite | Downloads optional SQLite CLI tools into `setup\runtime\sqlite` (for manual DB inspection) |
| Database | Created automatically by the app at `backend\data\yova-auto.db` (via **better-sqlite3** — no separate SQLite server) |
| Dependencies | `npm install` in project root and `backend` |
| Build | Production frontend build with API URL `http://127.0.0.1:3001` |
| Auto-start | Registers **Yova Auto API** and **Yova Auto Web** as hidden Windows Scheduled Tasks (start at sign-in, no CMD window) |
| Shortcut | Desktop **Yova Auto.url** opens the app in the default browser |

## Background services

Setup registers two **Scheduled Tasks** (not visible terminals):

| Task name | Starts |
|-----------|--------|
| **Yova Auto API** | Backend on port 3001 (~25s after sign-in) |
| **Yova Auto Web** | Frontend on port 8081 (~55s after sign-in, after API is healthy) |

View in Windows: **Task Scheduler** → Task Scheduler Library, or run **`YovaAuto-Status.bat`**.

Tasks run via `wscript.exe` with window style hidden. Logs: `setup\logs\backend.log`, `frontend.log`.

**Note:** Tasks run when a user **signs in** to Windows (typical for a garage PC). They do not run before login unless you configure a system-level task separately.

## After setup

| File | Purpose |
|------|---------|
| `YovaAuto-Open.bat` | Start services (if needed) and open the app |
| `YovaAuto-Start.bat` | Start backend + frontend in background |
| `YovaAuto-Stop.bat` | Stop processes on ports 3001 and 8081 |
| `YovaAuto-Status.bat` | Show scheduled task status and whether API/Web ports are listening |
| `setup\Uninstall-YovaAuto.bat` | Remove startup entry and desktop shortcuts only |

**Logs:** `setup\logs\` (`yova-auto.log`, `backend.log`, `frontend.log`)

## Ports

- **Backend API:** `http://127.0.0.1:3001`
- **Web app:** `http://127.0.0.1:8081`

Change ports in `setup\config.ps1` and re-run setup if needed.

## Troubleshooting

### `npm install` fails on `better-sqlite3`

Install [Microsoft Visual C++ Redistributable](https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist) (x64), then run `setup\Setup-YovaAuto.bat` again.

### `Cannot find module dist/server/server.js` after setup

Run from the project folder:

```text
npm run build
```

Or copy the file manually: `dist\server\index.js` → `dist\server\server.js`, then restart with `YovaAuto-Open.bat`.

### Browser shows “can’t connect”

1. Run `YovaAuto-Open.bat` from the project folder.
2. Check `setup\logs\backend.log` and `frontend.log`.
3. Ensure nothing else is blocking ports 3001 / 8081.

### Setup download fails

- Check firewall/proxy allows `nodejs.org` and `registry.npmjs.org`.
- Run setup as a user with write access to the project folder.

### Remove auto-start only

Run `setup\Uninstall-YovaAuto.bat` (keeps the application files).

## Re-run setup

Safe to run `setup\Setup-YovaAuto.bat` again after updates (reinstalls deps, rebuilds, refreshes shortcuts).
