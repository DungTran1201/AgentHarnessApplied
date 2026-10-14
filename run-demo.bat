@echo off
set "PATH=C:\Program Files\nodejs;C:\Program Files\Git\cmd;%PATH%"
echo ========================================================
echo   Starting AI-Chan Assistant Fullstack Demo
echo ========================================================

echo [1/2] Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "AI-Chan Backend (FastAPI)" cmd /k "cd ai-backend && (if exist .venv\Scripts\python.exe (.\.venv\Scripts\python.exe -m uvicorn src.main:app --port 8000 --reload) else (python -m uvicorn src.main:app --port 8000 --reload))"

timeout /t 3 /nobreak >nul

echo [2/3] Starting Next.js Frontend on http://localhost:3000 ...
start "AI-Chan Frontend (Next.js)" cmd /k "cd ai-frontend && npm run dev -- --port 3000"

echo [3/3] Checking Discord Bot configuration...
if exist ai-backend\.env (
    findstr /R /C:"^DISCORD_BOT_TOKEN=..*" ai-backend\.env | findstr /V "your_discord_bot_token_here" >nul 2>&1
    if not errorlevel 1 (
        echo Starting AI-Chan Integrated Discord Bot...
        start "AI-Chan Discord Bot" cmd /k "cd ai-backend && (if exist .venv\Scripts\python.exe (.\.venv\Scripts\python.exe -m src.discord_bot.main) else (python -m src.discord_bot.main))"
    ) else (
        echo Discord Bot token not configured or set to placeholder in ai-backend\.env (optional in dev, skipped).
    )
) else (
    echo ai-backend\.env not found (Discord bot skipped).
)

echo.
echo All services launched!
echo - Frontend: http://localhost:3000
echo - Backend API Docs: http://127.0.0.1:8000/docs
echo - Discord Bot: python -m src.discord_bot.main (run inside ai-backend)
echo.
pause
