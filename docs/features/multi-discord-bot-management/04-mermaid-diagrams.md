# Multi-Discord Bot Management — Mermaid Diagrams Specification

This document provides formal, renderable Mermaid architecture and behavioral models for Multi-Discord Bot Management and Project Routing in AI-Chan.

---

## 1. Bot Management Use Case Diagram

```mermaid
flowchart TD
    User(["Authenticated Operator"])
    DiscordDev(["Discord Developer Portal"])
    Gateway(["Discord Gateway"])
    AIChan(["AI-Chan Bot Registry"])

    User -->|1. Generate Bot Token & Enable Intents| DiscordDev
    User -->|2. Register Bot with encrypted token| AIChan
    User -->|3. Test Token Connectivity| AIChan
    User -->|4. Link Bot to Project 1:1| AIChan
    User -->|5. Connect / Disconnect / Reconnect| AIChan
    AIChan -->|Test Credentials via REST /users/@me| DiscordDev
    AIChan -->|Launch Isolated Client Task| Gateway
    Gateway -->|Dispatch Slash Commands & Mentions| AIChan
```

---

## 2. Create Bot / Save Credential Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Operator as Web User / Frontend
    participant API as Backend API (/api/v1/bots)
    participant Service as BotService
    participant Vault as SecretVault (AES-256-GCM)
    participant DB as Database (discord_bot_configs)

    Operator->>API: POST /api/v1/bots {name, alias, token, project_id}
    Note over API: Authenticate user & verify Discord link (BR-031)
    API->>Service: create_bot(user_id, CreateBotRequest)
    Service->>DB: Check alias uniqueness for user
    DB-->>Service: Alias available
    Service->>Vault: encrypt_secret(raw_token)
    Vault->>Vault: Generate 96-bit random nonce & derive 256-bit key
    Vault-->>Service: token_ciphertext, mask="****1234"
    Service->>DB: INSERT INTO discord_bot_configs (id, user_id, name, alias, token_ciphertext, token_last4, status, project_id)
    DB-->>Service: OK
    Note over Service,API: Erase raw_token from memory
    Service-->>API: BotResponse (token_configured=true, token_last4="****1234")
    API-->>Operator: 201 Created (Safe metadata only, NO raw token)
```

---

## 3. Credential Encryption & Decryption Flow

```mermaid
flowchart TD
    subgraph Encryption ["Encryption on Bot Creation / Token Update"]
        RawToken["Plaintext Discord Bot Token"] --> HKDF["HKDF Key Derivation<br/>(AI_CHAN_SECRET_ENCRYPTION_KEY)"]
        HKDF --> Key["256-bit AES Master Key"]
        Nonce["96-bit Random Nonce"] --> AES_ENC["AES-256-GCM Encrypt"]
        Key --> AES_ENC
        RawToken --> AES_ENC
        AES_ENC --> Payload["Packed Payload: [Nonce (12B) + Tag (16B) + Ciphertext]"]
        Payload --> B64["Base64 Encoded Ciphertext"]
        B64 --> Storage[("Database Storage<br/>(token_ciphertext)")]
    end

    subgraph Decryption ["Decryption in Runtime Memory Only"]
        Storage --> B64Dec["Base64 Decode"]
        B64Dec --> Split["Extract Nonce + Tag + Ciphertext"]
        Key2["256-bit AES Master Key"] --> AES_DEC["AES-256-GCM Decrypt & Authenticate"]
        Split --> AES_DEC
        AES_DEC --> RuntimeMem["In-Memory Client Login<br/>(Never Logged / Never Saved)"]
    end
```

---

## 4. Bot Runtime Startup, Reconnect & Shutdown Lifecycle

```mermaid
flowchart TD
    Start([Operator Click / Startup]) --> CheckToken{Token Configured?}
    CheckToken -- No --> SetNotConfigured[Status: NOT_CONFIGURED]
    CheckToken -- Yes --> DecryptToken[Decrypt Token in Memory]
    DecryptToken --> CheckRunning{Already Running?}
    CheckRunning -- Yes --> ReturnRunning[Return Existing Runtime]
    CheckRunning -- No --> SpawnTask[Spawn Isolated asyncio.Task]
    SpawnTask --> SetConnecting[Status: CONNECTING]
    SetConnecting --> GatewayLogin[bot.start token]
    
    GatewayLogin --> OnReady[Event: on_ready]
    OnReady --> SetConnected[Status: CONNECTED & Ready<br/>Update last_connected_at]
    
    GatewayLogin -. Login Failure .-> InvalidCreds[Status: INVALID_CREDENTIALS<br/>Error: LOGIN_FAILURE]
    GatewayLogin -. Privileged Intents .-> IntentErr[Status: ERROR<br/>Error: PRIVILEGED_INTENTS_REQUIRED]
    GatewayLogin -. Gateway Timeout .-> Degraded[Status: DEGRADED<br/>Error: GATEWAY_ERROR]
    
    SetConnected --> DisconnectReq{Disconnect / Stop?}
    DisconnectReq -- Yes --> CloseBot[bot.close & task.cancel]
    CloseBot --> SetDisconnected[Status: DISCONNECTED]
