// Metainfox AI - Type Definitions

export type RiskCategory = 'cybersecurity' | 'financial' | 'operational' | 'reputational' | 'regulatory' | 'strategic';
export type RiskSeverity = 'critical' | 'high' | 'medium' | 'low';
export type RiskStatus = 'open' | 'investigating' | 'mitigating' | 'resolved' | 'closed' | 'false_positive';
export type AlertType = 'email' | 'webhook' | 'dashboard' | 'sms';
export type AlertPriority = 'urgent' | 'high' | 'normal' | 'low';

export interface Risk {
  id?: number;
  category: RiskCategory;
  severity: RiskSeverity;
  title: string;
  description?: string;
  source: string;
  source_url?: string;
  raw_data?: string;
  ai_analysis?: string;
  status: RiskStatus;
  assigned_to?: string;
  impact_score?: number;
  likelihood_score?: number;
  risk_score?: number;
  detected_at?: string;
  updated_at?: string;
  resolved_at?: string;
  tags?: string;
}

export interface Alert {
  id?: number;
  risk_id: number;
  alert_type: AlertType;
  priority: AlertPriority;
  recipients: string;
  message?: string;
  sent_at?: string;
  acknowledged?: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
}

export interface RiskPattern {
  id?: number;
  pattern_name: string;
  pattern_type: string;
  description?: string;
  indicators: string;
  confidence_score?: number;
  occurrences?: number;
  first_seen?: string;
  last_seen?: string;
  is_active?: boolean;
}

export interface MitigationAction {
  id?: number;
  risk_id: number;
  action_type: string;
  action_description: string;
  effectiveness_score?: number;
  cost_avoided?: number;
  resources_used?: string;
  executed_by?: string;
  executed_at?: string;
  verified_at?: string;
  notes?: string;
}

export interface CVEVulnerability {
  id?: number;
  cve_id: string;
  published_date?: string;
  last_modified_date?: string;
  cvss_score?: number;
  cvss_severity?: string;
  description?: string;
  affected_products?: string;
  references?: string;
  processed?: boolean;
  risk_id?: number;
  created_at?: string;
}

export interface NewsAnalysis {
  id?: number;
  title: string;
  content?: string;
  source?: string;
  url?: string;
  published_at?: string;
  sentiment_score?: number;
  relevance_score?: number;
  keywords?: string;
  entities?: string;
  risk_id?: number;
  analyzed_at?: string;
}

export interface Metric {
  id?: number;
  metric_type: string;
  metric_value: number;
  unit?: string;
  period_start: string;
  period_end: string;
  metadata?: string;
  recorded_at?: string;
}

export interface SystemConfig {
  key: string;
  value: string;
  description?: string;
  updated_at?: string;
}

// Dashboard types
export interface DashboardStats {
  total_risks: number;
  active_risks: number;
  critical_risks: number;
  avg_response_time: number;
  cost_saved_month: number;
  threats_mitigated_week: number;
  risk_score: number;
}

export interface RiskByCategory {
  category: RiskCategory;
  count: number;
  avg_severity: number;
}

export interface RiskTimeline {
  date: string;
  count: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

// AI Service types
export interface AIAnalysisRequest {
  text: string;
  context?: string;
  analysis_type?: 'risk' | 'sentiment' | 'classification' | 'summary';
}

export interface AIAnalysisResponse {
  analysis: string;
  confidence: number;
  category?: RiskCategory;
  severity?: RiskSeverity;
  keywords?: string[];
  sentiment?: number;
}

// Cloudflare bindings
export interface Bindings {
  DB: D1Database;
  GROQ_API_KEY?: string;
  NVD_API_KEY?: string;
  NEWS_API_KEY?: string;
}

export interface HonoEnv {
  Bindings: Bindings;
}
