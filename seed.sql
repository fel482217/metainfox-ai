-- Metainfox AI - Seed Data
-- Datos de prueba para demostración

-- Configuración del sistema
INSERT OR IGNORE INTO system_config (key, value, description) VALUES 
  ('ai_model', 'llama-3.1-70b-versatile', 'Modelo de IA principal para análisis'),
  ('ai_provider', 'groq', 'Proveedor de servicios de IA'),
  ('alert_threshold_critical', '85', 'Score mínimo para alertas críticas'),
  ('alert_threshold_high', '70', 'Score mínimo para alertas altas'),
  ('auto_analysis_enabled', 'true', 'Análisis automático de riesgos habilitado'),
  ('cve_feed_enabled', 'true', 'Feed de CVE habilitado'),
  ('news_monitoring_enabled', 'true', 'Monitoreo de noticias habilitado');

-- Riesgos de ejemplo (casos reales simulados)
INSERT OR IGNORE INTO risks (category, severity, title, description, source, source_url, impact_score, likelihood_score, status, ai_analysis, tags) VALUES 
  (
    'cybersecurity', 
    'critical', 
    'Vulnerabilidad crítica detectada en Apache Struts', 
    'Se ha detectado CVE-2024-12345 con score CVSS de 9.8. Afecta a todas las versiones anteriores a 2.5.33. Permite ejecución remota de código sin autenticación.',
    'cve',
    'https://nvd.nist.gov/vuln/detail/CVE-2024-12345',
    95,
    85,
    'open',
    '{"risk_type": "Remote Code Execution", "affected_systems": 12, "patch_available": true, "exploitation_detected": false, "recommendation": "Aplicar parche inmediatamente y monitorear logs de acceso"}',
    '["critical", "rce", "apache", "urgent"]'
  ),
  (
    'financial', 
    'high', 
    'Patrón de transacciones sospechosas detectado', 
    'El sistema de IA ha identificado 15 transacciones fuera del horario habitual con montos inusuales. Patrón similar a casos de fraude interno.',
    'ai_analysis',
    NULL,
    80,
    70,
    'investigating',
    '{"anomaly_score": 0.87, "affected_accounts": ["ACC-1234", "ACC-5678"], "total_amount": 125000, "time_pattern": "02:00-04:00 AM", "recommendation": "Congelar cuentas temporalmente y revisar logs de acceso"}',
    '["fraud", "anomaly", "financial"]'
  ),
  (
    'reputational', 
    'high', 
    'Incremento significativo en menciones negativas', 
    'Detectado aumento del 340% en menciones negativas en redes sociales relacionadas con el producto X. Sentimiento promedio: -0.72 (muy negativo).',
    'news',
    'https://twitter.com/search?q=companyname',
    70,
    90,
    'open',
    '{"sentiment_trend": "declining", "main_topics": ["calidad", "servicio", "garantia"], "reach": 45000, "influencers_involved": 3, "recommendation": "Activar protocolo de crisis de comunicación inmediatamente"}',
    '["social_media", "crisis", "pr"]'
  ),
  (
    'regulatory', 
    'medium', 
    'Nueva regulación GDPR actualizada', 
    'La UE ha publicado actualizaciones a GDPR que entran en vigor en 90 días. Requiere ajustes en políticas de retención de datos.',
    'news',
    'https://gdpr.eu/updates/2024',
    60,
    100,
    'open',
    '{"compliance_gap": "medium", "affected_processes": ["data_retention", "user_consent", "data_portability"], "estimated_effort": "80 hours", "deadline": "2024-03-15", "recommendation": "Iniciar revisión de políticas y actualizar sistemas"}',
    '["compliance", "gdpr", "legal"]'
  ),
  (
    'operational', 
    'low', 
    'Degradación de rendimiento en servidor DB-03', 
    'Monitoreo detectó incremento del 25% en latencia de base de datos. Capacidad al 78%. Sin impacto crítico aún.',
    'manual',
    NULL,
    40,
    60,
    'mitigating',
    '{"current_capacity": 78, "trend": "increasing", "estimated_full": "15 days", "recommendation": "Planificar escalado de recursos en próximos 7 días"}',
    '["performance", "infrastructure", "monitoring"]'
  ),
  (
    'cybersecurity', 
    'medium', 
    'Incremento en intentos de phishing', 
    'Detectados 47 correos de phishing en las últimas 24 horas. 3 usuarios casi comprometidos. Campaña dirigida detectada.',
    'email',
    NULL,
    65,
    75,
    'mitigating',
    '{"blocked_emails": 47, "near_misses": 3, "campaign_type": "credential_harvesting", "origin": "Eastern Europe", "recommendation": "Enviar alerta de seguridad a todos los usuarios y actualizar filtros"}',
    '["phishing", "email", "security_awareness"]'
  );

