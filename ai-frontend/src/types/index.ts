import { AttachmentItem } from '@/services/attachmentService';
export type { AttachmentItem };

export type Role = 'user' | 'assistant' | 'system' | 'tool';

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  tokens?: number;
  model?: string;
  source?: 'WEB' | 'DISCORD';
  status?: 'pending' | 'streaming' | 'completed' | 'error';
  attachments?: AttachmentItem[];
}


export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface LLMProviderOption {
  id: string;
  name: string;
  provider: 'openai' | 'gemini' | 'anthropic' | 'ollama';
  modelId: string;
}

export interface AgentModel {
  id: string;
  name: string;
  provider: 'google' | 'anthropic' | 'openai' | 'groq' | 'ollama';
  status: 'ACTIVE' | 'INACTIVE' | 'DEGRADED' | 'ARCHIVED';
  is_default: boolean;
  context_window: number;
  max_tokens: number;
  supports_streaming: boolean;
  has_api_key: boolean;
  latency_ms: number | null;
  last_checked_at: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ModelSearchResponse {
  total: number;
  execution_time_ms: number;
  items: AgentModel[];
}

export interface UserQuotaStatus {
  user_id: string;
  daily_token_limit: number;
  daily_tokens_used: number;
  percent_used: number;
  warning_80: boolean;
  reset_at: string;
}

export interface MetricTrendPoint {
  time: string;
  latency_ms: number;
  ttft_ms: number;
  tokens: number;
}

export interface ResourceSummary {
  time_range: '1h' | '24h' | '7d' | '30d';
  total_requests: number;
  avg_latency_ms: number;
  avg_ttft_ms: number;
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
  status_counts: {
    '2xx': number;
    '4xx': number;
    '5xx': number;
  };
  tokens_by_provider: {
    google: number;
    openai: number;
    anthropic: number;
    other: number;
  };
  recent_trend: MetricTrendPoint[];
  quota_status: UserQuotaStatus;
}

export interface ApiMetricLogItem {
  id: string;
  user_id: string | null;
  endpoint: string;
  method: string;
  status_code: number;
  latency_ms: number;
  ttft_ms: number | null;
  model_name: string | null;
  provider: string | null;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  error_code: string | null;
  created_at: string;
}

export interface SSEMetricEvent {
  metric: ApiMetricLogItem;
  quota: {
    daily_tokens_used: number;
    daily_token_limit: number;
    percent_used: number;
    warning_80: boolean;
  };
}

export interface DiscordConnectionDetails {
  connected: boolean;
  discord_id: string | null;
  discord_username: string | null;
  avatar_url: string | null;
}

export interface UserConnectionsResponse {
  has_password: boolean;
  connections: {
    discord: DiscordConnectionDetails;
  };
}

export interface DiscordBotConfig {
  id: string;
  user_id: string;
  scope: 'USER_DM' | 'GUILD';
  guild_id: string | null;
  guild_name: string | null;
  channel_id: string | null;
  active_model_id: string | null;
  trigger_mode: 'MENTION' | 'PREFIX' | 'SLASH_COMMAND';
  custom_prefix: string;
  system_prompt: string;
  max_tokens_per_response: number;
  is_enabled: boolean;
  sync_to_web: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DiscordGuildItem {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: number;
  has_admin_rights: boolean;
  has_bot: boolean;
}

export interface DiscordBotTestDispatchResponse {
  success: boolean;
  query: string;
  reply: string;
  model_used: string;
  model_name: string;
  provider: string;
  is_fallback: boolean;
  latency_ms: number;
  tokens_used: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  remaining_quota: {
    daily_token_limit: number;
    daily_tokens_used: number;
    percent_used: number;
    reset_at: string;
  };
  web_synced: boolean;
  conversation_id: string | null;
}

// ==============================================================================
// PROJECT MANAGEMENT TYPES (PRJ-MVP)
// ==============================================================================

export type ProjectStatus = 'ACTIVE' | 'STOP' | 'DEACTIVE' | 'DELETED';

export type NodeType = 'web_input' | 'system_prompt' | 'model' | 'output' | 'bot' | 'skill';

export interface WebInputConfig {
  max_words: number;
}

export interface SystemPromptNodeConfig {
  prompt_id: string;
  name?: string;
  description?: string | null;
}

export interface ModelNodeConfig {
  model_id: string;
  temperature: number;
  max_tokens: number;
}

export interface OutputNodeConfig {
  streaming: boolean;
}

export interface BotNodeConfig {
  bot_id: string;
  bot_name?: string;
  platform?: string;
  is_enabled?: boolean;
  guild_name?: string;
  trigger_mode?: string;
}

export interface SkillNodeConfig {
  skill_id: string;
  skill_name?: string;
  description?: string;
  version?: string;
  capability?: string;
}

export interface AvailableBotItem {
  id: string;
  name: string;
  bot_username?: string;
  bot_id?: string;
  platform: string;
  is_enabled: boolean;
  guild_id: string;
  guild_name?: string;
  trigger_mode?: string;
  status?: string;
  description?: string;
}

export interface ManagedBotItem {
  id: string;
  name: string;
  bot_username: string;
  bot_id: string;
  platform: string;
  status: string;
  is_enabled: boolean;
  guild_id?: string;
  guild_name?: string;
  connected_guilds: string[];
  active_model_id?: string;
  bound_project_id?: string | null;
  bound_project_name?: string | null;
  trigger_mode: string;
  avatar?: string;
}

export interface BotProjectBinding {
  is_bound: boolean;
  is_active: boolean;
  bot?: {
    node_id: string;
    bot_id: string;
    name: string;
    server?: string;
  } | null;
  project: {
    id: string;
    name: string;
    description?: string | null;
    status: ProjectStatus;
    is_valid: boolean;
    updated_at?: string;
  } | null;
  model: {
    id: string;
    name: string;
    provider: string;
    status: string;
    temperature?: number;
    max_tokens?: number;
  } | null;
  system_prompt: {
    id: string;
    name: string;
  } | null;
  skills: Array<{
    id: string;
    name: string;
  }>;
  all_candidates?: Array<{
    id: string;
    name: string;
    status: ProjectStatus;
  }>;
  candidate_count?: number;
  message?: string;
}

export interface GraphNode {
  id: string;
  type: NodeType;
  position?: { x: number; y: number };
  data: {
    label: string;
    config: WebInputConfig | SystemPromptNodeConfig | ModelNodeConfig | OutputNodeConfig | BotNodeConfig | SkillNodeConfig | any;
  };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
}

export interface GraphData {
  viewport?: { x: number; y: number; zoom: number };
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface ProjectQuotaInfo {
  active_count: number;
  max_limit: number;
  remaining_slots: number;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  is_valid: boolean;
  target_model_id: string | null;
  max_words_limit: number;
  node_count: number;
  graph_data?: GraphData | null;
  last_validated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectListResponse {
  items: Project[];
  total: number;
  active_quota: ProjectQuotaInfo;
}

// ==============================================================================
// SYSTEM PROMPT MANAGEMENT (MVP) CONTRACTS
// ==============================================================================

export interface SystemPromptSummary {
  id: string;
  name: string;
  description: string | null;
  content_length: number;
  created_at: string;
  updated_at: string;
}

export interface SystemPromptDetail {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  content: string;
  attachments?: AttachmentItem[];
  created_at: string;
  updated_at: string;
}

export interface SystemPromptListResponse {
  items: SystemPromptSummary[];
  total: number;
}

export interface SystemPromptCreateRequest {
  name: string;
  description?: string | null;
  content: string;
}

export interface SystemPromptUpdateRequest {
  name: string;
  description?: string | null;
  content: string;
}

// ==============================================================================
// AGENT SKILLS MANAGEMENT (MVP) CONTRACTS
// ==============================================================================

export type SkillStatus = 'DRAFT' | 'VALID' | 'INVALID' | 'ARCHIVED';
export type SkillSourceType = 'USER_CREATED' | 'IMPORTED';

export interface FileTreeItem {
  path: string;
  category: 'ROOT_DOC' | 'SCRIPT' | 'REFERENCE' | 'ASSET';
  size_bytes: number;
  updated_at: number;
}

export interface ValidationErrorItem {
  code: string;
  field: string;
  message: string;
  severity: string;
  remediation: string;
}

export interface ValidationWarningItem {
  code: string;
  field: string;
  message: string;
  severity: string;
  remediation: string;
}

export interface SkillValidationReport {
  is_valid: boolean;
  status: string;
  metadata: Record<string, any>;
  body: string;
  errors: ValidationErrorItem[];
  warnings: ValidationWarningItem[];
}

export interface SkillSummary {
  id: string;
  name: string;
  description: string;
  status: SkillStatus;
  source_type: SkillSourceType;
  file_count: number;
  is_valid: boolean;
  created_at: string;
  updated_at: string;
}

export type Skill = SkillSummary;


export interface SkillDetail {
  id: string;
  user_id: string;
  name: string;
  description: string;
  license: string | null;
  compatibility: string | null;
  allowed_tools: string | null;
  metadata: Record<string, string>;
  raw_skill_md: string;
  status: SkillStatus;
  source_type: SkillSourceType;
  storage_path: string;
  is_valid: boolean;
  file_tree: FileTreeItem[];
  validation_report: SkillValidationReport;
  attachments?: AttachmentItem[];
  created_at: string;
  updated_at: string;
}

export interface SkillListResponse {
  items: SkillSummary[];
  total: number;
  limit: number;
  offset: number;
}

export interface SkillCreateRequest {
  name: string;
  description: string;
  license?: string | null;
  compatibility?: string | null;
  allowed_tools?: string | null;
  metadata?: Record<string, string> | null;
  content_markdown?: string;
  action?: 'ACTIVATE' | 'SAVE_DRAFT';
}

export interface SkillUpdateRequest {
  name: string;
  description: string;
  license?: string | null;
  compatibility?: string | null;
  allowed_tools?: string | null;
  metadata?: Record<string, string> | null;
  content_markdown?: string;
  raw_skill_md?: string | null;
  action?: 'ACTIVATE' | 'SAVE_DRAFT';
  expected_updated_at?: string | null;
}

