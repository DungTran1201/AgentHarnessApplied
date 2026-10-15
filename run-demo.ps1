<#
.SYNOPSIS
    AI-Chan Fullstack & Development Orchestrator Launcher
.DESCRIPTION
    Starts FastAPI backend, Next.js frontend, Agent Runner daemon, and optional Discord bot
    with dependency preflights, port conflict detection, readiness health checks, and graceful shutdown.
.PARAMETER NoBrowser
    Do not automatically open the browser once services are ready.
.PARAMETER NoDiscord
    Skip starting the optional Discord bot.
.PARAMETER NoRunner
    Skip starting the local Agent Runner daemon.
.PARAMETER Check
    Run preflight dependency, port, and configuration checks only without starting services.
.PARAMETER Stop
    Stop all currently running AI-Chan demo background processes.
.PARAMETER BackendPort
    Port for FastAPI backend (default: 8000).
.PARAMETER FrontendPort
    Port for Next.js frontend (default: 3000).
#>

[CmdletBinding()]
param(
    [Alias("no-browser")]
    [switch]$NoBrowser,

    [Alias("no-discord")]
    [switch]$NoDiscord,

    [Alias("no-runner")]
    [switch]$NoRunner,

    [switch]$Check,

    [switch]$Stop,

    [Alias("h", "?")]
    [switch]$Help,

    [Alias("backend-port")]
    [int]$BackendPort = 8000,

    [Alias("frontend-port")]
    [int]$FrontendPort = 3000
)

if ($Help) {
    Write-Host @"
AI-Chan Development Orchestrator Demo Launcher

Usage:
  run-demo.bat [options]
  powershell -File run-demo.ps1 [options]

Options:
  --check                 Run preflight checks (Python, Node, Git, agy, ports, env) and exit
  --stop                  Stop all running AI-Chan demo processes cleanly
  --no-browser            Do not automatically open the browser when ready
  --no-runner             Do not start the local Agent Runner daemon
  --no-discord            Do not start the Discord bot
  --backend-port <int>    Port for FastAPI backend (default: 8000)
  --frontend-port <int>   Port for Next.js frontend (default: 3000)
  --help, -h              Show this help message

Documentation:
  docs/development-orchestrator/README.md
"@
    exit 0
}

# 1. Ensure working directory is repository root
$RepoRoot = $PSScriptRoot
Set-Location $RepoRoot

$PidFile = Join-Path $RepoRoot ".demo_pids.json"
$LogDir = Join-Path $RepoRoot "logs"

function Write-Header {
    param([string]$Text)
    Write-Host "`n========================================================" -ForegroundColor Cyan
    Write-Host "  $Text" -ForegroundColor Cyan
    Write-Host "========================================================" -ForegroundColor Cyan
}

function Write-Success { param([string]$Text) Write-Host "[+] $Text" -ForegroundColor Green }
function Write-Info    { param([string]$Text) Write-Host "[i] $Text" -ForegroundColor Cyan }
function Write-Warn    { param([string]$Text) Write-Host "[!] $Text" -ForegroundColor Yellow }
function Write-Fail    { param([string]$Text) Write-Host "[-] $Text" -ForegroundColor Red }

# ── 2. STOP HANDLER ────────────────────────────────────────────────────────────
if ($Stop) {
    Write-Header "Stopping AI-Chan Demo Services"
    if (Test-Path $PidFile) {
        try {
            $pidsData = Get-Content $PidFile -Raw | ConvertFrom-Json
            foreach ($prop in $pidsData.PSObject.Properties) {
                $pName = $prop.Name
                $procId = $prop.Value
                if ($procId -and ($procId -is [int] -or $procId -is [string])) {
                    $pidInt = [int]$procId
                    $proc = Get-Process -Id $pidInt -ErrorAction SilentlyContinue
                    if ($proc) {
                        Write-Info "Terminating $pName process tree (PID: $pidInt)..."
                        # Use taskkill /T /F for full child process tree cleanup on Windows
                        & taskkill /T /F /PID $pidInt 2>$null | Out-Null
                        Write-Success "Stopped $pName (PID: $pidInt)"
                    }
                }
            }
        } catch {
            Write-Warn "Could not parse $PidFile : $_"
        }
        Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
    } else {
        Write-Info "No active .demo_pids.json file found."
    }

    # Clean any dangling processes on demo ports 8000 & 3000
    Write-Info "Checking for dangling processes on ports $BackendPort and $FrontendPort..."
    foreach ($port in @($BackendPort, $FrontendPort)) {
        $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        foreach ($c in $conns) {
            $owningPid = $c.OwningProcess
            if ($owningPid -and $owningPid -gt 4) {
                $p = Get-Process -Id $owningPid -ErrorAction SilentlyContinue
                if ($p -and ($p.ProcessName -match "python|node|uvicorn")) {
                    Write-Warn "Killing dangling listener on port $port ($($p.ProcessName), PID: $owningPid)..."
                    & taskkill /T /F /PID $owningPid 2>$null | Out-Null
                }
            }
        }
    }

    Write-Success "All demo processes stopped cleanly."
    exit 0
}

