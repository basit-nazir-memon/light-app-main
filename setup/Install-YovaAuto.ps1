# Yova Auto - Windows setup (terminal).
#Requires -Version 5.1
$ErrorActionPreference = "Stop"

$SetupDir = $PSScriptRoot
$ProjectRoot = Split-Path $SetupDir -Parent
$script:ProjectRoot = $ProjectRoot

. (Join-Path $SetupDir "config.ps1")

$engine = Join-Path $SetupDir "lib\Install-Engine.ps1"
if (-not (Test-Path $engine)) {
  Write-Host "ERROR: Missing $engine" -ForegroundColor Red
  exit 1
}

. $engine

$script:LastStep = ""

function Write-InstallProgress {
  param($p)

  if ($p.StepId -and $p.StepState -eq "running" -and $script:LastStep -ne $p.StepId) {
    $script:LastStep = $p.StepId
    Write-Host ""
    Write-Host ("[{0,3}%] {1}" -f [Math]::Max(0, $p.Percent), $p.Message) -ForegroundColor Cyan
  } elseif ($p.Indeterminate -and $p.Message) {
    Write-Host ("       ... {0}" -f $p.Message) -ForegroundColor DarkGray
  } elseif ($p.StepState -eq "done" -and $p.StepId) {
    Write-Host "       [OK]" -ForegroundColor Green
  } elseif ($p.StepState -eq "skipped" -and $p.StepId) {
    Write-Host "       [skipped]" -ForegroundColor DarkYellow
  } elseif ($p.Message -and -not $p.StepId) {
    Write-Host ("       {0}" -f $p.Message) -ForegroundColor DarkGray
  }

  if ($p.Failed) {
    Write-Host ""
    Write-Host "ERROR: $($p.ErrorDetail)" -ForegroundColor Red
  }
}

Clear-Host
Write-Host ""
Write-Host "  =========================================" -ForegroundColor Blue
Write-Host "    $($SetupConfig.AppName) - Windows Setup" -ForegroundColor White
Write-Host "  =========================================" -ForegroundColor Blue
Write-Host ""
Write-Host "  Project:  $ProjectRoot"
Write-Host "  App URL:  $($SetupConfig.AppUrl)"
Write-Host "  Login:    $($SetupConfig.DefaultLogin)"
Write-Host ""
Write-Host "  Internet required on first run (Node.js + npm packages)."
Write-Host ""

$result = Invoke-YovaAutoInstall -ProjectRoot $ProjectRoot -OnProgress { param($p) Write-InstallProgress $p }

Write-Host ""
if ($result.Ok) {
  Write-Host "  =========================================" -ForegroundColor Green
  Write-Host "    Setup complete" -ForegroundColor Green
  Write-Host "  =========================================" -ForegroundColor Green
  Write-Host ""
  Write-Host "  Open:      $($result.AppUrl)"
  Write-Host "  Shortcut:  Desktop > Yova Auto.url"
  Write-Host "  Logs:      setup\logs\"
  Write-Host "  Stop app:  YovaAuto-Stop.bat"
  Write-Host ""
  Start-Process $result.AppUrl
  exit 0
}

Write-Host "  Setup failed. See setup\logs\yova-auto.log" -ForegroundColor Red
Write-Host ""
exit 1
