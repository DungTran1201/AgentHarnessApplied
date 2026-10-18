# AI-Chan User Guide

Welcome to **AI-Chan**! This guide explains how to install, configure, and use AI-Chan on Windows without technical jargon or terminal commands.

---

## Table of Contents

1. [About AI-Chan & Local Website Mode](#1-about-ai-chan--local-website-mode)
2. [Downloading & Installing AI-Chan](#2-downloading--installing-ai-chan)
3. [First Launch & Initial Setup](#3-first-launch--initial-setup)
4. [Configuring AI Providers & API Keys](#4-configuring-ai-providers--api-keys)
5. [Starting, Stopping, & Exiting AI-Chan](#5-starting-stopping--exiting-ai-chan)
6. [Core Features & How to Use Them](#6-core-features--how-to-use-them)
   - [Chat & 3D Companion](#chat--3d-companion)
   - [Projects & Visual Node Canvas](#projects--visual-node-canvas)
   - [System Prompts Library](#system-prompts-library)
   - [Agent Skills & External Catalog](#agent-skills--external-catalog)
   - [Rules Management](#rules-management)
   - [Tools & Capabilities](#tools--capabilities)
7. [Optional Discord Bot Integration](#7-optional-discord-bot-integration)
8. [Data Storage Locations & Security](#8-data-storage-locations--security)
9. [Backing Up & Restoring Your Data](#9-backing-up--restoring-your-data)
10. [Updating to Newer Versions](#10-updating-to-newer-versions)
11. [Uninstalling AI-Chan](#11-uninstalling-ai-chan)
12. [Troubleshooting Common Issues](#12-troubleshooting-common-issues)
13. [Privacy & Third-Party AI Services](#13-privacy--third-party-ai-services)

---

## 1. About AI-Chan & Local Website Mode

AI-Chan is an AI assistant and agent workspace that runs entirely on your own Windows computer.

Unlike typical cloud-only software or bulky Electron apps, AI-Chan uses a **Local Website Mode**:
- When you launch AI-Chan, a lightweight supervisor process starts two local services in the background:
  1. The **Backend API service** (handles data, SQLite database, and AI communication).
  2. The **Frontend Web service** (renders the user interface and 3D companion).
- Once both services are verified healthy, AI-Chan automatically opens the application interface inside your preferred web browser (e.g. Chrome, Edge, Firefox).
- All services bind strictly to loopback (`127.0.0.1`), meaning they are never exposed to other devices on your local Wi-Fi or local area network.
- You do **not** need to open a command prompt, install Python, Node.js, or Docker.

---

## 2. Downloading & Installing AI-Chan

1. Open your web browser and navigate to the official [AI-Chan GitHub Releases](https://github.com/DungTran1201/ai-chan/releases) page.
2. Under the latest release, download the installer executable: `AI-Chan-Setup.exe`.
3. Locate the downloaded file in your `Downloads` folder and double-click to open it.
   > **Note on Windows SmartScreen**: Because AI-Chan is open-source and distributed without an expensive commercial code-signing certificate, Windows Defender SmartScreen may display a prompt stating *"Windows protected your PC"*. Click **More info**, then click **Run anyway**.
4. Follow the setup wizard instructions:
   - Choose whether you want a Desktop icon created.
   - Choose your preferred installation directory (by default, AI-Chan installs into your user programs directory `{LOCALAPPDATA}\Programs\AI-Chan`, which requires no Administrator privileges).
5. Click **Install**. Once finished, check **Launch AI-Chan** and click **Finish**.

---

## 3. First Launch & Initial Setup

When AI-Chan launches for the first time:
1. The background supervisor automatically creates your personal data folders and sets up the local SQLite database.
2. Your default web browser will open to:
   ```text
   http://127.0.0.1:3000
   ```
3. You will see the AI-Chan interface with a navigation sidebar on the left and the interactive 3D VRM companion on the right.
4. By default, you can explore the application as a guest or create an account for personalized settings.

---

## 4. Configuring AI Providers & API Keys

To enable chat, agent reasoning, and interactive answers, you need to connect at least one AI provider. AI-Chan supports:
- **Google Gemini** (Recommended for speed and generous free tiers)
- **OpenAI** (GPT-4o, GPT-4o-mini)
- **Anthropic** (Claude 3.5 Sonnet, Claude 3.7 Sonnet)
- **Groq** (High-speed Llama 3 models)
- **Ollama** (Completely offline, locally-hosted models)

### Adding an API Key:
1. In the left navigation menu, click **Settings**.
2. Select the **API Keys & Integrations** tab.
3. Locate your preferred provider (e.g., Google Gemini).
4. Enter your API key obtained from the provider's developer console:
   - For Gemini: [Google AI Studio](https://aistudio.google.com/)
   - For OpenAI: [OpenAI Platform](https://platform.openai.com/api-keys)
   - For Anthropic: [Anthropic Console](https://console.anthropic.com/)
5. Click **Test Connection** to verify that your key is valid and can reach the provider.
6. Click **Save Key**. Your key is immediately encrypted and saved into your local database. It is never displayed in cleartext again.

> [!TIP]
> If you have [Ollama](https://ollama.com/) running on your computer, AI-Chan can communicate with it locally at `http://localhost:11434` without needing any API key or Internet connection!

---

## 5. Starting, Stopping, & Exiting AI-Chan

### Starting AI-Chan:
- Double-click the **AI-Chan** shortcut on your Desktop or Start Menu.
- If AI-Chan is already running, launching the shortcut simply brings your active browser tab into focus.

### System Tray Management:
When AI-Chan is active, a small icon appears in your **Windows System Tray** (near the clock in the bottom-right corner of your taskbar). Right-clicking this icon opens a quick menu:
- **Open AI-Chan Web**: Opens your active AI-Chan session in your browser.
- **Open Logs Folder**: Opens the Windows File Explorer directly to your diagnostic logs.
- **Open User Data Folder**: Opens your personal data and database folder.
- **Exit AI-Chan**: Safely shuts down all background services and removes temporary locks.

### Stopping AI-Chan via Command Line:
If you prefer keyboard shortcuts or scripts, you can cleanly stop all running AI-Chan services by opening PowerShell or CMD and running:
```cmd
"C:\Users\%USERNAME%\AppData\Local\Programs\AI-Chan\AI-Chan.exe" --stop
```

---

## 6. Core Features & How to Use Them

### Chat & 3D Companion
- Click **Chat** in the sidebar.
- Type any question or instruction into the message input.
- Watch your 3D VRM companion react with real-time expressions and animations as AI-Chan responds.
- You can attach images, text documents, or code files by clicking the upload paperclip icon.

### Projects & Visual Node Canvas
- Click **Projects** to create organized multi-turn workspaces.
- In the **Project Editor**, you can drag and connect nodes on an interactive visual canvas:
  - **Model Node**: Select which LLM provider and model to use.
  - **Prompt Node**: Attach custom system instructions or persona definitions.
  - **Skill Nodes**: Connect specialized capabilities (e.g., code reviewer, web researcher).
  - **Tool Nodes**: Bind executable capabilities like calculators or file parsers.
  - **Rule Nodes**: Enforce operational constraints or style requirements.

### System Prompts Library
- Click **Prompts** to manage custom personas, formatting templates, and domain-specific guidance.
- AI-Chan includes built-in expert prompts (e.g. Senior Python Architect, IT Business Analyst) and allows importing your own markdown prompt files.

### Agent Skills & External Catalog
- Click **Skills** to manage modular task instructions.
- Skills follow standard markdown structure (`SKILL.md`) with frontmatter metadata.
- Use the **External Skills Catalog** to browse, search, and import verified skills from community repositories directly into your local library.

### Rules Management
- Click **Rules** to define strict operational constraints (e.g., path traversal protections, privacy boundaries, formatting standards).
- Rules can be bound to specific projects or applied globally.

### Tools & Capabilities
- Click **Tools** to view available capabilities.
- Tools execute securely inside a local sandbox with strict SSRF (Server-Side Request Forgery) protection to prevent unauthorized local network scans.

---

## 7. Optional Discord Bot Integration

AI-Chan includes an optional Discord Gateway that allows you to chat with your configured AI-Chan projects directly from Discord servers or direct messages.

### Requirements:
- You must create a Bot application in the official [Discord Developer Portal](https://discord.com/developers/applications).
- You must generate a Bot Token and invite the bot to your Discord server with message permissions.

### Connecting Discord:
1. In the sidebar, navigate to **Bot Management**.
2. Click **Add Bot Config**.
3. Paste your official Bot Token.
4. Select which AI-Chan project the bot should route messages to.
5. Save and start the bot.

> [!WARNING]
> Never share your Discord Bot Token with anyone. AI-Chan encrypts the token at rest using an AES-256-GCM vault on your local machine.

---

## 8. Data Storage Locations & Security

AI-Chan follows strict Windows standards for separating software files from your personal data:

| Content | Location | Purpose |
| :--- | :--- | :--- |
| **Application Executables** | `%LOCALAPPDATA%\Programs\AI-Chan` | Software binaries, icons, web server files (read-only) |
| **Database (`ai_chan.db`)** | `%LOCALAPPDATA%\AI-Chan\data\` | Your conversations, projects, prompts, rules, keys |
| **Uploaded Files** | `%LOCALAPPDATA%\AI-Chan\uploads\` | Files attached in chat or project workflows |
| **Skills Storage** | `%LOCALAPPDATA%\AI-Chan\skills\` | Locally imported or authored agent skills |
| **Safety Backups** | `%LOCALAPPDATA%\AI-Chan\backups\` | Automatic database snapshots taken before upgrades |
| **Diagnostic Logs** | `%LOCALAPPDATA%\AI-Chan\logs\` | Rotated logs (`launcher.log`, `backend.log`, `frontend.log`) |

*(To navigate to these folders in Windows File Explorer, press `Win + R`, paste `%LOCALAPPDATA%\AI-Chan`, and press Enter).*

---

## 9. Backing Up & Restoring Your Data

Because AI-Chan stores everything in standard files and SQLite databases, backing up is simple:

### Creating a Backup:
1. Exit AI-Chan via the system tray icon to ensure no open write operations.
2. Open Windows File Explorer and navigate to `%LOCALAPPDATA%\AI-Chan`.
3. Copy the `data` and `uploads` folders to an external drive, USB stick, or your preferred backup location.

### Restoring from Backup:
1. Exit AI-Chan.
2. Copy your saved `data` and `uploads` folders back into `%LOCALAPPDATA%\AI-Chan`.
3. Start AI-Chan. Your projects, conversations, and settings will be restored.

---

## 10. Updating to Newer Versions

When a new version of AI-Chan is released:
1. Download the new `AI-Chan-Setup.exe` from GitHub Releases.
2. Run the installer. You do not need to uninstall the previous version.
3. The installer replaces only the program files in `%LOCALAPPDATA%\Programs\AI-Chan`.
4. On first launch after update, AI-Chan automatically:
   - Makes a timestamped safety backup of your database into `%LOCALAPPDATA%\AI-Chan\backups`.
   - Applies any new database schema migrations.
   - Preserves all your existing projects, prompts, chat history, and API keys.

---

## 11. Uninstalling AI-Chan

If you wish to remove AI-Chan from your computer:
1. Open Windows **Settings** > **Apps** > **Installed apps** (or Control Panel > Programs and Features).
2. Find **AI-Chan** in the list and click **Uninstall**.
3. The uninstaller will stop any running background services.
4. During uninstallation, a message box will ask:
   > *"Do you want to delete your personal projects, database, and uploaded data from this computer? Click 'No' to keep your data intact for future use or reinstalling."*
5. Choose **No** if you want to reinstall later without losing your conversations and settings, or choose **Yes** for a complete, clean removal.

---

## 12. Troubleshooting Common Issues

### 1. The browser opens to a "Cannot reach this page" or "Connection refused" error
- **Cause**: The background services are still initializing or encountered a startup error.
- **Solution**: Wait 5–10 seconds and refresh the browser page. If it still does not connect, check the Windows system tray to ensure AI-Chan is running. Inspect `%LOCALAPPDATA%\AI-Chan\logs\backend.log` for details.

### 2. Startup error message: "Port conflict detected"
- **Cause**: Another application is using default ports 3000 or 8000.
- **Solution**: AI-Chan automatically detects port conflicts and scans for the next available port. If an error persists, close competing local development servers or start AI-Chan with custom ports:
  ```cmd
  AI-Chan.exe --port 3050 --backend-port 8050
  ```

### 3. AI provider returns "Invalid API Key" or "Quota Exceeded"
- **Cause**: The key was typed incorrectly, lacks active billing, or has expired.
- **Solution**: Go to **Settings** > **API Keys & Integrations**, click **Test Connection**, and check your credit balance or permissions on the provider's developer console.

### 4. Discord bot stays offline
- **Cause**: The Discord token is invalid, or the required Gateway Privileged Intents (Message Content Intent) are not enabled in the Discord Developer Portal.
- **Solution**: Open the Discord Developer Portal, navigate to your Bot settings, ensure **Message Content Intent** is toggled ON, and regenerate your bot token.

### 5. Where can I find diagnostic logs?
- Press `Win + R`, paste:
  ```text
  %LOCALAPPDATA%\AI-Chan\logs
  ```
- The folder contains:
  - `launcher.log`: Supervisor and process lifecycle events.
  - `backend.log`: FastAPI and database logs.
  - `frontend.log`: Next.js web interface logs.

---

## 13. Privacy & Third-Party AI Services

- **Local Processing**: AI-Chan's interface, companion animations, database, and file storage run 100% locally on your machine.
- **Remote Providers**: When using remote AI providers (Google, OpenAI, Anthropic, Groq), the prompt text and attachments you send are transmitted over encrypted HTTPS directly to that provider's API. Those interactions are governed by each provider's individual privacy policy and terms of service.
- **No Telemetry / No Tracking**: AI-Chan does not transmit your personal data, queries, or telemetry to external tracking servers.
