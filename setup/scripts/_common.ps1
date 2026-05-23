# Shared helpers for Yova Auto Windows setup/runtime scripts.
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

function Get-ProjectRoot {
  if ($script:ProjectRoot) { return $script:ProjectRoot }
  $setupDir = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
  if (Test-Path (Join-Path $setupDir "package.json")) {
    $script:ProjectRoot = $setupDir
    return $script:ProjectRoot
  }
  $script:ProjectRoot = Split-Path $PSScriptRoot -Parent
  return $script:ProjectRoot
}

function Get-SetupDir {
  Join-Path (Get-ProjectRoot) "setup"
}

function Get-RuntimeDir {
  Join-Path (Get-SetupDir) "runtime"
}

function Get-LogsDir {
  $d = Join-Path (Get-SetupDir) "logs"
  if (-not (Test-Path $d)) { New-Item -ItemType Directory -Path $d -Force | Out-Null }
  return $d
}

function Get-NodeHome {
  Join-Path (Get-RuntimeDir) "node"
}

function Get-NodeExe {
  Join-Path (Get-NodeHome) "node.exe"
}

function Get-NpmCmd {
  Join-Path (Get-NodeHome) "npm.cmd"
}

function Test-NodeReady {
  Test-Path (Get-NodeExe)
}

function Add-NodeToPath {
  $nodeHome = Get-NodeHome
  if (-not (Test-Path $nodeHome)) { return }
  $env:Path = "$nodeHome;" + ($env:Path -split ';' | Where-Object { $_ -and $_ -ne $nodeHome }) -join ';'
}

function Write-Log([string]$Message, [string]$Level = "INFO") {
  $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] [$Level] $Message"
  Write-Host $line
  $logFile = Join-Path (Get-LogsDir) "yova-auto.log"
  Add-Content -Path $logFile -Value $line -Encoding UTF8
}

function Download-File([string]$Url, [string]$Dest) {
  Write-Log "Downloading $Url"
  $dir = Split-Path $Dest -Parent
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  if (Test-Path $Dest) { Remove-Item $Dest -Force }
  Invoke-WebRequest -Uri $Url -OutFile $Dest -UseBasicParsing
}

function Invoke-ProjectNpm {
  param(
    [Parameter(Mandatory = $true)][string[]]$Arguments,
    [string]$WorkingDirectory = (Get-ProjectRoot)
  )
  Add-NodeToPath
  $npm = Get-NpmCmd
  if (-not (Test-Path $npm)) { throw "Node/npm not installed. Run setup first." }
  Write-Log "npm $($Arguments -join ' ') (in $WorkingDirectory)"
  & $npm @Arguments
  if ($LASTEXITCODE -ne 0) { throw "npm failed with exit code $LASTEXITCODE" }
}

function Test-PortListening([int]$Port) {
  try {
    $c = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    return [bool]$c
  } catch {
    return $false
  }
}

function Wait-ForHealth {
  param(
    [string]$Url = $SetupConfig.HealthUrl,
    [int]$TimeoutSeconds = 90
  )
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
      if ($r.StatusCode -eq 200) { return $true }
    } catch { }
    Start-Sleep -Seconds 2
  }
  return $false
}
