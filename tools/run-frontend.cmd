@echo off
setlocal enabledelayedexpansion

:: Resolve repository root (parent of tools/)
pushd "%~dp0.."
set "REPO_ROOT=%CD%"
popd

if exist "%REPO_ROOT%\ai-backend\.venv\Scripts\activate.bat" (
    call "%REPO_ROOT%\ai-backend\.venv\Scripts\activate.bat"
)

set "PORT=%~1"
if "%PORT%"=="" set "PORT=3000"

set "PYTHON_EXE=%~2"
if "%PYTHON_EXE%"=="" set "PYTHON_EXE=%REPO_ROOT%\ai-backend\.venv\Scripts\python.exe"
if not exist "%PYTHON_EXE%" set "PYTHON_EXE=python"

set "LOG_DIR=%REPO_ROOT%\logs"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"
set "LOG_FILE=%LOG_DIR%\frontend.log"

title AI-Chan ^| Frontend

cd /d "%REPO_ROOT%\ai-frontend"

echo ======================================================================
echo   AI-Chan ^| Frontend
echo ======================================================================
echo   Directory : %CD%
echo   Port      : %PORT%
echo   Endpoint  : http://localhost:%PORT%
echo   Command   : npm.cmd run dev -- --port %PORT%
echo   Log File  : %LOG_FILE%
echo   Started   : %DATE% %TIME%
echo ======================================================================
echo.

set "NPM_CMD=npm.cmd"
where npm.cmd >nul 2>&1
if %ERRORLEVEL% neq 0 set "NPM_CMD=npm"

call %NPM_CMD% run dev -- --port %PORT% 2>&1 | "%PYTHON_EXE%" -u "%REPO_ROOT%\tools\tee.py" "%LOG_FILE%"

set "EXIT_CODE=%ERRORLEVEL%"
echo.
echo ======================================================================
if %EXIT_CODE% equ 0 (
    echo [*] Next.js Frontend stopped normally.
) else (
    echo [-] Next.js Frontend exited with error code %EXIT_CODE%.
)
echo [!] This console window remains open for diagnostic inspection.
echo     Close this window or run 'run-demo.bat --stop' to terminate.
echo ======================================================================
pause
