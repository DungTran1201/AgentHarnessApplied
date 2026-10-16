@echo off
setlocal enabledelayedexpansion

:: Resolve repository root (parent of tools/)
pushd "%~dp0.."
set "REPO_ROOT=%CD%"
popd

if exist "%REPO_ROOT%\ai-backend\.venv\Scripts\activate.bat" (
    call "%REPO_ROOT%\ai-backend\.venv\Scripts\activate.bat"
)

set "PYTHON_EXE=%~1"
if "%PYTHON_EXE%"=="" set "PYTHON_EXE=%REPO_ROOT%\ai-backend\.venv\Scripts\python.exe"
if not exist "%PYTHON_EXE%" set "PYTHON_EXE=python"

set "LOG_DIR=%REPO_ROOT%\logs"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"
set "LOG_FILE=%LOG_DIR%\discord.log"

title AI-Chan ^| Discord Bot

cd /d "%REPO_ROOT%\ai-backend"

set PYTHONUNBUFFERED=1
set PYTHONIOENCODING=utf-8
set PYTHONUTF8=1

echo ======================================================================
echo   AI-Chan ^| Discord Bot
echo ======================================================================
echo   Directory : %CD%
echo   Command   : %PYTHON_EXE% -u -m src.discord_bot.main
echo   Log File  : %LOG_FILE%
echo   Started   : %DATE% %TIME%
echo ======================================================================
echo.

"%PYTHON_EXE%" -u -m src.discord_bot.main 2>&1 | "%PYTHON_EXE%" -u "%REPO_ROOT%\tools\tee.py" "%LOG_FILE%"

set "EXIT_CODE=%ERRORLEVEL%"
echo.
echo ======================================================================
if %EXIT_CODE% equ 0 (
    echo [*] Discord Bot stopped normally.
) else (
    echo [-] Discord Bot exited with error code %EXIT_CODE%.
)
echo [!] This console window remains open for diagnostic inspection.
echo     Close this window or run 'run-demo.bat --stop' to terminate.
echo ======================================================================
pause
