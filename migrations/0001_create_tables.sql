-- Metainfox AI - Create Tables

CREATE TABLE risks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  source TEXT NOT NULL,
  source_url TEXT,
  raw_data TEXT,
  ai_analysis TEXT,
  status TEXT DEFAULT 'open',
  assigned_to TEXT,
  impact_score INTEGER DEFAULT 50,
  likelihood_score INTEGER DEFAULT 50,
  risk_score INTEGER DEFAULT 25,
  detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME,
  tags TEXT
);

CREATE TABLE alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  risk_id INTEGER NOT NULL,
  alert_type TEXT NOT NULL,
  priority TEXT NOT NULL,
  recipients TEXT NOT NULL,
  message TEXT,
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  acknowledged INTEGER DEFAULT 0,
  acknowledged_by TEXT,
  acknowledged_at DATETIME
);

CREATE TABLE mitigation_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  risk_id INTEGER NOT NULL,
  action_type TEXT NOT NULL,
  action_description TEXT NOT NULL,
  effectiveness_score INTEGER,
  cost_avoided REAL,
  resources_used TEXT,
  executed_by TEXT,
  executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  verified_at DATETIME,
  notes TEXT
);

CREATE TABLE system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  metric_type TEXT NOT NULL,
  metric_value REAL NOT NULL,
  unit TEXT,
  period_start DATETIME NOT NULL,
  period_end DATETIME NOT NULL,
  metadata TEXT,
  recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_risks_category ON risks(category);
CREATE INDEX idx_risks_severity ON risks(severity);
CREATE INDEX idx_risks_status ON risks(status);
CREATE INDEX idx_risks_detected_at ON risks(detected_at);
CREATE INDEX idx_alerts_risk_id ON alerts(risk_id);
CREATE INDEX idx_mitigation_risk_id ON mitigation_actions(risk_id);
