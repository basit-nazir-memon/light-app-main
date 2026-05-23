# Yova Auto Windows setup - edit versions/ports here if needed.
$script:SetupConfig = @{
  AppName           = "Yova Auto"
  BackendTaskName   = "Yova Auto API"
  FrontendTaskName  = "Yova Auto Web"
  BackendStartDelaySeconds  = 25
  FrontendStartDelaySeconds = 55
  NodeVersion       = "22.16.0"
  NodeZipName       = "node-v22.16.0-win-x64.zip"
  NodeDownloadUrl   = "https://nodejs.org/dist/v22.16.0/node-v22.16.0-win-x64.zip"
  SqliteToolsZip    = "sqlite-tools-win-x64-3490200.zip"
  SqliteDownloadUrl = "https://www.sqlite.org/2025/sqlite-tools-win-x64-3490200.zip"
  BackendPort       = 3001
  FrontendPort      = 8081
  FrontendHost      = "127.0.0.1"
  AppUrl            = "http://127.0.0.1:8081"
  HealthUrl         = "http://127.0.0.1:3001/health"
  DefaultLogin      = "admin@yovaauto.co.uk / admin"
}
