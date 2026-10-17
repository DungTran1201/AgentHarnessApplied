/**
 * Tool Management Types & Interfaces
 * Matches backend contracts in src/services/tools/models.py
 */

export type ToolCategory =
  | 'FILE_DOCUMENT'
  | 'DATA'
  | 'WEB'
  | 'FAISS'
  | 'UTILITY';

export type ToolStatus =
  | 'AVAILABLE'
  | 'NEEDS_CONFIGURATION'
  | 'DEPENDENCY_MISSING'
  | 'DISABLED'
  | 'ERROR'
  | 'DEPRECATED'
  | 'NOT_SUPPORTED';

export type ToolRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ToolSummary {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  version: string;
  risk_level: ToolRiskLevel;
  status: ToolStatus;
  status_reason?: string | null;
  is_builtin: boolean;
  requires_auth: boolean;
  required_dependencies: string[];
  required_config_keys: string[];
  created_at?: string;
  updated_at?: string;
}

export interface ToolDetail extends ToolSummary {
  input_schema: Record<string, any>;
  output_schema: Record<string, any>;
  timeout_seconds: number;
  max_retries: number;
  concurrency_limit: number;
  side_effects: boolean;
  permissions_required: string[];
  tags: string[];
}

export interface ToolConfiguration {
  id: string;
  tool_id: string;
  scope: 'GLOBAL' | 'PROJECT' | 'USER';
  scope_id?: string | null;
  settings: Record<string, any>;
  credentials_masked: Record<string, string>;
  is_enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ToolListResponse {
  items: ToolSummary[];
  total: number;
  page: number;
  limit: number;
}

export interface ToolExecutionRecord {
  id: string;
  tool_id: string;
  project_id?: string | null;
  user_id?: string | null;
  status: 'SUCCEEDED' | 'FAILED' | 'BLOCKED' | 'TIMEOUT';
  execution_time_ms: number;
  error_message?: string | null;
  created_at: string;
}

export interface ToolExecutionsResponse {
  tool_id: string;
  total: number;
  executions: ToolExecutionRecord[];
}

export interface ToolTestResponse {
  tool_id: string;
  status: 'SUCCESS' | 'FAILED' | 'ERROR';
  message: string;
  execution_time_ms: number;
  details?: Record<string, any>;
}

export interface ProjectToolBinding {
  id: string;
  project_id: string;
  tool_id: string;
  is_enabled: boolean;
  custom_timeout_seconds?: number | null;
  created_at?: string;
  tool?: ToolSummary;
}

export interface SaveToolConfigRequest {
  settings?: Record<string, any>;
  credentials?: Record<string, string>;
  is_enabled?: boolean;
}
