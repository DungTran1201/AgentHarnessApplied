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

export type NodeType = 'web_input' | 'model' | 'output';

export interface WebInputConfig {
  max_words: number;
}

export interface ModelNodeConfig {
  model_id: string;
  temperature: number;
  max_tokens: number;
}

export interface OutputNodeConfig {
  streaming: boolean;
}

export interface GraphNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: {
    label: string;
    config: WebInputConfig | ModelNodeConfig | OutputNodeConfig | any;
  };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
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
