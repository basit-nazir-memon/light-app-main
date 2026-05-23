. "$PSScriptRoot\_common.ps1"
. (Join-Path (Split-Path $PSScriptRoot -Parent) "config.ps1")

& (Join-Path $PSScriptRoot "start-yova.ps1")

$url = $SetupConfig.AppUrl
Write-Log "Opening $url"
Start-Process $url
