# Building the AI-Chan Windows Installer

This document describes the Windows packaging architecture and local/CI build instructions.

## Packaging Architecture

AI-Chan is packaged as a standalone local web application for Windows:
1. **Frontend**: Next.js compiled in `output: 'standalone'` mode, bundled with an embedded portable `node.exe` runtime. Reverse proxies `/api/` calls to the local FastAPI backend.
2. **Backend**: FastAPI entry point and runtime dependencies frozen via **PyInstaller** in `--onedir` mode. Uses SQLite for persistence and loopback binding (`127.0.0.1`).
3. **Launcher (`AI-Chan.exe`)**: Windowless Python process supervisor compiled to an executable. Manages service lifecycle, resolves `%LOCALAPPDATA%\AI-Chan` for data and logs, executes database migrations, detects port conflicts, opens the default browser once healthy, and provides a system tray icon.
4. **Installer (`AI-Chan-Setup.exe`)**: Compiled via **Inno Setup 6**. Installs application files separately from user data, creates Start Menu and Desktop shortcuts, and provides an uninstaller that offers to preserve or wipe user data.

## Prerequisites

- **Windows 10 / 11 (64-bit)**
- **Python 3.12+**
- **Node.js 20+** and **npm**
- **Inno Setup 6**:
  ```powershell
  winget install --id JRSoftware.InnoSetup --exact --accept-source-agreements --accept-package-agreements --silent
  ```

## Local Build Instructions

1. **Install backend dependencies and PyInstaller**:
   ```powershell
   cd ai-backend
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   pip install pyinstaller pillow pystray
   cd ..
   ```

2. **Install frontend dependencies**:
   ```powershell
   cd ai-frontend
   npm install
   cd ..
   ```

3. **Build the complete installer**:
   ```powershell
   python packaging/windows/build.py
   ```

   The resulting installer is generated at:
   `dist/installer/AI-Chan-Setup.exe`

4. **Optional build flags**:
   - `python packaging/windows/build.py --skip-backend`: Skip rebuilding backend bundle
   - `python packaging/windows/build.py --skip-frontend`: Skip rebuilding frontend bundle
   - `python packaging/windows/build.py --skip-launcher`: Skip rebuilding launcher executable
   - `python packaging/windows/build.py --clean`: Clean `build/` and `dist/` before packaging
