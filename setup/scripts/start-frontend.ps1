. "$PSScriptRoot\_common.ps1"
. (Join-Path (Split-Path $PSScriptRoot -Parent) "config.ps1")

$root = Get-ProjectRoot
$log = Join-Path (Get-LogsDir) "frontend.log"

if (Test-PortListening $SetupConfig.FrontendPort) {
  Write-Log "Frontend already listening on port $($SetupConfig.FrontendPort)"
  exit 0
}

$dist = Join-Path $root "dist"
if (-not (Test-Path $dist)) {
  Write-Log "Frontend build missing (dist/). Run setup or: npm run build" "ERROR"
  exit 1
}

$serverIndex = Join-Path $root "dist\server\index.js"
$serverPreview = Join-Path $root "dist\server\server.js"
if ((Test-Path $serverIndex) -and -not (Test-Path $serverPreview)) {
  Copy-Item $serverIndex $serverPreview -Force
  Write-Log "Created dist/server/server.js for preview"
}
if (-not (Test-Path $serverPreview)) {
  Write-Log "dist/server/server.js missing. Run: npm run build" "ERROR"
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
