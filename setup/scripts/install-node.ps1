. "$PSScriptRoot\_common.ps1"
. (Join-Path (Split-Path $PSScriptRoot -Parent) "config.ps1")

$runtime = Get-RuntimeDir
$nodeHome = Get-NodeHome
$zipPath = Join-Path $runtime $SetupConfig.NodeZipName

if (Test-NodeReady) {
  Write-Log "Portable Node.js already installed at $nodeHome"
  exit 0
}

if (-not (Test-Path $runtime)) {
  New-Item -ItemType Directory -Path $runtime -Force | Out-Null
}

if (-not (Test-Path $zipPath)) {
  Download-File -Url $SetupConfig.NodeDownloadUrl -Dest $zipPath
}

Write-Log "Extracting Node.js..."
if (Test-Path $nodeHome) { Remove-Item $nodeHome -Recurse -Force }
$extractTemp = Join-Path $runtime "_node_extract"
if (Test-Path $extractTemp) { Remove-Item $extractTemp -Recurse -Force }
Expand-Archive -Path $zipPath -DestinationPath $extractTemp -Force
$inner = Get-ChildItem $extractTemp -Directory | Select-Object -First 1
Move-Item $inner.FullName $nodeHome
Remove-Item $extractTemp -Recurse -Force -ErrorAction SilentlyContinue

if (-not (Test-NodeReady)) {
  throw "Node installation failed - node.exe not found."
}

$ver = & (Get-NodeExe) -v
Write-Log "Node.js ready: $ver"