# ── 3. PREFLIGHT ENVIRONMENT & DEPENDENCY CHECKS ──────────────────────────────
Write-Header "AI-Chan Preflight Diagnostics"

# 3.1 Python Discovery
$PythonExe = $null
$VenvPython = Join-Path $RepoRoot "ai-backend\.venv\Scripts\python.exe"
if (Test-Path $VenvPython) {
    $PythonExe = $VenvPython
    $pyVer = & $PythonExe --version 2>&1
    Write-Success "Python Interpreter: $pyVer (found in ai-backend\.venv)"
} else {
    $SysPython = Get-Command python -ErrorAction SilentlyContinue
    if ($SysPython) {
        $PythonExe = $SysPython.Source
        $pyVer = & $PythonExe --version 2>&1
        Write-Success "Python Interpreter: $pyVer (system PATH)"
    } else {
        Write-Fail "Python not found. Please install Python 3.10+ or set up ai-backend\.venv."
        exit 1
    }
}

# 3.2 Node.js & npm Discovery
$NodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($NodeCmd) {
    $nodeVer = & node --version
    Write-Success "Node.js: $nodeVer"
} else {
    Write-Fail "Node.js not found on PATH. Next.js frontend requires Node.js 18+."
    exit 1
}

$NpmCmd = Get-Command npm -ErrorAction SilentlyContinue
if ($NpmCmd) {
    $npmVer = & npm --version
    Write-Success "npm: v$npmVer"
} else {
    Write-Fail "npm not found on PATH."
    exit 1
}

# 3.3 Git Discovery
$GitCmd = Get-Command git -ErrorAction SilentlyContinue
if ($GitCmd) {
    $gitVer = & git --version
    Write-Success "Git: $gitVer"
} else {
    Write-Warn "Git not found on PATH. Git isolation and diffing features will be unavailable."
}

# 3.4 Antigravity CLI Discovery
$AgyPath = $null
$SysAgy = Get-Command agy -ErrorAction SilentlyContinue
if ($SysAgy) {
    $AgyPath = $SysAgy.Source
} else {
    $CandidateAgy = Join-Path $env:LOCALAPPDATA "agy\bin\agy.exe"
    if (Test-Path $CandidateAgy) {
        $AgyPath = $CandidateAgy
    }
}

if ($AgyPath) {
    $agyVer = & $AgyPath --version 2>&1
    Write-Success "Antigravity CLI (agy): v$agyVer at $AgyPath"
} else {
    Write-Warn "Antigravity CLI ('agy') not found on PATH or %LOCALAPPDATA%\agy\bin\agy.exe."
    Write-Info "AI-Chan will run in operator mode. To enable external coding agents, install Antigravity CLI."
}

# 3.5 Backend Environment Configuration
$BackendEnv = Join-Path $RepoRoot "ai-backend\.env"
$BackendEnvExample = Join-Path $RepoRoot "ai-backend\.env.example"
if (-not (Test-Path $BackendEnv)) {
    if (Test-Path $BackendEnvExample) {
        Copy-Item $BackendEnvExample $BackendEnv
        Write-Success "Initialized ai-backend\.env from .env.example."
    } else {
        Set-Content -Path $BackendEnv -Value "# AI-Chan Backend Environment`nENVIRONMENT=development`nLOG_LEVEL=INFO`n"
        Write-Success "Created basic ai-backend\.env configuration."
    }
} else {
    Write-Success "Configuration found: ai-backend\.env (verified without exposing secrets)"
}

# 3.6 Port Conflict Pre-checks
function Test-PortAvailable {
    param([int]$Port, [string]$ServiceName)
    $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($conns) {
        $pidOwner = $conns[0].OwningProcess
        $p = Get-Process -Id $pidOwner -ErrorAction SilentlyContinue
        Write-Warn "Port $Port ($ServiceName) is currently in use by process '$($p.ProcessName)' (PID: $pidOwner)."
        return $false
    }
    Write-Success "Port $Port ($ServiceName) is FREE."
    return $true
}

$backendPortFree = Test-PortAvailable -Port $BackendPort -ServiceName "Backend API"
$frontendPortFree = Test-PortAvailable -Port $FrontendPort -ServiceName "Frontend UI"

