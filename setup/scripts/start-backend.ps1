. "$PSScriptRoot\_common.ps1"
. (Join-Path (Split-Path $PSScriptRoot -Parent) "config.ps1")

$root = Get-ProjectRoot
$backend = Join-Path $root "backend"
$log = Join-Path (Get-LogsDir) "backend.log"

if (-not (Test-NodeReady)) {
  Write-Log "Portable Node missing. Run SETUP-WINDOWS.bat or setup\Setup-YovaAuto.bat first." "ERROR"
  exit 1
}

if (-not (Test-BackendNodeModules)) {
  Write-Log "Backend packages missing — installing before start..."
  & (Join-Path $PSScriptRoot "ensure-dependencies.ps1") -BackendOnly
}

if (Test-PortListening $SetupConfig.BackendPort) {
  Write-Log "Backend already listening on port $($SetupConfig.BackendPort)"
  exit 0
}

Add-NodeToPath
$env:PORT = [string]$SetupConfig.BackendPort
Set-Location $backend

Write-Log "Starting API server on port $($SetupConfig.BackendPort)..."
$node = Get-NodeExe
Start-Process -FilePath $node `
  -ArgumentList "src/index.js" `
  -WorkingDirectory $backend `
  -WindowStyle Hidden `
  -RedirectStandardOutput $log `
  -RedirectStandardError (Join-Path (Get-LogsDir) "backend.err.log")
