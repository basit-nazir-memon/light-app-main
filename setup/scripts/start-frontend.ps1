. "$PSScriptRoot\_common.ps1"
. (Join-Path (Split-Path $PSScriptRoot -Parent) "config.ps1")

$root = Get-ProjectRoot
$log = Join-Path (Get-LogsDir) "frontend.log"

if (-not (Test-NodeReady)) {
  Write-Log "Portable Node missing. Run SETUP-WINDOWS.bat or setup\Setup-YovaAuto.bat first." "ERROR"
  exit 1
}

if (-not (Test-FrontendNodeModules) -or -not (Test-FrontendBuild)) {
  Write-Log "Frontend packages or build missing — preparing before start..."
  & (Join-Path $PSScriptRoot "ensure-dependencies.ps1")
}

if (Test-PortListening $SetupConfig.FrontendPort) {
  Write-Log "Frontend already listening on port $($SetupConfig.FrontendPort)"
  exit 0
}

Ensure-PreviewServerEntry -ProjectRoot $root
if (-not (Test-FrontendBuild)) {
  Write-Log "Frontend build missing (dist/server). Run SETUP-WINDOWS.bat" "ERROR"
  exit 1
}

Add-NodeToPath
Set-Location $root

$hostArg = $SetupConfig.FrontendHost
$portArg = [string]$SetupConfig.FrontendPort
Write-Log "Starting frontend preview on ${hostArg}:$portArg ..."

# Run Vite via node.exe (avoids visible cmd.exe from npm.cmd).
$node = Get-NodeExe
$viteJs = Join-Path $root "node_modules\vite\bin\vite.js"
if (-not (Test-Path $viteJs)) {
  Write-Log "vite.js not found - run npm install in project root" "ERROR"
  exit 1
}

Start-Process -FilePath $node `
  -ArgumentList @(
    $viteJs,
    "preview",
    "--port", [string]$SetupConfig.FrontendPort,
    "--host", $SetupConfig.FrontendHost,
    "--strictPort"
  ) `
  -WorkingDirectory $root `
  -WindowStyle Hidden `
  -RedirectStandardOutput $log `
  -RedirectStandardError (Join-Path (Get-LogsDir) "frontend.err.log")
