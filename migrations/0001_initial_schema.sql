-- Metainfox AI - Database Schema
-- Sistema de Gestión de Riesgos con IA

-- Tabla principal de riesgos detectados
CREATE TABLE IF NOT EXISTS risks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL CHECK(category IN ('cybersecurity', 'financial', 'operational', 'reputational', 'regulatory', 'strategic')),
  severity TEXT NOT NULL CHECK(severity IN ('critical', 'high', 'medium', 'low')),
  title TEXT NOT NULL,
  description TEXT,
  source TEXT NOT NULL, -- 'cve', 'nvd', 'news', 'email', 'manual', 'ai_analysis'
  source_url TEXT,
  raw_data TEXT, -- JSON string con datos originales
  ai_analysis TEXT, -- JSON string con análisis de IA
  status TEXT DEFAULT 'open' CHECK(status IN ('open', 'investigating', 'mitigating', 'resolved', 'closed', 'false_positive')),
  assigned_to TEXT,
  impact_score INTEGER CHECK(impact_score >= 0 AND impact_score <= 100),
  likelihood_score INTEGER CHECK(likelihood_score >= 0 AND likelihood_score <= 100),
  risk_score INTEGER GENERATED ALWAYS AS (CAST((impact_score * likelihood_score) / 100.0 AS INTEGER)) STORED,
  detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME,
  tags TEXT -- JSON array de tags
);

-- Tabla de alertas enviadas
CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  risk_id INTEGER NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK(alert_type IN ('email', 'webhook', 'dashboard', 'sms')),
  priority TEXT NOT NULL CHECK(priority IN ('urgent', 'high', 'normal', 'low')),
  recipients TEXT NOT NULL, -- JSON array de destinatarios
  message TEXT,
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by TEXT,
  acknowledged_at DATETIME
);

-- Tabla de patrones de riesgo detectados por ML
CREATE TABLE IF NOT EXISTS risk_patterns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pattern_name TEXT UNIQUE NOT NULL,
  pattern_type TEXT NOT NULL, -- 'anomaly', 'trend', 'correlation'
  description TEXT,
  indicators TEXT NOT NULL, -- JSON con indicadores del patrón
  confidence_score REAL CHECK(confidence_score >= 0 AND confidence_score <= 1),
  occurrences INTEGER DEFAULT 1,
  first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- Tabla de acciones de mitigación
CREATE TABLE IF NOT EXISTS mitigation_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  risk_id INTEGER NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'patch', 'block', 'monitor', 'escalate', 'accept'
  action_description TEXT NOT NULL,
  effectiveness_score INTEGER CHECK(effectiveness_score >= 0 AND effectiveness_score <= 100),
  cost_avoided REAL, -- en USD
  resources_used TEXT, -- JSON con recursos utilizados
  executed_by TEXT,
  executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  verified_at DATETIME,
  notes TEXT
);

-- Tabla de vulnerabilidades CVE
CREATE TABLE IF NOT EXISTS cve_vulnerabilities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cve_id TEXT UNIQUE NOT NULL, -- CVE-2024-XXXX
  published_date DATETIME,
  last_modified_date DATETIME,
  cvss_score REAL,
  cvss_severity TEXT,
  description TEXT,
  affected_products TEXT, -- JSON array
  references TEXT, -- JSON array de URLs
  processed BOOLEAN DEFAULT FALSE,
  risk_id INTEGER REFERENCES risks(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de análisis de noticias
CREATE TABLE IF NOT EXISTS news_analysis (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT,
  source TEXT,
  url TEXT UNIQUE,
  published_at DATETIME,
  sentiment_score REAL, -- -1 a 1 (negativo a positivo)
  relevance_score REAL, -- 0 a 1
  keywords TEXT, -- JSON array
  entities TEXT, -- JSON array de entidades extraídas
  risk_id INTEGER REFERENCES risks(id),
  analyzed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de métricas y KPIs
CREATE TABLE IF NOT EXISTS metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  metric_type TEXT NOT NULL, -- 'response_time', 'detection_accuracy', 'cost_saved', etc.
  metric_value REAL NOT NULL,
  unit TEXT, -- 'hours', 'usd', 'percent', 'count'
  period_start DATETIME NOT NULL,
  period_end DATETIME NOT NULL,
  metadata TEXT, -- JSON con información adicional
  recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de configuración del sistema
CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimización de consultas
CREATE INDEX IF NOT EXISTS idx_risks_category ON risks(category);
CREATE INDEX IF NOT EXISTS idx_risks_severity ON risks(severity);
CREATE INDEX IF NOT EXISTS idx_risks_status ON risks(status);
CREATE INDEX IF NOT EXISTS idx_risks_detected_at ON risks(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_risks_risk_score ON risks(risk_score DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_risk_id ON alerts(risk_id);
CREATE INDEX IF NOT EXISTS idx_alerts_sent_at ON alerts(sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_cve_cve_id ON cve_vulnerabilities(cve_id);
CREATE INDEX IF NOT EXISTS idx_cve_processed ON cve_vulnerabilities(processed);
CREATE INDEX IF NOT EXISTS idx_cve_cvss_score ON cve_vulnerabilities(cvss_score DESC);

CREATE INDEX IF NOT EXISTS idx_news_url ON news_analysis(url);
CREATE INDEX IF NOT EXISTS idx_news_published_at ON news_analysis(published_at DESC);

CREATE INDEX IF NOT EXISTS idx_mitigation_risk_id ON mitigation_actions(risk_id);
CREATE INDEX IF NOT EXISTS idx_mitigation_executed_at ON mitigation_actions(executed_at DESC);

-- Trigger para actualizar updated_at en risks
CREATE TRIGGER IF NOT EXISTS update_risks_timestamp 
AFTER UPDATE ON risks
BEGIN
  UPDATE risks SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
