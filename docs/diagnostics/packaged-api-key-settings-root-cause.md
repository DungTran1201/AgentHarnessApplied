# Root Cause Analysis: Packaged AI-Chan API Key Settings Auth/Fetch Loop

**Date**: 2026-10-19  
**Repository**: `DungTran1201/AgentHarnessApplied`  
**Status**: Investigated & Proven  

---

## 1. System Component Mapping (Gate 0 Audit)

- **Frontend Component**: 
  - `ai-frontend/src/app/(app)/settings/page.tsx` (manages profile retrieval, tab routing, and toast notifications).
  - `ai-frontend/src/components/settings/ApiKeysTab.tsx` (renders provider key statuses, handles editing, connection tests, and deletion).
- **Frontend API Client**:
  - `ai-frontend/src/services/apiKeyService.ts` (API methods for fetching, saving, testing, and deleting API keys).
  - Also `ai-frontend/src/services/apiClient.ts` and `ai-frontend/src/services/resourceService.ts` (which also used hardcoded `http://localhost:8000/api/v1`).
- **Backend Route Handlers**:
  - `ai-backend/src/api/v1/api_keys.py`:
    - `GET /settings/api-keys`: list user keys status.
    - `PUT /settings/api-keys/{provider}`: save/encrypt personal API key.
    - `DELETE /settings/api-keys/{provider}`: delete personal key.
    - `POST /settings/api-keys/{provider}/test`: test connection to provider.
    - `POST /settings/api-keys/system`: update global .env (admin).
  - All protected by `Depends(get_current_user)` from `src.core.security`.
- **Credential & Security Mechanism**:
  - `ai-backend/src/core/security.py`: `get_current_user` extracts `access_token` from HttpOnly Cookie; falls back to `Authorization: Bearer <token>`.
  - If token is missing, raises `HTTPException(401, detail="Chưa xác thực: Vui lòng đăng nhập để tiếp tục.")`.
  - `ai-backend/src/core/secret_vault.py`: Encrypts keys using AES-256-GCM via PBKDF2 derived from `SECRET_KEY`.
- **Packaged Startup & Runtime Flow**:
  - `packaging/windows/launcher/launcher.py`: Windowless process supervisor. Finds available loopback backend port (default 8000) and frontend port (default 3000). Launches backend subprocess (`ai-chan-backend.exe` or python uvicorn) with `HOST=127.0.0.1`, `PORT=<backend_port>`. Launches standalone frontend subprocess (`node.exe server.js`) with `PORT=<frontend_port>`, `HOSTNAME=127.0.0.1`, `INTERNAL_BACKEND_URL=http://127.0.0.1:<backend_port>/api/`.

---

## 2. Proven Root Causes

### A. Inlined Hardcoded Backend URL & Cross-Origin Cookie Isolation
In `ai-frontend/src/services/apiKeyService.ts`:
```typescript
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';
```
In Next.js, `NEXT_PUBLIC_*` environment variables are replaced **inline at build time** into static client JavaScript bundles. When the installer was built with `npm run build`, `process.env.NEXT_PUBLIC_API_BASE_URL` was undefined at build time, so webpack inlined `'http://localhost:8000/api/v1'`.

At runtime in packaged mode:
1. The user opens `http://127.0.0.1:3000` in their browser.
2. The user logs in via `POST /api/v1/auth/login`. The login request was proxied by Next.js, setting an HttpOnly `access_token` cookie on origin `http://127.0.0.1:3000`.
3. When the user navigates to **Settings -> API Keys**, `ApiKeyService.fetchApiKeys()` makes a direct request to:
   `http://localhost:8000/api/v1/settings/api-keys`
   with `{ credentials: 'include' }`.
4. Because `http://localhost:8000` is cross-origin from `http://127.0.0.1:3000` (both host mismatch `127.0.0.1` vs `localhost` and port mismatch `3000` vs `8000`), the browser does NOT send the `127.0.0.1:3000` session cookie to `localhost:8000`.
5. Backend `get_current_user` finds no cookie and no `Authorization` header, returning HTTP 401 with JSON:
   `{"detail": "Chưa xác thực: Vui lòng đăng nhập để tiếp tục."}` ("Please log in to continue").

### B. Port Mismatch / Collision ("Failed to fetch")
If port 8000 is occupied on the user's Windows machine, the launcher dynamically allocates port 8001 or 8002 for the backend.
However:
1. Client bundle makes requests directly to `http://localhost:8000`. Port 8000 is not listening or is occupied by an unrelated service.
2. The browser request fails immediately with `ERR_CONNECTION_REFUSED`.
3. JavaScript `fetch()` throws `TypeError: Failed to fetch`.

