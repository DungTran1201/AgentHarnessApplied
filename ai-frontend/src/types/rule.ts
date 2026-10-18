export type RuleScope = 'system' | 'user' | 'project';
export type ActivationMode = 'always_on' | 'model_decision' | 'glob' | 'manual';
export type RuleActivationMode = ActivationMode; // Alias for compatibility
export type RuleStatus = 'active' | 'inactive' | 'archived';

export interface RuleAssociatedProject {
  id: string;
  name: string;
  status: string;
  is_enabled: boolean | number;
  bound_at: string;
}

export interface Rule {
  id: string;
  user_id?: string | null;
  name: string;
  description?: string | null;
  content: string;
  scope: RuleScope;
  activation_mode: ActivationMode;
  glob_patterns: string[];
  tags: string[];
  priority: number;
  status: RuleStatus;
  version: number;
  is_editable: boolean;
  is_system?: number;
  associated_projects_count: number;
  associated_projects?: RuleAssociatedProject[];
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export type RuleSummary = Rule;
export type RuleDetail = Rule & {
  bound_projects?: RuleAssociatedProject[];
};

export interface RuleCreatePayload {
  name: string;
  description?: string | null;
  content: string;
  activation_mode?: ActivationMode;
  glob_patterns?: string[];
  tags?: string[];
  priority?: number;
}

export interface RuleUpdatePayload {
  name: string;
  description?: string | null;
  content: string;
  activation_mode?: ActivationMode;
  glob_patterns?: string[];
  tags?: string[];
  priority?: number;
  status?: RuleStatus;
  version: number;
}

export interface RuleFilterParams {
  search?: string;
  scope?: string;
  activation_mode?: string;
  status?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedRuleResponse {
  items: Rule[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
