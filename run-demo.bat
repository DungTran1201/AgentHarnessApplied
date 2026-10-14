@echo off
set "PATH=C:\Program Files\nodejs;C:\Program Files\Git\cmd;%PATH%"
echo ========================================================
echo   Starting AI-Chan Assistant Fullstack Demo
echo ========================================================

echo [1/3] Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "AI-Chan Backend (FastAPI)" cmd /k "cd ai-backend && (if exist .venv\Scripts\python.exe (.\.venv\Scripts\python.exe -m uvicorn src.main:app --port 8000 --reload) else (python -m uvicorn src.main:app --port 8000 --reload))"

timeout /t 3 >nul 2>&1 || ping -n 4 127.0.0.1 >nul

echo [2/3] Starting Next.js Frontend on http://localhost:3000 ...
start "AI-Chan Frontend (Next.js)" cmd /k "cd ai-frontend && npm run dev -- --port 3000"

echo [3/3] Checking Discord Bot configuration...
if not exist ai-backend\.env goto :no_env

findstr /R /C:"^DISCORD_BOT_TOKEN=..*" ai-backend\.env | findstr /V "your_discord_bot_token_here" >nul 2>&1
if errorlevel 1 goto :no_token

echo Starting AI-Chan Integrated Discord Bot...
if exist ai-backend\.venv\Scripts\python.exe (
    start "AI-Chan Discord Bot" cmd /k "cd ai-backend && .\.venv\Scripts\python.exe -m src.discord_bot.main"
) else (
    start "AI-Chan Discord Bot" cmd /k "cd ai-backend && python -m src.discord_bot.main"
)
goto :bot_done

:no_token
echo Discord Bot token not configured or set to placeholder in ai-backend\.env [optional in dev, skipped].
goto :bot_done

:no_env
echo ai-backend\.env not found [Discord bot skipped].

:bot_done

echo.
echo All services launched!
echo - Frontend: http://localhost:3000
echo - Backend API Docs: http://127.0.0.1:8000/docs
echo - Discord Bot: python -m src.discord_bot.main (run inside ai-backend)
echo.
pause
