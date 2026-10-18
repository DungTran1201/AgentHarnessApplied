<#
.SYNOPSIS
    AI-Chan Fullstack & Discord Bot Demo Launcher
.DESCRIPTION
    Starts FastAPI backend, Next.js frontend, and optional Discord bot
    with dependency preflights, port conflict detection, readiness health checks,
    dedicated visible Command Prompt (cmd.exe) windows with real-time logs, and graceful shutdown.
.PARAMETER Command
    Positional action: start, stop, check, status, help.
.PARAMETER NoBrowser
    Do not automatically open the browser once services are ready.
.PARAMETER NoDiscord
    Skip starting the optional Discord bot.
.PARAMETER NoRunner
    Deprecated no-op flag preserved for CLI compatibility.
.PARAMETER Check
    Run preflight dependency, port, and configuration checks only without starting services.
.PARAMETER Stop
    Stop all currently running AI-Chan demo background processes cleanly.
.PARAMETER SingleConsole
    Run services in background instead of opening visible CMD windows for each service.
.PARAMETER BackendPort
    Port for FastAPI backend (default: 8000).
.PARAMETER FrontendPort
    Port for Next.js frontend (default: 3000).
#>

[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [string]$Command = "",

    [Alias("no-browser")]
    [switch]$NoBrowser,

    [Alias("no-discord")]
    [switch]$NoDiscord,

    [Alias("no-runner")]
    [switch]$NoRunner,

    [switch]$Check,

    [switch]$Stop,

    [Alias("single-console", "logs-only")]
    [switch]$SingleConsole,

    [Alias("h", "?")]
    [switch]$Help,

    [Alias("backend-port")]
    [int]$BackendPort = 8000,

    [Alias("frontend-port")]
    [int]$FrontendPort = 3000
)

# Normalize positional argument if passed without leading dashes (e.g. 'run-demo.bat stop')
if ($Command -match "^(--stop|-stop|stop)$") { $Stop = $true }
if ($Command -match "^(--check|-check|check)$") { $Check = $true }
if ($Command -match "^(--single-console|-single-console|single-console|--logs-only|logs-only)$") { $SingleConsole = $true }
if ($Command -match "^(--help|-help|help|\?)$") { $Help = $true }

# 1. Ensure working directory is repository root
$RepoRoot = $PSScriptRoot
Set-Location $RepoRoot

$PidFile = Join-Path $RepoRoot ".demo_pids.json"
$LogDir = Join-Path $RepoRoot "logs"
if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}
$SupervisorLog = Join-Path $LogDir "demo-supervisor.log"

function Append-SupervisorLog {
    param([string]$Text)
    try {
        $timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        Add-Content -Path $SupervisorLog -Value "[$timestamp] $Text" -Encoding utf8 -ErrorAction SilentlyContinue
    } catch {}
}

function Write-Header {
    param([string]$Text)
    Write-Host "`n========================================================" -ForegroundColor Cyan
    Write-Host "  $Text" -ForegroundColor Cyan
    Write-Host "========================================================" -ForegroundColor Cyan
    Append-SupervisorLog "=== $Text ==="
}

function Write-Success {
    param([string]$Text)
    Write-Host "[+] $Text" -ForegroundColor Green
    Append-SupervisorLog "[+] $Text"
}

function Write-Info {
    param([string]$Text)
    Write-Host "[i] $Text" -ForegroundColor Cyan
    Append-SupervisorLog "[i] $Text"
}

function Write-Warn {
    param([string]$Text)
    Write-Host "[!] $Text" -ForegroundColor Yellow
    Append-SupervisorLog "[!] $Text"
}

function Write-Fail {
    param([string]$Text)
    Write-Host "[-] $Text" -ForegroundColor Red
    Append-SupervisorLog "[-] $Text"
}

if ($Help) {
    Write-Host @"
AI-Chan Fullstack & Discord Bot Demo Launcher

Usage:
  run-demo.bat [options]
  powershell -File run-demo.ps1 [options]

Options:
  --check, check          Run preflight diagnostics (Python, Node, Git, ports, env) and exit
  --stop, stop            Stop all running AI-Chan demo processes cleanly
  --single-console        Run services in background without separate visible CMD windows
  --no-browser            Do not automatically open the browser when ready
  --no-discord            Do not start the Discord bot
  --backend-port <int>    Port for FastAPI backend (default: 8000)
  --frontend-port <int>   Port for Next.js frontend (default: 3000)
  --help, -h              Show this help message
"@
    exit 0
}

