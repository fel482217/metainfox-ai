// Metainfox AI - Main Application
// Sistema de Gestión de Riesgos con Inteligencia Artificial

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/cloudflare-workers';
import type { HonoEnv } from './types';
import * as AI from './services/ai';

// Import routes
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';

// Import middleware
import { requireAuth, ensureTenantIsolation, auditLog, rateLimit, getAuth } from './middleware/auth';

const app = new Hono<HonoEnv>();

// Enable CORS for API routes
app.use('/api/*', cors());

// Serve static files from public directory
app.use('/static/*', serveStatic({ root: './public' }));

// ============================================================================
// AUTHENTICATION & AUTHORIZATION ROUTES
// ============================================================================

// Auth routes (public)
app.route('/api/auth', authRoutes);

// Admin routes (protected)
app.route('/api/admin', adminRoutes);

// ============================================================================
// API ROUTES - Dashboard & Analytics
// ============================================================================

// ============================================================================
// PROTECTED ROUTES - Require Authentication
// ============================================================================

// Apply auth + tenant isolation to all protected routes
app.use('/api/dashboard/*', requireAuth, ensureTenantIsolation, rateLimit(200))
app.use('/api/risks/*', requireAuth, ensureTenantIsolation, rateLimit(200))
app.use('/api/analyze', requireAuth, ensureTenantIsolation, rateLimit(50))
app.use('/api/chat', requireAuth, ensureTenantIsolation, rateLimit(100))

/**
 * GET /api/dashboard/stats
 * Obtiene estadísticas principales del dashboard
 */
app.get('/api/dashboard/stats', async (c) => {
  try {
    const db = c.env.DB;
    const auth = getAuth(c);
    if (!auth) return c.json({ error: 'No autorizado' }, 401);
    
    // Total de riesgos (filtered by organization)
    const totalRisks = await db.prepare(
      'SELECT COUNT(*) as count FROM risks WHERE organization_id = ?'
    ).bind(auth.organization.id).first<{ count: number }>();
    
    // Riesgos activos (open, investigating, mitigating)
    const activeRisks = await db.prepare(
      `SELECT COUNT(*) as count FROM risks 
       WHERE organization_id = ? AND status IN ('open', 'investigating', 'mitigating')`
    ).bind(auth.organization.id).first<{ count: number }>();
    
    // Riesgos críticos activos
    const criticalRisks = await db.prepare(
      `SELECT COUNT(*) as count FROM risks 
       WHERE organization_id = ? AND severity = 'critical' AND status != 'closed'`
    ).bind(auth.organization.id).first<{ count: number }>();
    
    // Tiempo promedio de respuesta (última semana)
    const responseTime = await db.prepare(`
      SELECT AVG(
        (julianday(COALESCE(resolved_at, CURRENT_TIMESTAMP)) - julianday(detected_at)) * 24
      ) as avg_hours
      FROM risks 
      WHERE organization_id = ? AND detected_at >= datetime('now', '-7 days')
    `).bind(auth.organization.id).first<{ avg_hours: number }>();
    
    // Costo evitado este mes
    const costSaved = await db.prepare(`
      SELECT COALESCE(SUM(cost_avoided), 0) as total
      FROM mitigation_actions
      WHERE organization_id = ? AND executed_at >= datetime('now', 'start of month')
    `).bind(auth.organization.id).first<{ total: number }>();
    
    // Amenazas mitigadas esta semana
    const threatsMitigated = await db.prepare(`
      SELECT COUNT(*) as count
      FROM risks
      WHERE organization_id = ? AND status IN ('resolved', 'closed') 
        AND resolved_at >= datetime('now', '-7 days')
    `).bind(auth.organization.id).first<{ count: number }>();
    
    // Score de riesgo global (promedio de riesgos activos)
    const riskScore = await db.prepare(`
      SELECT COALESCE(AVG(risk_score), 0) as avg_score
      FROM risks
      WHERE organization_id = ? AND status IN ('open', 'investigating', 'mitigating')
    `).bind(auth.organization.id).first<{ avg_score: number }>();
    
    return c.json({
      total_risks: totalRisks?.count || 0,
      active_risks: activeRisks?.count || 0,
      critical_risks: criticalRisks?.count || 0,
      avg_response_time: Math.round((responseTime?.avg_hours || 0) * 10) / 10,
      cost_saved_month: costSaved?.total || 0,
      threats_mitigated_week: threatsMitigated?.count || 0,
      risk_score: Math.round(riskScore?.avg_score || 0)
    });
    
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return c.json({ error: 'Failed to load dashboard stats' }, 500);
  }
});

