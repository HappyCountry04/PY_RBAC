$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root "ruoyi-fastapi-backend"
$frontend = Join-Path $root "ruoyi-next-admin"

Write-Host "检查 Docker 容器..."
docker start pgsql myredis | Out-Null

Write-Host "启动 FastAPI 后端：http://127.0.0.1:8000"
$backendPort = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $backendPort) {
  Start-Process -WindowStyle Hidden -FilePath python -ArgumentList "-m","uvicorn","app.main:app","--host","127.0.0.1","--port","8000" -WorkingDirectory $backend
}

Write-Host "启动 Next 前端：http://127.0.0.1:3000"
$frontendPort = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $frontendPort) {
  Start-Process -WindowStyle Hidden -FilePath "npm.cmd" -ArgumentList "run","dev","--","--hostname","127.0.0.1","--port","3000" -WorkingDirectory $frontend
}

Start-Sleep -Seconds 5

Write-Host "后端健康检查："
Invoke-RestMethod -Uri "http://127.0.0.1:8000/health" -Method Get | ConvertTo-Json -Compress

Write-Host "前端访问检查："
(Invoke-WebRequest -Uri "http://127.0.0.1:3000" -UseBasicParsing -TimeoutSec 15).StatusCode

Write-Host "启动完成。默认账号：admin / admin123"
