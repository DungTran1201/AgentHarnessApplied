"""
AI-Chan Windows Packaging Automation Script
Automates the end-to-end build of backend, frontend, launcher, and Inno Setup installer.
"""
import os
import sys
import shutil
import argparse
import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
PACKAGING_DIR = REPO_ROOT / "packaging" / "windows"
DIST_DIR = REPO_ROOT / "dist"
BUNDLE_DIR = DIST_DIR / "bundle"
INSTALLER_OUTPUT_DIR = DIST_DIR / "installer"
BUILD_DIR = REPO_ROOT / "build"


def find_iscc() -> Path:
    """Finds Inno Setup Compiler executable."""
    candidates = [
        Path(os.environ.get("LOCALAPPDATA", "")) / "Programs" / "Inno Setup 6" / "ISCC.exe",
        Path("C:/Program Files (x86)/Inno Setup 6/ISCC.exe"),
        Path("C:/Program Files/Inno Setup 6/ISCC.exe"),
        Path(shutil.which("ISCC.exe") or shutil.which("iscc") or ""),
    ]
    for c in candidates:
        if c and c.exists():
            return c
    return None


def find_pyinstaller() -> Path:
    """Finds PyInstaller executable."""
    venv_pyinstaller = REPO_ROOT / "ai-backend" / ".venv" / "Scripts" / "pyinstaller.exe"
    if venv_pyinstaller.exists():
        return venv_pyinstaller
    which_pyi = shutil.which("pyinstaller")
    if which_pyi:
        return Path(which_pyi)
    return None


def find_node() -> Path:
    """Finds Node.js executable."""
    which_node = shutil.which("node")
    if which_node:
        return Path(which_node)
    candidates = [
        Path("C:/Program Files/nodejs/node.exe"),
        Path(os.environ.get("LOCALAPPDATA", "")) / "Programs" / "nodejs" / "node.exe",
    ]
    for c in candidates:
        if c.exists():
            return c
    return None


def run_cmd(cmd, cwd=None, env=None, check=True):
    print(f"\n[BUILD] Running: {' '.join(str(c) for c in cmd)}")
    res = subprocess.run(cmd, cwd=cwd or str(REPO_ROOT), env=env or os.environ.copy())
    if check and res.returncode != 0:
        raise RuntimeError(f"Command failed with exit code {res.returncode}: {cmd}")
    return res.returncode


def build_backend(pyinstaller_exe: Path):
    print("\n==========================================")
    print(" 1. Building FastAPI Backend Bundle       ")
    print("==========================================")
    backend_entry = PACKAGING_DIR / "backend_entry.py"
    backend_dist = BUNDLE_DIR / "backend"
    backend_work = BUILD_DIR / "backend"

    cmd = [
        str(pyinstaller_exe),
        "--name", "ai-chan-backend",
        "--onedir",
        "--noconfirm",
        "--distpath", str(backend_dist),
        "--workpath", str(backend_work),
        "--paths", str(REPO_ROOT / "ai-backend"),
        "--add-data", f"{REPO_ROOT / 'ai-backend' / 'database'};database",
        "--add-data", f"{REPO_ROOT / 'ai-backend' / 'data' / 'cache'};data/cache",
        "--add-data", f"{REPO_ROOT / 'ai-backend' / 'data' / 'storage' / 'skills'};data/storage/skills",
        "--hidden-import", "uvicorn.logging",
        "--hidden-import", "uvicorn.loops",
        "--hidden-import", "uvicorn.loops.auto",
        "--hidden-import", "uvicorn.protocols",
        "--hidden-import", "uvicorn.protocols.http",
        "--hidden-import", "uvicorn.protocols.http.auto",
        "--hidden-import", "uvicorn.protocols.websockets",
        "--hidden-import", "uvicorn.protocols.websockets.auto",
        "--hidden-import", "uvicorn.lifespan",
        "--hidden-import", "uvicorn.lifespan.on",
        "--hidden-import", "uvicorn.lifespan.off",
        "--hidden-import", "sqlite3",
        str(backend_entry)
    ]
    run_cmd(cmd)
    print("[SUCCESS] Backend bundle built at:", backend_dist / "ai-chan-backend")