# 3.7 Runner Configuration State
$RunnerConfigDir = Join-Path $env:USERPROFILE ".ai-chan"
$RunnerConfigFile = Join-Path $RunnerConfigDir "runner.json"
$RunnerPaired = $false
if (Test-Path $RunnerConfigFile) {
    try {
        $rCfg = Get-Content $RunnerConfigFile -Raw | ConvertFrom-Json
        if ($rCfg.runner_id -and $rCfg.runner_secret) {
            $RunnerPaired = $true
            Write-Success "Agent Runner enrollment: PAIRED (Runner ID: $($rCfg.runner_id))"
        }
    } catch {}
}

if (-not $RunnerPaired) {
    Write-Info "Agent Runner enrollment: NOT PAIRED. (Pair via web interface: Workspaces -> Pair New Runner)"
}

if ($Check) {
    Write-Header "Preflight Diagnostics Complete"
    Write-Host "All checks finished. To start demo services, run without -Check." -ForegroundColor Green
    exit 0
}

# Check if ports are blocked
if (-not $backendPortFree -or -not $frontendPortFree) {
    Write-Warn "One or more ports are already occupied."
    Write-Info "Tip: Run `.\run-demo.ps1 -Stop` to terminate previous demo processes, or check running applications."
    $choice = Read-Host "Proceed anyway? (y/N)"
    if ($choice -ne "y" -and $choice -ne "Y") {
        Write-Info "Startup aborted by user."
        exit 1
    }
}

# ── 4. PROCESS LAUNCHING ───────────────────────────────────────────────────────
if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

$pids = @{}

Write-Header "Launching AI-Chan Demo Services"

# 4.1 FastAPI Backend
Write-Info "[1/4] Starting FastAPI Backend on http://127.0.0.1:$BackendPort ..."
$backendLog = Join-Path $LogDir "backend.log"
$backendErr = Join-Path $LogDir "backend.err.log"
$backendProc = Start-Process -FilePath $PythonExe `
    -ArgumentList "-m", "uvicorn", "src.main:app", "--port", $BackendPort.ToString(), "--reload" `
    -WorkingDirectory (Join-Path $RepoRoot "ai-backend") `
    -RedirectStandardOutput $backendLog `
    -RedirectStandardError $backendErr `
    -PassThru

$pids["backend"] = $backendProc.Id
Write-Success "FastAPI Backend started (PID: $($backendProc.Id), Log: logs\backend.log)"

# 4.2 Poll Backend Readiness
Write-Info "Awaiting Backend readiness on http://127.0.0.1:$BackendPort ..."
$backendReady = $false
$maxRetries = 30
for ($i = 0; $i -lt $maxRetries; $i++) {
    Start-Sleep -Seconds 1
    try {
        $res = Invoke-WebRequest -Uri "http://127.0.0.1:$BackendPort/docs" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($res.StatusCode -eq 200) {
            $backendReady = $true
            break
        }
    } catch {}
}

if ($backendReady) {
    Write-Success "FastAPI Backend is READY (HTTP 200 OK)"
} else {
    Write-Warn "Backend did not respond within $maxRetries seconds. Check logs\backend.log for details."
}

# 4.3 Next.js Frontend
Write-Info "[2/4] Starting Next.js Frontend on http://localhost:$FrontendPort ..."
$frontendLog = Join-Path $LogDir "frontend.log"
$frontendErr = Join-Path $LogDir "frontend.err.log"

# On Windows, npm is npm.cmd
$npmExec = "npm.cmd"
if (-not (Get-Command $npmExec -ErrorAction SilentlyContinue)) {
    $npmExec = "npm"
}

$frontendProc = Start-Process -FilePath $npmExec `
    -ArgumentList "run", "dev", "--", "--port", $FrontendPort.ToString() `
    -WorkingDirectory (Join-Path $RepoRoot "ai-frontend") `
    -RedirectStandardOutput $frontendLog `
    -RedirectStandardError $frontendErr `
    -PassThru

$pids["frontend"] = $frontendProc.Id
Write-Success "Next.js Frontend started (PID: $($frontendProc.Id), Log: logs\frontend.log)"

# 4.4 Poll Frontend Readiness
Write-Info "Awaiting Frontend readiness on http://localhost:$FrontendPort ..."
$frontendReady = $false
$maxRetries = 45
for ($i = 0; $i -lt $maxRetries; $i++) {
    Start-Sleep -Seconds 1
    try {
        $res = Invoke-WebRequest -Uri "http://localhost:$FrontendPort" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($res.StatusCode -eq 200 -or $res.StatusCode -eq 304 -or $res.StatusCode -eq 307) {
            $frontendReady = $true
            break
        }
    } catch {}
}

if ($frontendReady) {
    Write-Success "Next.js Frontend is READY"
} else {
    Write-Warn "Frontend did not respond within $maxRetries seconds. It may still be compiling, check logs\frontend.log."
}

