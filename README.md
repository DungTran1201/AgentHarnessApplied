# AI-Chan

> **A Privacy-First Virtual AI Companion and Agent Workspace for Windows.**

AI-Chan is an intelligent, privacy-first local workspace that pairs modern large language models with an interactive 3D VRM companion, visual project canvases, modular skill libraries, and optional Discord integration.

AI-Chan runs as a **local website**: when launched, its services start securely in the background and the interface opens directly in your default web browser.

---

## Key Features

- **Interactive 3D Companion**: Integrated 3D avatar powered by Three.js and `@pixiv/three-vrm` with real-time expressions and animations.
- **Multi-Provider AI Support**: Connect your own API keys for Google Gemini, OpenAI, Anthropic Claude, Groq, or local Ollama models.
- **Visual Project Canvas**: Design AI agents and workflows visually by connecting Models, System Prompts, Agent Skills, Tools, and Rules.
- **Skills & Rules Catalog**: Manage custom instructions, system prompts, and reusable agent skills with full markdown import and export support.
- **Extensible Tool Execution**: Safe local tools including calculators, web search, local file handlers, and vector embeddings with SSRF guardrails.
- **Optional Discord Bot Gateway**: Manage and link Discord bot instances to specific AI-Chan projects directly from the settings interface.
- **100% Local Data & Privacy**: All chat history, project graphs, uploaded files, and encrypted credentials remain on your machine in SQLite.

---

## Documentation

For full step-by-step setup, usage, data management, and troubleshooting instructions, please read:

👉 **[AI-Chan User Guide (GUIDE.md)](GUIDE.md)**

---

## Windows Installation

### Option 1: Official Installer (Recommended for Users)

> [!NOTE]
> Pre-built Windows installer packages are published under [GitHub Releases](https://github.com/DungTran1201/ai-chan/releases). If you are building from source or testing a development branch before a formal release tag is published, see the Source Build instructions below.

1. Go to the [Releases](https://github.com/DungTran1201/ai-chan/releases) page.
2. Download the latest `AI-Chan-Setup.exe` installer.
3. Run the installer and follow the Windows setup wizard.
4. Launch **AI-Chan** from your Desktop shortcut or Start Menu.
5. Your default browser will automatically open to `http://127.0.0.1:3000`.

**No developer tools required**: The installer includes all necessary runtimes. You do not need to install Python, Node.js, Git, or Docker.

### Option 2: Running from Source (For Developers)

If you are developing or contributing to AI-Chan:
1. Ensure **Python 3.12+** and **Node.js 20+** are installed.
2. Clone this repository and run the preflight check:
   ```cmd
   run-demo.bat --check
   ```
3. Start local development services:
   ```cmd
   run-demo.bat
   ```
4. To build the standalone Windows installer from source, see [packaging/windows/README-build.md](packaging/windows/README-build.md).

---

## System Requirements

- **Operating System**: Windows 10 or Windows 11 (64-bit)
- **Web Browser**: Any modern browser (Google Chrome, Microsoft Edge, Mozilla Firefox, Brave)
- **Memory (RAM)**: Minimum 4 GB (8 GB recommended for 3D avatar rendering)
- **Disk Space**: ~350 MB free space for application files and local database
- **Internet Connection**: Required for external AI providers (Google Gemini, OpenAI, Anthropic, Groq) and optional Discord gateway. Not required if using a local Ollama instance.

---

## Privacy & Data Storage

- All user data, configuration, conversations, uploaded files, and SQLite databases are stored exclusively on your local computer under:
  ```text
  %LOCALAPPDATA%\AI-Chan
  ```
- Your AI provider API keys are encrypted at rest using local encryption keys and are never sent to third-party tracking servers.
- When you send messages to remote AI providers (e.g. Google Gemini, OpenAI), prompts are transmitted directly from your computer to that provider according to their API terms of service.

---

## Support & Troubleshooting

If you encounter issues during installation or runtime:
- Consult the [Troubleshooting Section in GUIDE.md](GUIDE.md#troubleshooting).
- Review runtime diagnostic logs located at `%LOCALAPPDATA%\AI-Chan\logs`.
- Report reproducible bugs on our [GitHub Issues](https://github.com/DungTran1201/ai-chan/issues) page.

---

## License

This project is licensed under the terms of the [MIT License](LICENSE).