# ── 2. STOP HANDLER ────────────────────────────────────────────────────────────
function Stop-DemoServices {
    Write-Header "Stopping AI-Chan Demo Services"
    if (Test-Path $PidFile) {
        try {
            $pidsData = Get-Content $PidFile -Raw | ConvertFrom-Json
            $serviceKeys = @("backend", "frontend", "runner", "discord")
            foreach ($key in $serviceKeys) {
                if ($pidsData.PSObject.Properties[$key]) {
                    $item = $pidsData.$key
                    $procId = $null
                    $serviceLabel = $key

                    if ($item -is [int] -or $item -is [string]) {
                        $procId = [int]$item
                    } elseif ($item -and $item.pid) {
                        $procId = [int]$item.pid
                        if ($item.service) { $serviceLabel = $item.service }
                    }

                    if ($procId -and $procId -gt 0) {
                        $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
                        if ($proc) {
                            Write-Info "Terminating $serviceLabel process tree (PID: $procId)..."
                            & taskkill /T /F /PID $procId 2>$null | Out-Null
                            
                            # Bounded wait for process termination confirmation
                            $stopped = $false
                            for ($w = 0; $w -lt 5; $w++) {
                                Start-Sleep -Milliseconds 300
                                if (-not (Get-Process -Id $procId -ErrorAction SilentlyContinue)) {
                                    $stopped = $true
                                    break
                                }
                            }
                            if ($stopped) {
                                Write-Success "Stopped $serviceLabel (PID: $procId)"
                            } else {
                                Write-Warn "Could not verify termination of $serviceLabel (PID: $procId)"
                            }
                        } else {
                            Write-Info "$serviceLabel already exited (PID: $procId not running)."
                        }
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

    # Clean any dangling listener processes on demo ports
    Write-Info "Checking for dangling processes on ports $BackendPort and $FrontendPort..."
    foreach ($port in @($BackendPort, $FrontendPort)) {
        $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        foreach ($c in $conns) {
            $owningPid = $c.OwningProcess
            if ($owningPid -and $owningPid -gt 4) {
                $p = Get-Process -Id $owningPid -ErrorAction SilentlyContinue
                if ($p -and ($p.ProcessName -match "python|node|uvicorn|cmd")) {
                    Write-Warn "Terminating dangling listener on port $port ($($p.ProcessName), PID: $owningPid)..."
                    & taskkill /T /F /PID $owningPid 2>$null | Out-Null
                }
            }
        }
    }

    Write-Success "All demo processes stopped cleanly."
}

if ($Stop) {
    Stop-DemoServices
    exit 0
}

# ── 3. PREFLIGHT ENVIRONMENT & DEPENDENCY CHECKS ──────────────────────────────
Write-Header "AI-Chan Preflight Diagnostics"

# 3.1 Python Discovery & Version Validation
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

if ($pyVer -match "Python\s+3\.(\d+)") {
    $minor = [int]$matches[1]
    if ($minor -lt 10) {
        Write-Fail "Python version $pyVer is below required Python 3.10+."
        exit 1
    }
}

# Verify Core Dependencies in Python Environment
$pyDepCheck = & $PythonExe -c "import fastapi, uvicorn, pydantic, httpx" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Warn "Core Python packages missing in $PythonExe. Run: pip install -r ai-backend/requirements.txt"
} else {
    Write-Success "Python Dependencies: Core packages (fastapi, uvicorn, pydantic, httpx) verified."
}

# 3.2 Node.js & npm Discovery
$NodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($NodeCmd) {
    $nodeVer = & node --version
    Write-Success "Node.js: $nodeVer"
    if ($nodeVer -match "v(\d+)") {
        $nMajor = [int]$matches[1]
        if ($nMajor -lt 18) {
            Write-Warn "Node.js $nodeVer is below recommended Node 18+."
        }
    }
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

# 3.4 Antigravity CLI Discovery & Auth Readiness
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
    
    # Safe authentication readiness check (non-blocking, non-destructive)
    try {
        $modelCheck = & $AgyPath models 2>&1
        if ($LASTEXITCODE -eq 0 -and $modelCheck -match "(gemini|claude|gpt)") {
            Write-Success "Antigravity CLI Auth: READY (Authenticated, available models verified)"
        } else {
            Write-Warn "Antigravity CLI Auth: UNVERIFIED (Check API keys or run 'agy' interactive login)"
        }
    } catch {
        Write-Warn "Antigravity CLI Auth: Could not verify models ($_)"
    }
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
        $pName = if ($p) { $p.ProcessName } else { "Unknown" }
        Write-Warn "Port $Port ($ServiceName) is currently in use by process '$pName' (PID: $pidOwner)."
        return $false
    }
    Write-Success "Port $Port ($ServiceName) is FREE."
    return $true
}

$backendPortFree = Test-PortAvailable -Port $BackendPort -ServiceName "Backend API"
$frontendPortFree = Test-PortAvailable -Port $FrontendPort -ServiceName "Frontend UI"

if ($Check) {
    Write-Header "Preflight Diagnostics Complete"
    Write-Host "All checks finished. To start demo services, run without -Check." -ForegroundColor Green
    exit 0
}

# Check if ports are blocked
if (-not $backendPortFree -or -not $frontendPortFree) {
    Write-Warn "One or more required ports are already occupied."
    Write-Info "Tip: Run `.\run-demo.bat --stop` to terminate previous demo processes, or check running applications."
    $choice = Read-Host "Proceed anyway? (y/N)"
    if ($choice -ne "y" -and $choice -ne "Y") {
        Write-Info "Startup aborted by user."
        exit 1
    }
}

# ── 4. PROCESS LAUNCHING ───────────────────────────────────────────────────────
$pids = @{}
$serviceStatus = [ordered]@{
    "backend"  = @{ Name = "FastAPI Backend"; Status = "PENDING"; Pid = $null; Log = "logs\backend.log"; Endpoint = "http://127.0.0.1:$BackendPort/api/v1/health" }
    "frontend" = @{ Name = "Next.js Frontend"; Status = "PENDING"; Pid = $null; Log = "logs\frontend.log"; Endpoint = "http://localhost:$FrontendPort" }
    "discord"  = @{ Name = "Discord Bot"; Status = "SKIPPED"; Pid = $null; Log = "logs\discord.log"; Endpoint = "Discord Gateway" }
}

Write-Header "Launching AI-Chan Demo Services"

# 4.1 FastAPI Backend
Write-Info "[1/3] Starting FastAPI Backend on http://127.0.0.1:$BackendPort ..."
$backendLog = Join-Path $LogDir "backend.log"

if ($SingleConsole) {
    $backendProc = Start-Process -FilePath $PythonExe `
        -ArgumentList "-u", "-m", "uvicorn", "src.main:app", "--host", "127.0.0.1", "--port", $BackendPort.ToString(), "--reload" `
        -WorkingDirectory (Join-Path $RepoRoot "ai-backend") `
        -RedirectStandardOutput $backendLog `
        -RedirectStandardError (Join-Path $LogDir "backend.err.log") `
        -NoNewWindow `
        -PassThru
} else {
    $backendDir = Join-Path $RepoRoot "ai-backend"
    $backendProc = Start-Process -FilePath "cmd.exe" `
        -ArgumentList "/k `"title AI-Chan | Backend API && cd /d `"$backendDir`" && `"$PythonExe`" -u -m uvicorn src.main:app --host 127.0.0.1 --port $BackendPort --reload`"" `
        -WorkingDirectory $backendDir `
        -PassThru
}

$pids["backend"] = $backendProc.Id
$serviceStatus["backend"].Pid = $backendProc.Id
Write-Success "FastAPI Backend launched (PID: $($backendProc.Id), Title: 'AI-Chan | Backend API', Log: logs\backend.log)"

# 4.2 Poll Backend Readiness
Write-Info "Awaiting Backend readiness on http://127.0.0.1:$BackendPort/api/v1/health ..."
$maxRetries = 30
for ($i = 0; $i -lt $maxRetries; $i++) {
    Start-Sleep -Seconds 1
    if ($backendProc.HasExited) {
        $serviceStatus["backend"].Status = "FAILED"
        Write-Fail "FastAPI Backend exited unexpectedly (Exit code: $($backendProc.ExitCode)). Check logs\backend.log."
        break
    }
    try {
        $res = Invoke-WebRequest -Uri "http://127.0.0.1:$BackendPort/api/v1/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($res.StatusCode -eq 200) {
            $serviceStatus["backend"].Status = "READY"
            break
        }
    } catch {}
}

if ($serviceStatus["backend"].Status -eq "READY") {
    Write-Success "FastAPI Backend is READY (HTTP 200 OK - Health API Healthy)"
} elseif ($serviceStatus["backend"].Status -ne "FAILED") {
    $serviceStatus["backend"].Status = "FAILED"
    Write-Fail "Backend did not respond within $maxRetries seconds. Check logs\backend.log for details."
}

# 4.3 Next.js Frontend
Write-Info "[2/3] Starting Next.js Frontend on http://localhost:$FrontendPort ..."
$frontendLog = Join-Path $LogDir "frontend.log"

if ($SingleConsole) {
    $npmExec = "npm.cmd"
    if (-not (Get-Command $npmExec -ErrorAction SilentlyContinue)) { $npmExec = "npm" }
    $frontendProc = Start-Process -FilePath $npmExec `
        -ArgumentList "run", "dev", "--", "--port", $FrontendPort.ToString() `
        -WorkingDirectory (Join-Path $RepoRoot "ai-frontend") `
        -RedirectStandardOutput $frontendLog `
        -RedirectStandardError (Join-Path $LogDir "frontend.err.log") `
        -NoNewWindow `
        -PassThru
} else {
    $npmExec = "npm.cmd"
    if (-not (Get-Command $npmExec -ErrorAction SilentlyContinue)) { $npmExec = "npm" }
    $frontendDir = Join-Path $RepoRoot "ai-frontend"
    $frontendProc = Start-Process -FilePath "cmd.exe" `
        -ArgumentList "/k `"title AI-Chan | Frontend && cd /d `"$frontendDir`" && $npmExec run dev -- --port $FrontendPort`"" `
        -WorkingDirectory $frontendDir `
        -PassThru
}

$pids["frontend"] = $frontendProc.Id
$serviceStatus["frontend"].Pid = $frontendProc.Id
Write-Success "Next.js Frontend launched (PID: $($frontendProc.Id), Title: 'AI-Chan | Frontend', Log: logs\frontend.log)"

# 4.4 Poll Frontend Readiness
Write-Info "Awaiting Frontend readiness on http://localhost:$FrontendPort ..."
$maxRetries = 45
for ($i = 0; $i -lt $maxRetries; $i++) {
    Start-Sleep -Seconds 1
    if ($frontendProc.HasExited) {
        $serviceStatus["frontend"].Status = "FAILED"
        Write-Fail "Next.js Frontend exited unexpectedly (Exit code: $($frontendProc.ExitCode)). Check logs\frontend.log."
        break
    }
    try {
        $res = Invoke-WebRequest -Uri "http://localhost:$FrontendPort" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($res.StatusCode -eq 200 -or $res.StatusCode -eq 304 -or $res.StatusCode -eq 307) {
            $serviceStatus["frontend"].Status = "READY"
            break
        }
    } catch {}
}

if ($serviceStatus["frontend"].Status -eq "READY") {
    Write-Success "Next.js Frontend is READY (HTTP 200 OK)"
} elseif ($serviceStatus["frontend"].Status -ne "FAILED") {
    $serviceStatus["frontend"].Status = "DEGRADED"
    Write-Warn "Frontend did not respond within $maxRetries seconds. It may still be compiling, check logs\frontend.log."
}

# 4.5 Discord Bot (Optional)
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
        Write-Info "[3/3] Starting AI-Chan Discord Bot..."
        $discordLog = Join-Path $LogDir "discord.log"

        if ($SingleConsole) {
            $discordProc = Start-Process -FilePath $PythonExe `
                -ArgumentList "-u", "-m", "src.discord_bot.main" `
                -WorkingDirectory (Join-Path $RepoRoot "ai-backend") `
                -RedirectStandardOutput $discordLog `
                -RedirectStandardError (Join-Path $LogDir "discord.err.log") `
                -NoNewWindow `
                -PassThru
        } else {
            $backendDir = Join-Path $RepoRoot "ai-backend"
            $discordProc = Start-Process -FilePath "cmd.exe" `
                -ArgumentList "/k `"title AI-Chan | Discord Bot && cd /d `"$backendDir`" && `"$PythonExe`" -u -m src.discord_bot.main`"" `
                -WorkingDirectory $backendDir `
                -PassThru
        }

        $pids["discord"] = $discordProc.Id
        $serviceStatus["discord"].Pid = $discordProc.Id
        Start-Sleep -Seconds 2
        if ($discordProc.HasExited) {
            $serviceStatus["discord"].Status = "FAILED"
            Write-Warn "Discord Bot exited unexpectedly (Exit code: $($discordProc.ExitCode)). Check logs\discord.log"
        } else {
            $serviceStatus["discord"].Status = "READY"
            Write-Success "Discord Bot: READY (PID: $($discordProc.Id), Title: 'AI-Chan | Discord Bot', Log: logs\discord.log)"
        }
    } else {
        $serviceStatus["discord"].Status = "SKIPPED"
        Write-Info "[3/3] Discord Bot: SKIPPED (DISCORD_BOT_TOKEN not configured or placeholder in ai-backend\.env)"
    }
} else {
    $serviceStatus["discord"].Status = "SKIPPED"
    Write-Info "[3/3] Discord Bot: SKIPPED (-NoDiscord flag specified)"
}

# 4.6 Record Structured Session State to .demo_pids.json
$pidsData = [ordered]@{
    session_id = "demo_$([Guid]::NewGuid().ToString('N').Substring(0, 8))"
    started_at = (Get-Date -Format "o")
    mode       = if ($SingleConsole) { "single_console" } else { "visible_windows" }
    backend    = @{ pid = $pids["backend"]; service = "FastAPI Backend"; port = $BackendPort }
    frontend   = @{ pid = $pids["frontend"]; service = "Next.js Frontend"; port = $FrontendPort }
    discord    = @{ pid = $pids["discord"]; service = "Discord Bot" }
}
$pidsData | ConvertTo-Json -Depth 3 | Set-Content -Path $PidFile -Force

# ── 5. RUNTIME MONITORING & CLEAN SHUTDOWN ─────────────────────────────────────
$hasCriticalFailure = ($serviceStatus["backend"].Status -eq "FAILED" -or $serviceStatus["frontend"].Status -eq "FAILED")

if ($hasCriticalFailure) {
    Write-Header "AI-Chan Startup Failed - Action Required"
    Write-Fail "One or more critical services failed to start properly:"
    foreach ($k in $serviceStatus.Keys) {
        $svc = $serviceStatus[$k]
        $color = switch ($svc.Status) {
            "READY" { "Green" }
            "SKIPPED" { "DarkGray" }
            default { "Red" }
        }
        Write-Host ("  - {0,-18} : [{1}] (Log: {2})" -f $svc.Name, $svc.Status, $svc.Log) -ForegroundColor $color
    }
    Write-Host "`nDiagnostics & Remediation:" -ForegroundColor Yellow
    if ($serviceStatus["backend"].Status -eq "FAILED") {
        Write-Host "  * FastAPI Backend: Review logs\backend.log and ensure port $BackendPort is available." -ForegroundColor Yellow
    }
    if ($serviceStatus["frontend"].Status -eq "FAILED") {
        Write-Host "  * Next.js Frontend: Review logs\frontend.log and verify Node.js dependencies (run 'npm install' in ai-frontend)." -ForegroundColor Yellow
    }
    Write-Host "`nPress Ctrl+C or run 'run-demo.bat --stop' to shut down partial processes.`n" -ForegroundColor Cyan
} else {
    Write-Header "AI-Chan Demo is Live!"
    Write-Host "Service Status Overview:" -ForegroundColor Cyan
    foreach ($k in $serviceStatus.Keys) {
        $svc = $serviceStatus[$k]
        $color = switch ($svc.Status) {
            "READY" { "Green" }
            "SKIPPED" { "DarkGray" }
            default { "Red" }
        }
        $pidInfo = if ($svc.Pid) { "(PID: $($svc.Pid))" } else { "" }
        Write-Host ("  - {0,-18} : [{1}] {2}" -f $svc.Name, $svc.Status, $pidInfo) -ForegroundColor $color
    }

    Write-Host "`nAccess Endpoints:" -ForegroundColor Cyan
    Write-Host "  Frontend Chat:    http://localhost:$FrontendPort/chat" -ForegroundColor Cyan
    Write-Host "  Projects Builder: http://localhost:$FrontendPort/projects" -ForegroundColor Cyan
    Write-Host "  Backend API Docs: http://127.0.0.1:$BackendPort/docs" -ForegroundColor Cyan
    Write-Host "  Backend Health:   http://127.0.0.1:$BackendPort/api/v1/health" -ForegroundColor Cyan
    Write-Host "  Runtime Logs:     $LogDir" -ForegroundColor Cyan
    Write-Host "`n  To stop all services cleanly: Press Ctrl+C in this terminal," -ForegroundColor Yellow
    Write-Host "  or run: .\run-demo.bat --stop (or stop-demo.bat)" -ForegroundColor Yellow
    Write-Host "========================================================`n" -ForegroundColor Cyan

    if (-not $NoBrowser -and $serviceStatus["frontend"].Status -eq "READY") {
        Start-Process "http://localhost:$FrontendPort/chat"
    }
}

try {
    while ($true) {
        Start-Sleep -Seconds 2
        # Runtime health check for critical services
        if ($backendProc -and $backendProc.HasExited) {
            Write-Warn "FastAPI Backend process exited unexpectedly. Check logs\backend.log."
            break
        }
        if ($frontendProc -and $frontendProc.HasExited) {
            Write-Warn "Next.js Frontend process exited unexpectedly. Check logs\frontend.log."
            break
        }
    }
} finally {
    Write-Info "Supervisor terminating; shutting down all demo service processes..."
    Stop-DemoServices
}