```

---

## 5. Project ↔ Bot 1:1 Assignment Cardinality

```mermaid
erDiagram
    USERS ||--o{ DISCORD_BOT_CONFIGS : "owns (1:N)"
    USERS ||--o{ PROJECTS : "owns (1:N)"
    PROJECTS ||--o| DISCORD_BOT_CONFIGS : "linked to (1:1 strict constraint)"
    
    DISCORD_BOT_CONFIGS {
        string id PK
        string user_id FK
        string name
        string alias UK
        string token_ciphertext
        string token_last4
        string status
        string project_id FK "Unique / 1:1 constraint"
        timestamp last_connected_at
        string last_error_code
        string last_error_summary
    }

    PROJECTS {
        string id PK
        string user_id FK
        string name
        string status "ACTIVE | STOP | DEACTIVE"
        text graph_data
    }
```

---

## 6. Discord Message → Project Runtime → Response Route

```mermaid
sequenceDiagram
    autonumber
    actor DiscordUser as Discord Channel User
    participant Gateway as Discord Gateway
    participant Cog as AskCog (Bot Instance A)
    participant Backend as AI-Chan Backend (/api/v1/prompt)
    participant Router as Project Resolution Engine
    participant Graph as Project Alpha (Model + Rules + Skills)
    
    DiscordUser->>Gateway: /ask prompt: "Analyze telemetry"
    Gateway->>Cog: interaction received (Bot A)
    Cog->>Cog: Defer interaction (thinking indicator)
    Cog->>Backend: POST /api/v1/prompt {prompt, metadata: {bot_config_id: "bot_a", ...}}
    Backend->>Router: Lookup bot_config_id in discord_bot_configs
    Router->>Router: Fetch linked project_id ("proj_alpha")
    Note over Router: Enforce 1:1 route: message NEVER routes to Project Beta
    Router->>Backend: Verify Project Alpha is ACTIVE
    Backend->>Graph: Execute AI Turn (Gemini / Claude + Rules + Skills)
    Graph-->>Backend: Turn response tokens
    Backend-->>Cog: PromptResponse {response: "Telemetry results..."}
    Cog->>Gateway: interaction.followup.send (Embed on Channel)
    Gateway-->>DiscordUser: Delivered in originating Discord Channel
```

---

## 7. Bot Runtime State Machine

```mermaid
stateDiagram-v2
    [*] --> NOT_CONFIGURED : Bot created without token
    [*] --> DISCONNECTED : Bot created with encrypted token
    
    NOT_CONFIGURED --> DISCONNECTED : Token provided & saved
    
    DISCONNECTED --> CONNECTING : connect_bot() / startup
    CONNECTING --> CONNECTED : on_ready event dispatched
    CONNECTING --> INVALID_CREDENTIALS : 401 Unauthorized / Bad Token
    CONNECTING --> ERROR : Privileged Intents missing
    CONNECTING --> DEGRADED : Gateway not reachable / network error
    
    CONNECTED --> CONNECTING : Network reconnect / retry loop
    CONNECTED --> DISCONNECTED : disconnect_bot() / shutdown
    
    INVALID_CREDENTIALS --> CONNECTING : New token saved & connect
    DEGRADED --> CONNECTED : Gateway recovered
    ERROR --> CONNECTING : Configuration fixed & connect
```

---

## 8. Legacy `.env` Token Migration Flow

```mermaid
flowchart TD
    Startup([Application Startup / Bootstrap]) --> CheckEnv{DISCORD_BOT_TOKEN in .env?}
    CheckEnv -- No or Placeholder --> Skip[Skip Legacy Import]
    CheckEnv -- Valid String --> QueryExisting{Legacy bot already in DB?}
    
    QueryExisting -- Yes, Token Configured --> DoNothing[Idempotent: Keep Existing Record]
    QueryExisting -- Yes, Token Empty --> UpdateToken[Encrypt and Update token_ciphertext]
    QueryExisting -- No --> FindAdmin[Find First Admin or guest_user]
    
    FindAdmin --> Encrypt[AES-256-GCM Encrypt env token]
    Encrypt --> Mask[Compute token_last4]
    Mask --> Insert[INSERT into discord_bot_configs<br/>alias='legacy-default-bot']
    Insert --> LogSuccess[Log: Bootstrapped legacy DISCORD_BOT_TOKEN]
    UpdateToken --> LogSuccess
    DoNothing --> Finish([Bootstrap Finished])
    LogSuccess --> Finish
    Skip --> Finish
```

---

## 9. Error Handling, Rate Limits & Disconnected Bot Behavior

```mermaid
flowchart TD
    IncomingMsg["Incoming Discord Interaction"] --> CheckBotLinked{Bot linked to Project?}
    
    CheckBotLinked -- No --> RejectUnlinked["Reject with 400 Bad Request:<br/>'Bot is not linked to any Project. Please link in Bot Management.'"]
    RejectUnlinked --> ReplyDiscord["Reply with safe error embed to Discord channel"]
    
    CheckBotLinked -- Yes --> CheckProjActive{Is Project ACTIVE?}
    CheckProjActive -- No --> RejectInactive["Reject with 400 Bad Request:<br/>'Project is currently inactive (STOP). Activate before running bot.'"]
    RejectInactive --> ReplyDiscord
    
    CheckProjActive -- Yes --> InvokeGraph["Invoke Project Graph"]
    InvokeGraph --> CheckRateLimit{Discord 2000 char limit?}
    CheckRateLimit -- Yes --> SplitChunks["split_discord_message (Max 3900 in Embeds)"]
    CheckRateLimit -- No --> SendSingle["Send single response embed"]
    
    SplitChunks --> SendMulti["Send Part 1/N embed + follow-up embeds"]
    
    InvokeGraph -. Gateway Disconnect .-> RecordDegraded["Update Status: DEGRADED<br/>Log sanitized error"]
```