def build_frontend():
    print("\n==========================================")
    print(" 2. Building Next.js Standalone Frontend  ")
    print("==========================================")
    frontend_dir = REPO_ROOT / "ai-frontend"
    npm_cmd = shutil.which("npm.cmd") or shutil.which("npm") or "npm"

    # Build standalone
    run_cmd([npm_cmd, "run", "build"], cwd=str(frontend_dir))

    # Assemble bundle
    dest_frontend = BUNDLE_DIR / "frontend"
    if dest_frontend.exists():
        shutil.rmtree(dest_frontend)
    dest_frontend.mkdir(parents=True, exist_ok=True)

    standalone_src = frontend_dir / ".next" / "standalone"
    if not standalone_src.exists():
        raise RuntimeError("Next.js standalone output directory not found (.next/standalone)")

    print(f"Copying standalone files from {standalone_src} to {dest_frontend} ...")
    for item in standalone_src.iterdir():
        dest_item = dest_frontend / item.name
        if item.is_dir():
            shutil.copytree(item, dest_item, dirs_exist_ok=True)
        else:
            shutil.copy2(item, dest_item)

    # Copy static assets into .next/static
    static_src = frontend_dir / ".next" / "static"
    static_dest = dest_frontend / ".next" / "static"
    if static_src.exists():
        print(f"Copying static assets from {static_src} to {static_dest} ...")
        shutil.copytree(static_src, static_dest, dirs_exist_ok=True)

    # Copy public assets into public
    public_src = frontend_dir / "public"
    public_dest = dest_frontend / "public"
    if public_src.exists():
        print(f"Copying public assets from {public_src} to {public_dest} ...")
        shutil.copytree(public_src, public_dest, dirs_exist_ok=True)

    # Bundle node.exe
    node_exe = find_node()
    if node_exe and node_exe.exists():
        print(f"Bundling Node.js runtime from {node_exe} into {dest_frontend / 'node.exe'} ...")
        shutil.copy2(str(node_exe), str(dest_frontend / "node.exe"))
    else:
        print("[WARNING] node.exe not found on system. Frontend will require Node in PATH if not bundled.")

    print("[SUCCESS] Frontend standalone bundle assembled at:", dest_frontend)


def build_launcher(pyinstaller_exe: Path):
    print("\n==========================================")
    print(" 3. Building AI-Chan Launcher (AI-Chan.exe)")
    print("==========================================")
    launcher_src = PACKAGING_DIR / "launcher" / "launcher.py"
    icon_path = PACKAGING_DIR / "assets" / "app.ico"
    launcher_work = BUILD_DIR / "launcher"

    cmd = [
        str(pyinstaller_exe),
        "--name", "AI-Chan",
        "--onefile",
        "--noconsole",
        "--icon", str(icon_path),
        "--distpath", str(BUNDLE_DIR),
        "--workpath", str(launcher_work),
        str(launcher_src)
    ]
    run_cmd(cmd)

    # Copy icon to assets directory in bundle
    assets_dest = BUNDLE_DIR / "assets"
    assets_dest.mkdir(parents=True, exist_ok=True)
    if icon_path.exists():
        shutil.copy2(str(icon_path), str(assets_dest / "app.ico"))

    print("[SUCCESS] AI-Chan.exe built at:", BUNDLE_DIR / "AI-Chan.exe")


def build_installer(iscc_exe: Path):
    print("\n==========================================")
    print(" 4. Compiling Inno Setup Windows Installer")
    print("==========================================")
    iss_file = PACKAGING_DIR / "installer.iss"
    INSTALLER_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    cmd = [str(iscc_exe), str(iss_file)]
    run_cmd(cmd, cwd=str(PACKAGING_DIR))

    installer_exe = INSTALLER_OUTPUT_DIR / "AI-Chan-Setup.exe"
    if not installer_exe.exists():
        raise RuntimeError(f"Installer was not generated at expected path: {installer_exe}")

    size_mb = installer_exe.stat().st_size / (1024 * 1024)
    print("\n============================================================")
    print(f" [SUCCESS] AI-Chan Installer Created Successfully!")
    print(f" Path: {installer_exe}")
    print(f" Size: {size_mb:.2f} MB")
    print("============================================================")


def main():
    parser = argparse.ArgumentParser(description="AI-Chan Windows Packaging Automation")
    parser.add_argument("--skip-backend", action="store_true", help="Skip backend PyInstaller build")
    parser.add_argument("--skip-frontend", action="store_true", help="Skip frontend build")
    parser.add_argument("--skip-launcher", action="store_true", help="Skip launcher build")
    parser.add_argument("--skip-installer", action="store_true", help="Skip Inno Setup compilation")
    parser.add_argument("--clean", action="store_true", help="Clean build and dist directories before packaging")
    args = parser.parse_args()

    if args.clean:
        print("[BUILD] Cleaning build artifacts...")
        for p in [BUILD_DIR, DIST_DIR]:
            if p.exists():
                shutil.rmtree(p)

    DIST_DIR.mkdir(parents=True, exist_ok=True)
    BUNDLE_DIR.mkdir(parents=True, exist_ok=True)
    INSTALLER_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    pyinstaller = find_pyinstaller()
    if not pyinstaller:
        raise RuntimeError("PyInstaller executable not found. Please install in virtualenv.")

    iscc = find_iscc()
    if not iscc and not args.skip_installer:
        print("[WARNING] Inno Setup compiler (ISCC.exe) not found.")
        print("Install via: winget install --id JRSoftware.InnoSetup --exact --accept-source-agreements --accept-package-agreements --silent")
        if not args.skip_installer:
            raise RuntimeError("ISCC.exe not found on system.")

    if not args.skip_backend:
        build_backend(pyinstaller)

    if not args.skip_frontend:
        build_frontend()

    if not args.skip_launcher:
        build_launcher(pyinstaller)

    if not args.skip_installer:
        build_installer(iscc)


if __name__ == "__main__":
    main()
