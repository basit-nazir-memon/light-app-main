# Start backend, wait for API, then start frontend (used at Windows logon).
. "$PSScriptRoot\_common.ps1"
. (Join-Path (Split-Path $PSScriptRoot -Parent) "config.ps1")

Write-Log "=== Yova Auto service start ==="

& (Join-Path $PSScriptRoot "start-backend.ps1")
if (-not (Wait-ForHealth)) {
  Write-Log "API did not become healthy in time. Check setup\logs\backend.log" "ERROR"
  exit 1
}
Write-Log "API is healthy."

Start-Sleep -Seconds 2
& (Join-Path $PSScriptRoot "start-frontend.ps1")

$deadline = (Get-Date).AddSeconds(120)
while ((Get-Date) -lt $deadline) {
  if (Test-PortListening $SetupConfig.FrontendPort) {
    Write-Log "Frontend is listening on port $($SetupConfig.FrontendPort)."
    exit 0
  }
  Start-Sleep -Seconds 2
}

Write-Log "Frontend may still be starting - check setup\logs\frontend.log" "WARN"
