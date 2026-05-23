. "$PSScriptRoot\_common.ps1"
. (Join-Path (Split-Path $PSScriptRoot -Parent) "config.ps1")

foreach ($name in @($SetupConfig.BackendTaskName, $SetupConfig.FrontendTaskName)) {
  $t = Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue
  if ($t) {
    Unregister-ScheduledTask -TaskName $name -Confirm:$false
    Write-Log "Removed scheduled task: $name"
  }
}

$startupLink = Join-Path ([Environment]::GetFolderPath("Startup")) "Yova Auto - Start Services.bat"
if (Test-Path $startupLink) { Remove-Item $startupLink -Force }
