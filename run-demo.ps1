# AI-Chan Assistant Fullstack Launch Script
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   Starting AI-Chan Assistant Fullstack Demo" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$env:PATH = "C:\Program Files\nodejs;C:\Program Files\Git\cmd;C:\Users\sv\AppData\Local\Programs\Python\Python313;" + $env:PATH

Write-Host "[1/2] Starting FastAPI Backend on http://127.0.0.1:8000 ..." -ForegroundColor Yellow
$backendCmd = "`$env:PATH = 'C:\Program Files\nodejs;C:\Program Files\Git\cmd;' + `$env:PATH; cd ai-backend; if (Test-Path .venv\Scripts\python.exe) { .\.venv\Scripts\python.exe -m uvicorn src.main:app --port 8000 --reload } else { python -m uvicorn src.main:app --port 8000 --reload }"
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $backendCmd

Start-Sleep -Seconds 3

Write-Host "[2/3] Starting Next.js Frontend on http://localhost:3000 ..." -ForegroundColor Yellow
$frontendCmd = "`$env:PATH = 'C:\Program Files\nodejs;C:\Program Files\Git\cmd;' + `$env:PATH; cd ai-frontend; npm.cmd run dev -- --port 3000"
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $frontendCmd

Write-Host "[3/3] Checking Discord Bot configuration..." -ForegroundColor Yellow
$envFile = "ai-backend\.env"
$botToken = $null
if (Test-Path $envFile) {
    $match = Get-Content $envFile | Where-Object { $_ -match "^DISCORD_BOT_TOKEN=(.+)$" }
    if ($match) {
        $val = ($match -replace "^DISCORD_BOT_TOKEN=", "").Trim()
        if ($val -and $val -ne "your_discord_bot_token_here") {
            $botToken = $val
        }
    }
}

if ($botToken) {
    Write-Host "  -> Starting AI-Chan Integrated Discord Bot..." -ForegroundColor Cyan
    $botCmd = "`$env:PATH = 'C:\Program Files\Git\cmd;' + `$env:PATH; cd ai-backend; if (Test-Path .venv\Scripts\python.exe) { .\.venv\Scripts\python.exe -m src.discord_bot.main } else { python -m src.discord_bot.main }"
    Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $botCmd
} else {
    Write-Host "  -> DISCORD_BOT_TOKEN not configured in ai-backend\.env (optional in dev, skipped)." -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "All services launched successfully!" -ForegroundColor Green
Write-Host "  -> Frontend App:      http://localhost:3000" -ForegroundColor White
Write-Host "  -> Backend Swagger:   http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host "  -> Backend Health:    http://127.0.0.1:8000/api/v1/health" -ForegroundColor White
Write-Host "  -> Discord Bot:       python -m src.discord_bot.main" -ForegroundColor White
Write-Host ""