### C. Build-Time Next.js Rewrites vs. Standalone Runtime
`ai-frontend/next.config.mjs` declared:
```javascript
async rewrites() {
  return [
    {
      source: '/api/:path*',
      destination: process.env.INTERNAL_BACKEND_URL || 'http://127.0.0.1:8000/api/:path*',
    },
  ];
}
```
In Next.js `output: 'standalone'` mode, `rewrites` are compiled at build time into `.next/routes-manifest.json`:
```json
{
  "source": "/api/:path*",
  "destination": "http://127.0.0.1:8000/api/:path*"
}
```
When `server.js` starts, it reads `routes-manifest.json`. Supplying `INTERNAL_BACKEND_URL` in the environment of `node.exe server.js` does NOT alter precompiled rewrites in `routes-manifest.json`.

### D. Settings Rerender & Fetch Loop (Flicker)
In `ai-frontend/src/app/(app)/settings/page.tsx`:
```typescript
const showToast = (type: 'success' | 'error', message: string) => {
  setToast({ type, message });
  setTimeout(() => setToast(null), 4000);
};
```
`showToast` was an unmemoized arrow function recreated on every render of `SettingsPage`.

In `ai-frontend/src/components/settings/ApiKeysTab.tsx`:
```typescript
const loadKeys = useCallback(async () => {
  try {
    setLoading(true);
    const data = await ApiKeyService.fetchApiKeys();
    setKeys(data);
  } catch (err: any) {
    showToast('error', err.message || 'Không thể tải danh sách API Keys.');
  } finally {
    setLoading(false);
  }
}, [showToast]);

useEffect(() => {
  loadKeys();
}, [loadKeys]);
```
Flow of the infinite loop:
1. `ApiKeysTab` mounts and calls `loadKeys()`.
2. `ApiKeyService.fetchApiKeys()` throws an error (401 "Chưa xác thực..." or "Failed to fetch").
3. `catch` block invokes `showToast('error', ...)`.
4. `showToast` updates state in `SettingsPage` (`setToast`), triggering a re-render of `SettingsPage`.
5. Re-render of `SettingsPage` creates a new function reference for `showToast`.
6. Because `showToast` is in `loadKeys` dependencies, `useCallback` returns a new function instance of `loadKeys`.
7. `useEffect` detects `loadKeys` changed and executes `loadKeys()` again.
8. `setLoading(true)` unmounts the key list and renders the spinner (the visible flicker).
9. The cycle repeats indefinitely, flooding the browser and UI.

---

## 3. Architecture for Fix

1. **Unified Same-Origin API Routing**:
   - Create a dynamic Next.js runtime catch-all Route Handler at `ai-frontend/src/app/api/[...path]/route.ts`.
   - The route handler reads `process.env.INTERNAL_BACKEND_URL` (or `http://127.0.0.1:<backend_port>/api/`) dynamically on every request at runtime.
   - Forwards request method, path, query, headers (including `cookie` and `authorization`), and request body.
   - Forwards response status, headers (including `set-cookie`), and response body (streaming).
   - Prevents open-proxy behavior by restricting forwarded targets to the configured local backend loopback.
   - Remove static `rewrites` from `next.config.mjs` to avoid conflicting routing.
2. **Same-Origin Relative Frontend Client**:
   - Standardize `BASE_URL` in `apiKeyService.ts`, `apiClient.ts`, and `resourceService.ts` to `process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1'`.
   - In `apiKeyService.ts`, send both `credentials: 'include'` and fallback `Authorization: Bearer <token>` from `localStorage.getItem('ai_chan_token')`.
3. **Memoization & Loop Prevention**:
   - Wrap `showToast` in `useCallback` in `SettingsPage`.
   - In `ApiKeysTab.tsx`, add an `AbortController` to cancel in-flight requests on unmount.
   - Guard against re-entrant fetches while a request is already in-flight.
   - Implement explicit error states: `ready`, `loading`, `auth_error` (401), `network_error` (Failed to fetch), `server_error` (500).
   - Render clean inline error banners with "Retry" or "Log In" actions instead of relying solely on repetitive toasts.
4. **Stable Packaging Secret Key**:
   - Ensure `launcher.py` generates and persists a 32-byte secret key in `%LOCALAPPDATA%\AI-Chan\data\.secret_key` if not already present, ensuring consistent JWT and encryption keys across restarts and updates.
