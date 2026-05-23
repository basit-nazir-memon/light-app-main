# Remove Yova Auto scheduled tasks, startup entry, and desktop shortcuts.
$ErrorActionPreference = "Stop"
$SetupDir = $PSScriptRoot

. (Join-Path $SetupDir "config.ps1")
$unregister = Join-Path $SetupDir "scripts\unregister-autostart.ps1"
if (Test-Path $unregister) {
  . (Join-Path $SetupDir "scripts\_common.ps1")
  & $unregister
}

$desktop = [Environment]::GetFolderPath("Desktop")
@("Yova Auto.url", "Open Yova Auto.bat") | ForEach-Object {
  $p = Join-Path $desktop $_
  if (Test-Path $p) { Remove-Item $p -Force }
}

Write-Host "Removed background services and desktop shortcuts." -ForegroundColor Green
Write-Host "To stop running servers now, run YovaAuto-Stop.bat in the project folder."
