import { api, getToken, getApiBase } from "./api";

function apiPath(path: string): string {
  return `/api${path.startsWith("/") ? path : `/${path}`}`;
}

export type BackupSettings = {
  backupDirectory: string;
  lastBackupAt: string | null;
  databasePath: string;
  dataDirectory: string;
  defaultBackupDirectory: string;
};

export type BackupFileInfo = {
  filename: string;
  size: number;
  createdAt: string;
};

export type BackupRunResult = {
  filename: string;
  path: string;
  size: number;
  createdAt: string;
};

export type RestoreResult = {
  safetyBackup: string;
  restoredAt: string;
  message: string;
  lastBackupAt: string | null;
};

async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const url = `${getApiBase()}${apiPath(path)}`;
  const res = await fetch(url, { ...init, headers });
  return res;
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (body?.error) return body.error;
  } catch {
    /* ignore */
  }
  if (res.status === 404) {
    return "Backup API not found — restart the backend (cd backend && npm start) and refresh this page.";
  }
  return res.statusText || "Request failed";
}

export async function fetchBackupSettings(): Promise<BackupSettings> {
  return api.get<BackupSettings>("/backup/settings");
}

export async function saveBackupDirectory(backupDirectory: string): Promise<BackupSettings> {
  return api.patch<BackupSettings>("/backup/settings", { backupDirectory });
}

export async function fetchBackupList(): Promise<BackupFileInfo[]> {
  const data = await api.get<{ backups: BackupFileInfo[] }>("/backup/list");
  return data.backups ?? [];
}

export async function runBackupNow(): Promise<BackupRunResult> {
  return api.post<BackupRunResult>("/backup/run", {});
}

export async function downloadDatabaseExport(): Promise<void> {
  const res = await authFetch("/backup/export");
  if (!res.ok) throw new Error(await parseError(res));
  const blob = await res.blob();
  const dispo = res.headers.get("Content-Disposition");
  const match = dispo?.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] ?? `yova-auto-export-${new Date().toISOString().slice(0, 10)}.db`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function restoreDatabaseFile(file: File): Promise<RestoreResult> {
  const buffer = await file.arrayBuffer();
  const res = await authFetch("/backup/restore", {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "X-Filename": file.name,
    },
    body: buffer,
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function restoreFromBackupFile(filename: string): Promise<RestoreResult> {
  return api.post<RestoreResult>(`/backup/restore/${encodeURIComponent(filename)}`, {});
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}
