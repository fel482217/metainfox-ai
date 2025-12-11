-- Metainfox AI - Seed Data Simplificado
-- Datos de prueba para demostración

-- Configuración del sistema
INSERT INTO system_config (key, value, description) VALUES 
  ('ai_model', 'llama-3.1-70b-versatile', 'Modelo de IA principal para análisis'),
  ('ai_provider', 'groq', 'Proveedor de servicios de IA'),
  ('alert_threshold_critical', '85', 'Score mínimo para alertas críticas'),
  ('auto_analysis_enabled', 'true', 'Análisis automático de riesgos habilitado');

-- Riesgos de ejemplo
INSERT INTO risks (category, severity, title, description, source, impact_score, likelihood_score, risk_score, status) VALUES 
  ('cybersecurity', 'critical', 'Vulnerabilidad crítica detectada en Apache Struts', 
   'Se ha detectado CVE-2024-12345 con score CVSS de 9.8. Permite ejecución remota de código.',
   'cve', 95, 85, 81, 'open'),
  
  ('financial', 'high', 'Patrón de transacciones sospechosas detectado', 
   'El sistema de IA ha identificado 15 transacciones fuera del horario habitual con montos inusuales.',
   'ai_analysis', 80, 70, 56, 'investigating'),
  
  ('reputational', 'high', 'Incremento significativo en menciones negativas', 
   'Detectado aumento del 340% en menciones negativas en redes sociales.',
   'news', 70, 90, 63, 'open'),
  
  ('regulatory', 'medium', 'Nueva regulación GDPR actualizada', 
   'La UE ha publicado actualizaciones a GDPR que entran en vigor en 90 días.',
   'news', 60, 100, 60, 'open'),
  
  ('operational', 'low', 'Degradación de rendimiento en servidor DB-03', 
   'Monitoreo detectó incremento del 25% en latencia de base de datos.',
   'manual', 40, 60, 24, 'mitigating'),
  
  ('cybersecurity', 'medium', 'Incremento en intentos de phishing', 
   'Detectados 47 correos de phishing en las últimas 24 horas.',
   'email', 65, 75, 49, 'mitigating');

-- Acciones de mitigación
INSERT INTO mitigation_actions (risk_id, action_type, action_description, effectiveness_score, cost_avoided, executed_by) VALUES 
  (2, 'block', 'Cuentas sospechosas congeladas temporalmente. Iniciada revisión forense.', 85, 125000, 'Security Team'),
  (5, 'monitor', 'Configurado monitoreo intensivo de rendimiento.', 70, NULL, 'DevOps Team'),
  (6, 'escalate', 'Actualizado filtro anti-phishing. Enviada alerta de seguridad.', 80, NULL, 'Security Team');

-- Métricas históricas
INSERT INTO metrics (metric_type, metric_value, unit, period_start, period_end) VALUES 
  ('response_time', 2.5, 'hours', '2024-01-08 00:00:00', '2024-01-14 23:59:59'),
  ('detection_accuracy', 94.5, 'percent', '2024-01-08 00:00:00', '2024-01-14 23:59:59'),
  ('cost_saved', 342000, 'usd', '2024-01-01 00:00:00', '2024-01-14 23:59:59'),
  ('threats_mitigated', 156, 'count', '2024-01-08 00:00:00', '2024-01-14 23:59:59');