# 4.5 Agent Runner Daemon
if (-not $NoRunner) {
    if ($RunnerPaired) {
        Write-Info "[3/4] Starting Local Agent Runner Daemon..."
        $runnerLog = Join-Path $LogDir "runner.log"
        $runnerErr = Join-Path $LogDir "runner.err.log"
        $runnerProc = Start-Process -FilePath $PythonExe `
            -ArgumentList "runner.py", "start", "--server", "http://localhost:$BackendPort" `
            -WorkingDirectory (Join-Path $RepoRoot "ai-runner") `
            -RedirectStandardOutput $runnerLog `
            -RedirectStandardError $runnerErr `
            -PassThru

        $pids["runner"] = $runnerProc.Id
        Write-Success "Agent Runner daemon started (PID: $($runnerProc.Id), Log: logs\runner.log)"
    } else {
        Write-Info "[3/4] Agent Runner skipped (not paired yet). You can pair via the web UI."
    }
} else {
    Write-Info "[3/4] Agent Runner skipped (-NoRunner flag specified)."
}

# 4.6 Discord Bot (Optional)
if (-not $NoDiscord) {
    $hasDiscordToken = $false
    if (Test-Path $BackendEnv) {
        $lines = Get-Content $BackendEnv
        foreach ($line in $lines) {
            if ($line -match "^DISCORD_BOT_TOKEN=(.+)$") {
                $val = $matches[1].Trim()
                if ($val -and $val -ne "your_discord_bot_token_here") {
                    $hasDiscordToken = $true
                }
            }
        }
    }

    if ($hasDiscordToken) {
        Write-Info "[4/4] Starting AI-Chan Discord Bot..."
        $discordLog = Join-Path $LogDir "discord.log"
        $discordErr = Join-Path $LogDir "discord.err.log"
        $discordProc = Start-Process -FilePath $PythonExe `
            -ArgumentList "-m", "src.discord_bot.main" `
            -WorkingDirectory (Join-Path $RepoRoot "ai-backend") `
            -RedirectStandardOutput $discordLog `
            -RedirectStandardError $discordErr `
            -PassThru

        $pids["discord"] = $discordProc.Id
        Write-Success "Discord Bot started (PID: $($discordProc.Id), Log: logs\discord.log)"
    } else {
        Write-Info "[4/4] Discord Bot skipped (token not configured or placeholder in .env)."
    }
} else {
    Write-Info "[4/4] Discord Bot skipped (-NoDiscord flag specified)."
}

# 4.7 Record PIDs to .demo_pids.json
$pidsData = @{
    started_at = (Get-Date -Format "o")
    backend = $pids["backend"]
    frontend = $pids["frontend"]
    runner = $pids["runner"]
    discord = $pids["discord"]
}
$pidsData | ConvertTo-Json | Set-Content -Path $PidFile -Force

# 4.8 Open Browser
if (-not $NoBrowser) {
    Start-Process "http://localhost:$FrontendPort"
}

# ── 5. RUNTIME MONITORING & CLEAN SHUTDOWN ─────────────────────────────────────
Write-Header "AI-Chan Demo is Live!"
Write-Host "  Frontend URL:     http://localhost:$FrontendPort" -ForegroundColor Cyan
Write-Host "  Backend API Docs: http://127.0.0.1:$BackendPort/docs" -ForegroundColor Cyan
Write-Host "  Workspaces UI:    http://localhost:$FrontendPort/workspaces" -ForegroundColor Cyan
Write-Host "  Tasks Workbench:  http://localhost:$FrontendPort/tasks" -ForegroundColor Cyan
Write-Host "  Runtime Logs:     $LogDir" -ForegroundColor Cyan
Write-Host "`n  To stop all services cleanly: Press Ctrl+C in this terminal," -ForegroundColor Yellow
Write-Host "  or run: .\run-demo.ps1 -Stop (or run-demo.bat --stop)" -ForegroundColor Yellow
Write-Host "========================================================`n" -ForegroundColor Cyan

try {
    while ($true) {
        Start-Sleep -Seconds 2
        # Check if backend or frontend died unexpectedly
        if ($backendProc -and $backendProc.HasExited) {
            Write-Warn "FastAPI Backend exited unexpectedly (Exit code: $($backendProc.ExitCode)). Check logs\backend.log."
            break
        }
        if ($frontendProc -and $frontendProc.HasExited) {
            Write-Warn "Next.js Frontend exited unexpectedly (Exit code: $($frontendProc.ExitCode)). Check logs\frontend.log."
            break
        }
    }
} finally {
    Write-Info "Shutting down AI-Chan demo processes..."
    if (Test-Path $PidFile) {
        & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $RepoRoot "run-demo.ps1") -Stop
    }
}