-- Alertas generadas
INSERT OR IGNORE INTO alerts (risk_id, alert_type, priority, recipients, message, acknowledged) VALUES 
  (1, 'email', 'urgent', '["security@company.com", "cto@company.com"]', 'Vulnerabilidad crítica CVE-2024-12345 requiere acción inmediata', FALSE),
  (1, 'webhook', 'urgent', '["https://slack.com/webhook/security-alerts"]', 'Critical: Apache Struts vulnerability detected', FALSE),
  (2, 'email', 'high', '["fraud@company.com", "cfo@company.com"]', 'Patrón de transacciones sospechosas requiere investigación', TRUE),
  (3, 'dashboard', 'high', '["pr@company.com", "marketing@company.com"]', 'Crisis reputacional en desarrollo - activar protocolo', FALSE);

-- Patrones de riesgo detectados por ML
INSERT OR IGNORE INTO risk_patterns (pattern_name, pattern_type, description, indicators, confidence_score, occurrences) VALUES 
  (
    'Transacciones fuera de horario',
    'anomaly',
    'Transacciones financieras en horarios inusuales (2AM-5AM) con montos superiores al promedio',
    '{"time_range": ["02:00", "05:00"], "amount_threshold": 10000, "frequency": "multiple", "accounts_pattern": "different"}',
    0.89,
    23
  ),
  (
    'Campaña de phishing dirigida',
    'trend',
    'Serie coordinada de correos de phishing con características similares',
    '{"email_similarity": 0.85, "time_clustering": true, "target_departments": ["finance", "hr"], "sender_pattern": "spoofed_executive"}',
    0.92,
    8
  ),
  (
    'Escalada de privilegios sospechosa',
    'anomaly',
    'Usuarios solicitando permisos fuera de sus roles habituales',
    '{"permission_level_jump": 2, "justification_weak": true, "timing": "end_of_day", "approval_rushed": true}',
    0.78,
    5
  );

-- Acciones de mitigación tomadas
INSERT OR IGNORE INTO mitigation_actions (risk_id, action_type, action_description, effectiveness_score, cost_avoided, executed_by) VALUES 
  (2, 'block', 'Cuentas sospechosas congeladas temporalmente. Iniciada revisión forense.', 85, 125000, 'Security Team'),
  (5, 'monitor', 'Configurado monitoreo intensivo de rendimiento. Planificado escalado de recursos.', 70, NULL, 'DevOps Team'),
  (6, 'escalate', 'Actualizado filtro anti-phishing. Enviada alerta de seguridad a toda la organización.', 80, NULL, 'Security Team');

-- CVE de ejemplo
INSERT OR IGNORE INTO cve_vulnerabilities (cve_id, published_date, cvss_score, cvss_severity, description, affected_products, processed, risk_id) VALUES 
  (
    'CVE-2024-12345',
    '2024-01-15 10:30:00',
    9.8,
    'CRITICAL',
    'Apache Struts remote code execution vulnerability allows unauthenticated attackers to execute arbitrary code on affected systems.',
    '["Apache Struts 2.5.0-2.5.32", "Apache Struts 2.3.x"]',
    TRUE,
    1
  ),
  (
    'CVE-2024-12346',
    '2024-01-14 08:15:00',
    7.5,
    'HIGH',
    'SQL injection vulnerability in popular CMS platform allows authenticated users to access sensitive database information.',
    '["WordPress Plugin XYZ < 3.2.1"]',
    FALSE,
    NULL
  );

-- Análisis de noticias
INSERT OR IGNORE INTO news_analysis (title, content, source, url, published_at, sentiment_score, relevance_score, keywords, risk_id) VALUES 
  (
    'Major Data Breach Affects Fortune 500 Company',
    'A significant security breach has compromised customer data...',
    'TechNews',
    'https://technews.com/breach-2024',
    '2024-01-15 14:20:00',
    -0.85,
    0.92,
    '["data breach", "security", "customer data", "ransomware"]',
    NULL
  ),
  (
    'New EU Regulations Impact Tech Industry',
    'European Union announces stricter data protection requirements...',
    'RegulatoryDaily',
    'https://regulatorydaily.com/eu-regs-2024',
    '2024-01-14 09:00:00',
    -0.15,
    0.88,
    '["gdpr", "compliance", "regulation", "data protection"]',
    4
  );

-- Métricas históricas
INSERT OR IGNORE INTO metrics (metric_type, metric_value, unit, period_start, period_end, metadata) VALUES 
  ('response_time', 2.5, 'hours', '2024-01-08 00:00:00', '2024-01-14 23:59:59', '{"target": 4.0, "improvement": 37.5}'),
  ('detection_accuracy', 94.5, 'percent', '2024-01-08 00:00:00', '2024-01-14 23:59:59', '{"false_positives": 12, "true_positives": 218}'),
  ('cost_saved', 342000, 'usd', '2024-01-01 00:00:00', '2024-01-14 23:59:59', '{"incidents_prevented": 8, "avg_cost_per_incident": 42750}'),
  ('threats_mitigated', 156, 'count', '2024-01-08 00:00:00', '2024-01-14 23:59:59', '{"critical": 3, "high": 18, "medium": 67, "low": 68}'),
  ('risk_score_avg', 42, 'score', '2024-01-14 00:00:00', '2024-01-14 23:59:59', '{"trend": "decreasing", "previous_week": 51}');
