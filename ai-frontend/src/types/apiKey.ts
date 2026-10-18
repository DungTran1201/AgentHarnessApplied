export type ApiKeySource = 'PERSONAL' | 'SYSTEM' | 'NONE';
export type ApiKeyValidationStatus = 'NOT_TESTED' | 'VALID' | 'INVALID' | 'ERROR';
export type ApiKeyCategory = 'LLM' | 'SEARCH';

export interface ProviderKeyStatus {
  provider: string;
  name: string;
  category: ApiKeyCategory;
  env_var: string;
  description: string;
  doc_url: string;
  placeholder: string;
  is_secret: boolean;
  is_configured: boolean;
  source: ApiKeySource;
  masked_hint: string;
  has_personal_key: boolean;
  has_system_key: boolean;
  validation_status: ApiKeyValidationStatus;
  last_validated_at?: string | null;
  last_error_summary?: string | null;
  updated_at?: string | null;
  requires_restart: boolean;
}

export interface SetApiKeyRequest {
  api_key: string;
}

export interface SetApiKeyResponse {
  status: string;
  provider: string;
  source: ApiKeySource;
  masked_hint: string;
  validation_status: ApiKeyValidationStatus;
  message: string;
}

export interface DeleteApiKeyResponse {
  status: string;
  provider: string;
  source: ApiKeySource;
  is_configured: boolean;
  masked_hint: string;
  message: string;
}

export interface TestApiKeyRequest {
  candidate_key?: string;
}

export interface TestApiKeyResponse {
  healthy: boolean;
  provider: string;
  latency_ms: number;
  validation_status: ApiKeyValidationStatus;
  message: string;
  tested_at: string;
}

export interface UpdateSystemEnvRequest {
  env_var: string;
  value: string;
}

export interface UpdateSystemEnvResponse {
  status: string;
  env_var: string;
  restart_required: boolean;
  message: string;
}
