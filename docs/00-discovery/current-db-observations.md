# Current Database Observations

Source: current project SQL snapshot supplied during discovery.

Observed domains:
- AI configuration: models, model_configs, system_prompts, tools, skills and mapping tables.
- Identity: users, password_resets.
- Discord: bots, bot_configs, guilds, channels, bot_channel_settings.
- External integration: project_mappings.
- Knowledge/memory: knowledge_bases, user_memories.
- Conversations/observability: chat_histories, performance_logs, system_logs.

Important design questions before locking architecture:
1. Are provider credentials bot-scoped, user-scoped, tenant-scoped, or provider-connection-scoped?
2. Can one bot use multiple providers/credentials and apply fallback routing?
3. Is an Agent a first-class domain object or only a composition of model/prompt/tools/skills?
4. What is the lifecycle of knowledge ingestion, indexing, retrieval, replacement and deletion?
5. What is the scope of memory: user, bot, channel, project, session, or conversation?
6. Who can manage bots, tools, skills, knowledge, project mappings and logs?
7. What are the Bot, Credential, Request/Conversation, and KnowledgeBase states?
8. What happens on provider timeout, quota exhaustion, tool failure, retry, cancellation and partial completion?
9. Which logs are operational, auditable, cost/billing related, or privacy-sensitive?
10. What is the credential encryption/key-management and rotation/revocation strategy?

Schema anomaly to investigate:
An index statement contains `[object Object]` as the index name and `null` as the indexed column. Treat it as a generation/export defect until proven otherwise.