/**
 * GET /api/risks
 * Lista todos los riesgos con filtros opcionales (multi-tenant)
 */
app.get('/api/risks', async (c) => {
  try {
    const db = c.env.DB;
    const auth = getAuth(c);
    if (!auth) return c.json({ error: 'No autorizado' }, 401);
    
    const { category, severity, status, limit = '50' } = c.req.query();
    
    let query = 'SELECT * FROM risks WHERE organization_id = ?';
    const params: any[] = [auth.organization.id];
    
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    
    if (severity) {
      query += ' AND severity = ?';
      params.push(severity);
    }
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY detected_at DESC LIMIT ?';
    params.push(parseInt(limit));
    
    const stmt = db.prepare(query).bind(...params);
    const { results } = await stmt.all();
    
    return c.json({ risks: results });
    
  } catch (error) {
    console.error('Get risks error:', error);
    return c.json({ error: 'Failed to load risks' }, 500);
  }
});

/**
 * GET /api/risks/:id
 * Obtiene detalles de un riesgo específico (multi-tenant)
 */
app.get('/api/risks/:id', async (c) => {
  try {
    const db = c.env.DB;
    const auth = getAuth(c);
    if (!auth) return c.json({ error: 'No autorizado' }, 401);
    
    const id = c.req.param('id');
    
    const risk = await db.prepare(
      'SELECT * FROM risks WHERE id = ? AND organization_id = ?'
    ).bind(id, auth.organization.id).first();
    
    if (!risk) {
      return c.json({ error: 'Risk not found' }, 404);
    }
    
    // Get related alerts
    const alerts = await db.prepare(
      'SELECT * FROM alerts WHERE risk_id = ? AND organization_id = ?'
    ).bind(id, auth.organization.id).all();
    
    // Get mitigation actions
    const actions = await db.prepare(
      'SELECT * FROM mitigation_actions WHERE risk_id = ? AND organization_id = ?'
    ).bind(id, auth.organization.id).all();
    
    return c.json({
      ...risk,
      alerts: alerts.results,
      actions: actions.results
    });
    
  } catch (error) {
    console.error('Get risk error:', error);
    return c.json({ error: 'Failed to load risk' }, 500);
  }
});

/**
 * POST /api/risks
 * Crea un nuevo riesgo (multi-tenant)
 */
