# Optional SQLite command-line tools (database file is managed by the app via better-sqlite3).
. "$PSScriptRoot\_common.ps1"
. (Join-Path (Split-Path $PSScriptRoot -Parent) "config.ps1")

$runtime = Get-RuntimeDir
$sqliteDir = Join-Path $runtime "sqlite"
$zipPath = Join-Path $runtime $SetupConfig.SqliteToolsZip

if (Test-Path (Join-Path $sqliteDir "sqlite3.exe")) {
  Write-Log "SQLite tools already installed at $sqliteDir"
  exit 0
}

if (-not (Test-Path $runtime)) {
  New-Item -ItemType Directory -Path $runtime -Force | Out-Null
}

if (-not (Test-Path $zipPath)) {
  Download-File -Url $SetupConfig.SqliteDownloadUrl -Dest $zipPath
}

Write-Log "Extracting SQLite tools..."
if (Test-Path $sqliteDir) { Remove-Item $sqliteDir -Recurse -Force }
$extractTemp = Join-Path $runtime "_sqlite_extract"
if (Test-Path $extractTemp) { Remove-Item $extractTemp -Recurse -Force }
Expand-Archive -Path $zipPath -DestinationPath $extractTemp -Force
New-Item -ItemType Directory -Path $sqliteDir -Force | Out-Null
Get-ChildItem $extractTemp -Recurse -Filter "sqlite3.exe" | ForEach-Object {
  Copy-Item $_.FullName (Join-Path $sqliteDir "sqlite3.exe") -Force
}
Get-ChildItem $extractTemp -Recurse -Filter "sqldiff.exe" -ErrorAction SilentlyContinue | ForEach-Object {
  Copy-Item $_.FullName (Join-Path $sqliteDir "sqldiff.exe") -Force
}
Remove-Item $extractTemp -Recurse -Force -ErrorAction SilentlyContinue
Write-Log "SQLite CLI tools installed at $sqliteDir (optional; app uses embedded SQLite)."
