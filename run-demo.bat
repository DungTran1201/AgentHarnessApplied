@echo off
setlocal enabledelayedexpansion

:: Resolve root directory from script location
set "SCRIPT_DIR=%~dp0"

:: Forward all arguments to PowerShell supervisor
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%run-demo.ps1" %*
exit /b %ERRORLEVEL%
