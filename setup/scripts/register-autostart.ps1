# Register backend + frontend as hidden scheduled tasks (start at user logon).
. "$PSScriptRoot\_common.ps1"
. (Join-Path (Split-Path $PSScriptRoot -Parent) "config.ps1")

$SetupDir = Join-Path (Get-ProjectRoot) "setup"
$vbsLauncher = Join-Path $PSScriptRoot "launch-hidden.vbs"
$backendScript = Join-Path $PSScriptRoot "start-backend.ps1"
$frontendScript = Join-Path $PSScriptRoot "start-frontend-when-ready.ps1"

function Remove-YovaTask([string]$Name) {
  $existing = Get-ScheduledTask -TaskName $Name -ErrorAction SilentlyContinue
  if ($existing) {
    Unregister-ScheduledTask -TaskName $Name -Confirm:$false
    Write-Log "Removed scheduled task: $Name"
  }
}

function Register-YovaTask {
  param(
    [string]$Name,
    [string]$Ps1Path,
    [int]$DelaySeconds
  )

  Remove-YovaTask -Name $Name

  $argument = "//B `"$vbsLauncher`" `"$Ps1Path`""
  $action = New-ScheduledTaskAction -Execute "wscript.exe" -Argument $argument -WorkingDirectory (Get-ProjectRoot)

  $trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
  if ($DelaySeconds -gt 0) {
    $trigger.Delay = "PT${DelaySeconds}S"
  }

  $settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -ExecutionTimeLimit ([TimeSpan]::Zero) `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 2) `
    -MultipleInstances IgnoreNew

  $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

  Register-ScheduledTask -TaskName $Name -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
  Write-Log "Registered scheduled task: $Name (delay ${DelaySeconds}s, hidden)"
}

# Remove legacy Startup folder launcher
$startupLink = Join-Path ([Environment]::GetFolderPath("Startup")) "Yova Auto - Start Services.bat"
if (Test-Path $startupLink) {
  Remove-Item $startupLink -Force
  Write-Log "Removed legacy Startup shortcut"
}

Register-YovaTask -Name $SetupConfig.BackendTaskName -Ps1Path $backendScript -DelaySeconds $SetupConfig.BackendStartDelaySeconds
Register-YovaTask -Name $SetupConfig.FrontendTaskName -Ps1Path $frontendScript -DelaySeconds $SetupConfig.FrontendStartDelaySeconds

Write-Log "Background services registered. They start automatically when you sign in to Windows."
