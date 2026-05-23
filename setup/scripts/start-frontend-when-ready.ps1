# Wait for API health, then start frontend (scheduled task entry).
. "$PSScriptRoot\_common.ps1"
. (Join-Path (Split-Path $PSScriptRoot -Parent) "config.ps1")

Write-Log "Frontend service: waiting for API..."
if (-not (Wait-ForHealth -TimeoutSeconds 180)) {
  Write-Log "API not ready; starting frontend anyway." "WARN"
}

& (Join-Path $PSScriptRoot "start-frontend.ps1")