app.post('/api/risks', async (c) => {
  try {
    const db = c.env.DB;
    const auth = getAuth(c);
    if (!auth) return c.json({ error: 'No autorizado' }, 401);
    
    const body = await c.req.json();
    
    const result = await db.prepare(`
      INSERT INTO risks (
        organization_id, created_by, category, severity, title, description, 
        source, source_url, impact_score, likelihood_score, ai_analysis, tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      auth.organization.id,
      auth.user.id,
      body.category,
      body.severity,
      body.title,
      body.description || null,
      body.source || 'manual',
      body.source_url || null,
      body.impact_score || 50,
      body.likelihood_score || 50,
      body.ai_analysis || null,
      body.tags || null
    ).run();
    
    // Audit log
    await db.prepare(`
      INSERT INTO audit_logs (organization_id, user_id, action, resource_type, resource_id, status)
      VALUES (?, ?, 'create_risk', 'risk', ?, 'success')
    `).bind(auth.organization.id, auth.user.id, result.meta.last_row_id).run();
    
    return c.json({ id: result.meta.last_row_id, message: 'Risk created' }, 201);
    
  } catch (error) {
    console.error('Create risk error:', error);
    return c.json({ error: 'Failed to create risk' }, 500);
  }
});

/**
 * POST /api/risks/:id/mitigate
 * Registra una acción de mitigación (multi-tenant)
 */
app.post('/api/risks/:id/mitigate', async (c) => {
  try {
    const db = c.env.DB;
    const auth = getAuth(c);
    if (!auth) return c.json({ error: 'No autorizado' }, 401);
    
    const id = c.req.param('id');
    const body = await c.req.json();
    
    // Verify risk belongs to organization
    const risk = await db.prepare(
      'SELECT id FROM risks WHERE id = ? AND organization_id = ?'
    ).bind(id, auth.organization.id).first();
    
    if (!risk) {
      return c.json({ error: 'Risk not found' }, 404);
    }
    
    // Insert mitigation action
    await db.prepare(`
      INSERT INTO mitigation_actions (
        organization_id, risk_id, action_type, action_description, executed_by
      ) VALUES (?, ?, ?, ?, ?)
    `).bind(
      auth.organization.id,
      id,
      body.action_type || 'mitigate',
      body.action,
      auth.user.full_name
    ).run();
    
    // Update risk status
    await db.prepare(`
      UPDATE risks SET status = 'mitigating', updated_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND organization_id = ?
    `).bind(id, auth.organization.id).run();
    
    return c.json({ message: 'Mitigation action recorded' });
    
  } catch (error) {
    console.error('Mitigate risk error:', error);
    return c.json({ error: 'Failed to record mitigation' }, 500);
  }
});

// ============================================================================
// API ROUTES - AI Services
// ============================================================================

/**
 * POST /api/analyze
 * Analiza un texto con IA para detectar riesgos
 */
app.post('/api/analyze', async (c) => {
  try {
    const apiKey = c.env.GROQ_API_KEY;
    if (!apiKey) {
      return c.json({ error: 'GROQ_API_KEY not configured' }, 500);
    }
    
    const body = await c.req.json();
    const { text, context } = body;
    
    if (!text) {
      return c.json({ error: 'Text is required' }, 400);
    }
    
    const analysis = await AI.analyzeRisk(apiKey, { text, context });
    
    return c.json(analysis);
    
  } catch (error) {
    console.error('Analyze error:', error);
    return c.json({ error: 'AI analysis failed' }, 500);
  }
});

/**
 * POST /api/chat
 * Chat interactivo con el asistente de IA
 */
app.post('/api/chat', async (c) => {
  try {
    const apiKey = c.env.GROQ_API_KEY;
    if (!apiKey) {
      return c.json({ error: 'GROQ_API_KEY not configured' }, 500);
    }
    
    const body = await c.req.json();
    const { message } = body;
    
    if (!message) {
      return c.json({ error: 'Message is required' }, 400);
    }
    
    // Get recent risks for context
    const db = c.env.DB;
    const recentRisks = await db.prepare(`
      SELECT category, severity, title, status 
      FROM risks 
      WHERE detected_at >= datetime('now', '-7 days')
      ORDER BY detected_at DESC 
      LIMIT 10
    `).all();
    
    const context = {
      recent_risks: recentRisks.results,
      active_risks_count: recentRisks.results.filter((r: any) => r.status === 'open').length
    };
    
    const response = await AI.chatWithAI(apiKey, message, context);
    
    return c.json({ response });
    
  } catch (error) {
    console.error('Chat error:', error);
    return c.json({ error: 'Chat failed' }, 500);
  }
});

/**
 * POST /api/report
 * Genera un reporte ejecutivo con IA
 */
app.post('/api/report', async (c) => {
  try {
    const apiKey = c.env.GROQ_API_KEY;
    if (!apiKey) {
      return c.json({ error: 'GROQ_API_KEY not configured' }, 500);
    }
    
    const db = c.env.DB;
    
    // Get critical and high risks
    const risks = await db.prepare(`
      SELECT * FROM risks 
      WHERE severity IN ('critical', 'high') 
        AND status IN ('open', 'investigating')
      ORDER BY risk_score DESC
      LIMIT 20
    `).all();
    
    const report = await AI.generateExecutiveReport(apiKey, risks.results);
    
    return c.json({ report });
    
  } catch (error) {
    console.error('Report error:', error);
    return c.json({ error: 'Report generation failed' }, 500);
  }
});

// ============================================================================
// FRONTEND ROUTES
// ============================================================================

/**
 * GET /login
 * Página de login/registro
 */
app.get('/login', (c) => {
  return c.redirect('/static/auth.html');
});

/**
 * GET /
 * Página principal del dashboard
 */
app.get('/', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Metainfox AI - Gestión de Riesgos con IA</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-gray-100">
    <!-- Header -->
    <header class="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
        <div class="container mx-auto px-6 py-4">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <i class="fas fa-shield-alt text-3xl"></i>
                    <div>
                        <h1 class="text-2xl font-bold">Metainfox AI</h1>
                        <p class="text-sm opacity-90">Sistema de Gestión de Riesgos con Inteligencia Artificial</p>
                    </div>
                </div>
                <div class="flex items-center gap-4">
                    <div class="text-right text-sm">
                        <p class="font-semibold" id="userName">Usuario</p>
                        <p class="text-xs opacity-75" id="orgName">Organización</p>
                    </div>
                    <button onclick="logout()" class="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg text-sm font-semibold transition">
                        <i class="fas fa-sign-out-alt mr-1"></i>
                        Salir
                    </button>
                </div>
            </div>
        </div>
    </header>

    <!-- Main Container -->
    <div class="container mx-auto px-6 py-8">
        <!-- Stats Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div class="bg-white rounded-lg shadow-md p-6">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-gray-600 text-sm">Score de Riesgo</span>
                    <i class="fas fa-gauge-high text-2xl text-blue-500"></i>
                </div>
                <p id="statRiskScore" class="text-3xl font-bold text-blue-600">--</p>
                <p class="text-xs text-gray-500 mt-1">General (0-100)</p>
            </div>
            
            <div class="bg-white rounded-lg shadow-md p-6">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-gray-600 text-sm">Riesgos Activos</span>
                    <i class="fas fa-exclamation-triangle text-2xl text-orange-500"></i>
                </div>
                <p id="statActiveRisks" class="text-3xl font-bold text-gray-800">--</p>
                <p class="text-xs text-gray-500 mt-1">De <span id="statTotalRisks">--</span> totales</p>
            </div>
            
            <div class="bg-white rounded-lg shadow-md p-6">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-gray-600 text-sm">Críticos</span>
                    <i class="fas fa-fire text-2xl text-red-500"></i>
                </div>
                <p id="statCriticalRisks" class="text-3xl font-bold text-red-600">--</p>
                <p class="text-xs text-gray-500 mt-1">Requieren atención</p>
            </div>
            
            <div class="bg-white rounded-lg shadow-md p-6">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-gray-600 text-sm">Tiempo Respuesta</span>
                    <i class="fas fa-clock text-2xl text-green-500"></i>
                </div>
                <p id="statResponseTime" class="text-3xl font-bold text-gray-800">--</p>
                <p class="text-xs text-gray-500 mt-1">Promedio (horas)</p>
            </div>
        </div>

        <!-- Secondary Stats -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div class="bg-white rounded-lg shadow-md p-6">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-gray-600">Costo Evitado (Este Mes)</span>
                    <i class="fas fa-dollar-sign text-2xl text-green-600"></i>
                </div>
                <p id="statCostSaved" class="text-3xl font-bold text-green-600">$--</p>
            </div>
            
            <div class="bg-white rounded-lg shadow-md p-6">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-gray-600">Amenazas Mitigadas (Esta Semana)</span>
                    <i class="fas fa-check-circle text-2xl text-blue-600"></i>
                </div>
                <p id="statThreatsMitigated" class="text-3xl font-bold text-blue-600">--</p>
            </div>
        </div>

        <!-- Tab Navigation -->
        <div class="flex gap-2 mb-6 overflow-x-auto">
            <button data-tab="risks" class="px-6 py-3 rounded-lg font-semibold bg-blue-600 text-white whitespace-nowrap">
                <i class="fas fa-list mr-2"></i>Riesgos
            </button>
            <button data-tab="analyze" class="px-6 py-3 rounded-lg font-semibold bg-gray-200 text-gray-700 whitespace-nowrap">
                <i class="fas fa-brain mr-2"></i>Analizar con IA
            </button>
            <button data-tab="chat" class="px-6 py-3 rounded-lg font-semibold bg-gray-200 text-gray-700 whitespace-nowrap">
                <i class="fas fa-comments mr-2"></i>Chat con IA
            </button>
        </div>

        <!-- Risks Tab -->
        <div data-content="risks" class="bg-white rounded-lg shadow-md p-6">
            <div class="flex items-center justify-between mb-6">
                <h2 class="text-xl font-bold text-gray-800">Lista de Riesgos</h2>
                <div class="flex gap-2">
                    <select id="filterCategory" class="px-3 py-2 border rounded-lg text-sm">
                        <option value="all">Todas las categorías</option>
                        <option value="cybersecurity">Ciberseguridad</option>
                        <option value="financial">Financiero</option>
                        <option value="operational">Operacional</option>
                        <option value="reputational">Reputacional</option>
                        <option value="regulatory">Regulatorio</option>
                        <option value="strategic">Estratégico</option>
                    </select>
                    <select id="filterSeverity" class="px-3 py-2 border rounded-lg text-sm">
                        <option value="all">Todas las severidades</option>
                        <option value="critical">Crítico</option>
                        <option value="high">Alto</option>
                        <option value="medium">Medio</option>
                        <option value="low">Bajo</option>
                    </select>
                </div>
            </div>
            <div id="risksList" class="space-y-4">
                <p class="text-gray-500 text-center py-8">Cargando riesgos...</p>
            </div>
        </div>

        <!-- Analyze Tab -->
        <div data-content="analyze" class="bg-white rounded-lg shadow-md p-6 hidden">
            <h2 class="text-xl font-bold text-gray-800 mb-4">
                <i class="fas fa-brain mr-2 text-purple-600"></i>Analizar Riesgo con IA
            </h2>
            <p class="text-gray-600 mb-4">Ingresa un texto para que la IA lo analice y determine el nivel de riesgo, categoría y recomendaciones.</p>
            
            <form id="analyzeForm">
                <textarea 
                    id="analyzeInput" 
                    class="w-full p-4 border rounded-lg mb-4 h-40" 
                    placeholder="Ejemplo: Detectamos 50 intentos de acceso fallidos desde una IP desconocida en las últimas 2 horas..."
                ></textarea>
                <button type="submit" class="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700">
                    <i class="fas fa-magic mr-2"></i>Analizar con IA
                </button>
            </form>
            
            <div id="analyzeResult" class="mt-6"></div>
        </div>

        <!-- Chat Tab -->
        <div data-content="chat" class="bg-white rounded-lg shadow-md p-6 hidden">
            <h2 class="text-xl font-bold text-gray-800 mb-4">
                <i class="fas fa-robot mr-2 text-green-600"></i>Asistente de IA
            </h2>
            <p class="text-gray-600 mb-4">Pregúntame sobre riesgos, tendencias, recomendaciones o cualquier análisis que necesites.</p>
            
            <div id="chatMessages" class="border rounded-lg p-4 h-96 overflow-y-auto mb-4 bg-gray-50 space-y-3">
                <div class="flex justify-start">
                    <div class="max-w-[80%] rounded-lg p-3 bg-gray-200 text-gray-900">
                        <p class="text-sm">¡Hola! Soy tu asistente de IA de Metainfox. ¿En qué puedo ayudarte hoy?</p>
                    </div>
                </div>
            </div>
            
            <form id="chatForm" class="flex gap-2">
                <input 
                    type="text" 
                    id="chatInput" 
                    class="flex-1 p-3 border rounded-lg" 
                    placeholder="Escribe tu pregunta..."
                    autocomplete="off"
                />
                <button type="submit" class="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </form>
        </div>
    </div>

    <!-- Footer -->
    <footer class="bg-gray-800 text-white py-6 mt-12">
        <div class="container mx-auto px-6 text-center">
            <p class="text-sm">© 2024 Metainfox AI - Sistema de Gestión de Riesgos con Inteligencia Artificial</p>
            <p class="text-xs text-gray-400 mt-2">República Dominicana • Chile • Colombia</p>
        </div>
    </footer>

    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
    <script src="/static/app.js"></script>
</body>
</html>
  `);
});

export default app;
