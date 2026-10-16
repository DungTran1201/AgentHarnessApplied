@echo off
setlocal enabledelayedexpansion

:: Resolve repository root (parent of tools/)
pushd "%~dp0.."
set "REPO_ROOT=%CD%"
popd

if exist "%REPO_ROOT%\ai-backend\.venv\Scripts\activate.bat" (
    call "%REPO_ROOT%\ai-backend\.venv\Scripts\activate.bat"
)

set "SERVER_URL=%~1"
if "%SERVER_URL%"=="" set "SERVER_URL=http://localhost:8000"

set "PYTHON_EXE=%~2"
if "%PYTHON_EXE%"=="" set "PYTHON_EXE=%REPO_ROOT%\ai-backend\.venv\Scripts\python.exe"
if not exist "%PYTHON_EXE%" set "PYTHON_EXE=python"

set "LOG_DIR=%REPO_ROOT%\logs"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"
set "LOG_FILE=%LOG_DIR%\runner.log"

title AI-Chan ^| Agent Runner

cd /d "%REPO_ROOT%\ai-runner"

set PYTHONUNBUFFERED=1
set PYTHONIOENCODING=utf-8
set PYTHONUTF8=1

echo ======================================================================
echo   AI-Chan ^| Agent Runner
echo ======================================================================
echo   Directory : %CD%
echo   Server    : %SERVER_URL%
echo   Command   : %PYTHON_EXE% -u runner.py start --server %SERVER_URL%
echo   Log File  : %LOG_FILE%
echo   Started   : %DATE% %TIME%
echo ======================================================================
echo.

"%PYTHON_EXE%" -u runner.py start --server %SERVER_URL% 2>&1 | "%PYTHON_EXE%" -u "%REPO_ROOT%\tools\tee.py" "%LOG_FILE%"

set "EXIT_CODE=%ERRORLEVEL%"
echo.
echo ======================================================================
if %EXIT_CODE% equ 0 (
    echo [*] Agent Runner daemon stopped normally.
) else (
    echo [-] Agent Runner daemon exited with error code %EXIT_CODE%.
)
echo [!] This console window remains open for diagnostic inspection.
echo     Close this window or run 'run-demo.bat --stop' to terminate.
echo ======================================================================
pause
