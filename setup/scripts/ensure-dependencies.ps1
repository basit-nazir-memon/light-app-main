# Ensure npm packages and production build exist (safe to run repeatedly).
param(
  [switch]$BackendOnly,
  [switch]$FrontendOnly
)

. "$PSScriptRoot\_common.ps1"
. (Join-Path (Split-Path $PSScriptRoot -Parent) "config.ps1")

$root = Get-ProjectRoot
$backend = Join-Path $root "backend"
$apiUrl = "http://127.0.0.1:$($SetupConfig.BackendPort)"

Add-NodeToPath

if (-not $FrontendOnly) {
  if (-not (Test-BackendNodeModules)) {
    Write-Log "Backend packages missing — running npm install in backend..."
    Invoke-ProjectNpm -Arguments @("install") -WorkingDirectory $backend
    if (-not (Test-BackendNodeModules)) {
      throw "Backend npm install did not produce node_modules\express. Check setup\logs\npm-install.log and install Visual C++ Redistributable (x64) for better-sqlite3."
    }
    Write-Log "Backend packages installed."
  }
}

if (-not $BackendOnly) {
  if (-not (Test-FrontendNodeModules)) {
    Write-Log "Frontend packages missing — running npm install in project root..."
    Invoke-ProjectNpm -Arguments @("install") -WorkingDirectory $root
    if (-not (Test-FrontendNodeModules)) {
      throw "Frontend npm install did not produce node_modules\vite. Check setup\logs\npm-install.log"
    }
    Write-Log "Frontend packages installed."
  }

  if (-not (Test-FrontendBuild)) {
    Write-Log "Production build missing — running npm run build..."
    $env:VITE_API_URL = $apiUrl
    Invoke-ProjectNpm -Arguments @("run", "build") -WorkingDirectory $root
    Ensure-PreviewServerEntry -ProjectRoot $root
    if (-not (Test-FrontendBuild)) {
      throw "Build failed — dist\server\server.js not found. Check setup\logs\npm-install.log"
    }
    Write-Log "Frontend build complete."
  }
}
