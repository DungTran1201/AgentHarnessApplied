# Changelog

All notable changes to the AI-Chan desktop application and repository are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [v0.1.1] - 2026-10-19

### Fixed
- **API Key Settings Authentication & Fetch Loop**: Fixed an issue where opening **Settings → API Keys** in the packaged Windows application caused continuous screen flickering, repeated error toasts ("Please log in to authenticate" / "Chưa xác thực: Vui lòng đăng nhập để tiếp tục."), and network failure ("Failed to fetch").
- **Dynamic Runtime Reverse Proxy**: Replaced static Next.js build-time rewrites with a dynamic runtime Route Handler (`/api/[[...path]]`). The proxy resolves `process.env.INTERNAL_BACKEND_URL` on each request, ensuring API requests seamlessly target the dynamically allocated backend loopback port (e.g. 8000, 8001, 8002) when port collisions occur.
- **Cross-Origin Cookie Isolation**: Standardized API client services (`apiKeyService.ts`, `apiClient.ts`, `resourceService.ts`) to use relative same-origin paths (`/api/v1/...`). Added fallback `Authorization: Bearer <token>` header from local session storage.
- **Settings Render & Fetch Loop**: Memoized `showToast` in `SettingsPage` with `useCallback` to prevent reference churn across re-renders. Added in-flight request guards and unmount cancellation in `ApiKeysTab.tsx`.
- **UI Error State Classification**: Introduced explicit error states (`auth_error`, `network_error`, `server_error`, `forbidden`) in `ApiKeysTab.tsx` with dedicated "Log In Again" and "Retry Connection" action banners, replacing unhandled toast spam and flickering spinners.
- **Stable Application Secret Key**: Updated launcher supervisor to persist a stable 32-byte cryptographic `SECRET_KEY` in `%LOCALAPPDATA%\AI-Chan\data\.secret_key`, guaranteeing that JWT session tokens and AES-256-GCM encrypted provider API keys remain valid across application restarts and updates.

### Added
- Automated unit test suite (`src/tests/proxyRoute.test.ts`) covering dynamic backend forwarding, header/cookie forwarding, Set-Cookie propagation, HTTP 502 error handling, and open-proxy loopback enforcement.
- Automated integration test cases in `test_user_api_keys.py` for cookie auth, bearer header fallback, invalid cookie rejection, and session cookie lifecycle.
- User guide troubleshooting documentation in `GUIDE.md` for Settings API Keys and port collision diagnostics.
- Root cause diagnostics report in `docs/diagnostics/packaged-api-key-settings-root-cause.md`.

---

## [v0.1.0] - 2026-10-18

### Added
- Initial standalone Windows application release with Inno Setup installer (`AI-Chan-Setup.exe`).
- Python launcher process supervisor with system tray integration and auto-browser opening.
- Standalone Next.js 15 frontend with bundled Node.js runtime.
- Frozen PyInstaller FastAPI backend with SQLite persistence and automated schema migrations.
