# Shared helpers for Yova Auto Windows setup/runtime scripts.
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

function Get-ProjectRoot {
  if ($script:ProjectRoot) { return $script:ProjectRoot }

  # This file lives in setup\scripts — project root is two levels up.
  $root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
  if (Test-Path (Join-Path $root "package.json")) {
    $script:ProjectRoot = $root
    return $script:ProjectRoot
  }

  # Fallback: setup\Install-*.ps1 with $script:ProjectRoot already set by caller.
  $installed = Join-Path (Split-Path $PSScriptRoot -Parent) ".installed.json"
  if (Test-Path $installed) {
    try {
      $meta = Get-Content $installed -Raw | ConvertFrom-Json
      if ($meta.projectRoot -and (Test-Path (Join-Path $meta.projectRoot "package.json"))) {
        $script:ProjectRoot = $meta.projectRoot
        return $script:ProjectRoot
      }
    } catch { }
  }

  throw "Could not find Yova Auto project root (expected package.json next to setup folder)."
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

function Get-NpmCliJs {
  Join-Path (Get-NodeHome) "node_modules\npm\bin\npm-cli.js"
}

function Test-BackendNodeModules {
  Test-Path (Join-Path (Join-Path (Get-ProjectRoot) "backend") "node_modules\express\package.json")
}

function Test-FrontendNodeModules {
  Test-Path (Join-Path (Get-ProjectRoot) "node_modules\vite\package.json")
}

function Test-FrontendBuild {
  $root = Get-ProjectRoot
  $preview = Join-Path $root "dist\server\server.js"
  $index = Join-Path $root "dist\server\index.js"
  (Test-Path $preview) -or (Test-Path $index)
}

function Ensure-PreviewServerEntry {
  param([string]$ProjectRoot = (Get-ProjectRoot))
  $serverIndex = Join-Path $ProjectRoot "dist\server\index.js"
  $serverPreview = Join-Path $ProjectRoot "dist\server\server.js"
  if ((Test-Path $serverIndex) -and -not (Test-Path $serverPreview)) {
    Copy-Item $serverIndex $serverPreview -Force
    Write-Log "Created dist/server/server.js for preview"
  }
}

function Invoke-ProjectNpm {
  param(
    [Parameter(Mandatory = $true)][string[]]$Arguments,
    [string]$WorkingDirectory = (Get-ProjectRoot)
  )
  Add-NodeToPath
  $node = Get-NodeExe
  $npmCli = Get-NpmCliJs
  if (-not (Test-Path $node)) { throw "Node not installed. Run setup first." }
  if (-not (Test-Path $npmCli)) { throw "npm-cli.js not found in portable Node. Re-run setup (install-node.ps1)." }

  $logFile = Join-Path (Get-LogsDir) "npm-install.log"
  $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  Add-Content -Path $logFile -Value "`n=== [$stamp] npm $($Arguments -join ' ') in $WorkingDirectory ===" -Encoding UTF8

  Write-Log "npm $($Arguments -join ' ') (in $WorkingDirectory)"

  $argParts = @("`"$npmCli`"") + ($Arguments | ForEach-Object {
    if ($_ -match '[\s"]') { "`"$($_ -replace '"', '\"')`"" } else { $_ }
  })
  $cmdLine = "cd /d `"$WorkingDirectory`" && `"$node`" $($argParts -join ' ') >> `"$logFile`" 2>&1"
  $proc = Start-Process `
    -FilePath "cmd.exe" `
    -ArgumentList @("/c", $cmdLine) `
    -Wait `
    -PassThru `
    -NoNewWindow

  if ($proc.ExitCode -ne 0) {
    $tail = @()
    if (Test-Path $logFile) {
      $tail = Get-Content $logFile -Tail 15 -ErrorAction SilentlyContinue
    }
    $hint = $tail -join " | "
    if ($hint.Length -gt 400) { $hint = $hint.Substring(0, 400) + "..." }
    throw "npm failed (exit $($proc.ExitCode)). See setup\logs\npm-install.log. $hint"
  }
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
