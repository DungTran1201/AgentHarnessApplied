export type ApiKeySource = 'PERSONAL' | 'SYSTEM' | 'NONE';
export type ApiKeyValidationStatus = 'NOT_TESTED' | 'VALID' | 'INVALID' | 'ERROR';
export type ApiKeyCategory = 'LLM' | 'SEARCH';
export type TestedCredentialSource = 'CANDIDATE' | 'PERSONAL' | 'SYSTEM' | 'NONE';

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
  effective_source?: ApiKeySource;
  masked_hint: string;
  key_fingerprint?: string;
  has_personal_key: boolean;
  has_system_key: boolean;
  decryption_error?: boolean;
  validation_status: ApiKeyValidationStatus;
  last_validated_at?: string | null;
  last_error_summary?: string | null;
  updated_at?: string | null;
  requires_restart: boolean;
  routing_supported?: boolean;
}

export interface SetApiKeyRequest {
  api_key: string;
}

export interface SetApiKeyResponse {
  status: string;
  provider: string;
  source: ApiKeySource;
  effective_source?: ApiKeySource;
  masked_hint: string;
  key_fingerprint?: string;
  validation_status: ApiKeyValidationStatus;
  updated_at?: string;
  message: string;
}

export interface DeleteApiKeyResponse {
  status: string;
  provider: string;
  source: ApiKeySource;
  effective_source?: ApiKeySource;
  is_configured: boolean;
  masked_hint: string;
  key_fingerprint?: string;
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
  tested_source?: TestedCredentialSource;
  key_fingerprint?: string;
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
  provider?: string | null;
  restart_required: boolean;
  has_personal_override?: boolean;
  effective_source?: ApiKeySource;
  masked_hint?: string;
  key_fingerprint?: string;
  message: string;
}

export interface ProviderDiagnosticsResponse {
  provider: string;
  name: string;
  category: ApiKeyCategory;
  env_var: string;
  effective_source: ApiKeySource;
  is_configured: boolean;
  has_personal_key: boolean;
  has_system_key: boolean;
  masked_hint: string;
  key_fingerprint: string;
  decryption_error: boolean;
  error_message?: string | null;
  updated_at?: string | null;
  routing_supported: boolean;
  default_model?: string | null;
  precedence_contract: string;
}
