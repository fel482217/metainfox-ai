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
  return c.html(`<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Metainfox AI</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🛡️</text></svg>">
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen flex items-center justify-center p-4">
    
    <div class="max-w-md w-full">
        <!-- Logo & Title -->
        <div class="text-center mb-8">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white mb-4 shadow-lg">
                <i class="fas fa-shield-alt text-2xl"></i>
            </div>
            <h1 class="text-3xl font-bold text-gray-800">Metainfox AI</h1>
            <p class="text-gray-600 mt-2">Gestión Inteligente de Riesgos Empresariales</p>
        </div>

        <!-- Login/Register Card -->
        <div class="bg-white rounded-lg shadow-xl p-8">
            <!-- Tabs -->
            <div class="flex mb-6 bg-gray-100 rounded-lg p-1">
                <button id="loginTab" class="flex-1 py-2 text-center font-semibold rounded-md bg-white text-blue-600 shadow-sm transition">
                    Iniciar Sesión
                </button>
                <button id="registerTab" class="flex-1 py-2 text-center font-semibold rounded-md text-gray-600 transition hover:text-gray-800">
                    Registrarse
                </button>
            </div>

            <!-- Login Form -->
            <form id="loginForm" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                        <i class="fas fa-envelope text-gray-400 mr-1"></i>
                        Email
                    </label>
                    <input type="email" id="loginEmail" required
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                           placeholder="tu@empresa.com">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                        <i class="fas fa-lock text-gray-400 mr-1"></i>
                        Contraseña
                    </label>
                    <input type="password" id="loginPassword" required
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                           placeholder="••••••••">
                </div>
                
                <!-- Human Verification Badge -->
                <div class="flex items-center justify-between text-sm">
                    <label class="flex items-center cursor-pointer">
                        <input type="checkbox" id="loginHumanCheck" required class="mr-2 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500">
                        <span class="text-gray-700">No soy un robot</span>
                    </label>
                    <a href="#" class="text-blue-600 hover:text-blue-700 transition">¿Olvidaste tu contraseña?</a>
                </div>

                <button type="submit" id="loginButton"
                        class="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition flex items-center justify-center shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                    <i class="fas fa-sign-in-alt mr-2"></i>
                    Iniciar Sesión
                </button>
            </form>

            <!-- Register Form (hidden) -->
            <form id="registerForm" class="space-y-4 hidden">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                        <i class="fas fa-user text-gray-400 mr-1"></i>
                        Nombre Completo
                    </label>
                    <input type="text" id="registerFullName" required
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                           placeholder="Juan Pérez">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                        <i class="fas fa-envelope text-gray-400 mr-1"></i>
                        Email
                    </label>
                    <input type="email" id="registerEmail" required
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                           placeholder="tu@empresa.com">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                        <i class="fas fa-building text-gray-400 mr-1"></i>
                        Nombre de Organización
                    </label>
                    <input type="text" id="registerOrgName" required
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                           placeholder="Mi Empresa S.A.">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                        <i class="fas fa-lock text-gray-400 mr-1"></i>
                        Contraseña
                    </label>
                    <input type="password" id="registerPassword" required minlength="8"
                           class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                           placeholder="Mínimo 8 caracteres">
                    <div class="mt-1">
                        <div class="flex items-center text-xs text-gray-500">
                            <i class="fas fa-info-circle mr-1"></i>
                            La contraseña debe tener al menos 8 caracteres
                        </div>
                    </div>
                </div>
                
                <!-- Human Verification Badge -->
                <div class="flex items-center text-sm">
                    <label class="flex items-center cursor-pointer">
                        <input type="checkbox" id="registerHumanCheck" required class="mr-2 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500">
                        <span class="text-gray-700">No soy un robot</span>
                    </label>
                </div>

                <button type="submit" id="registerButton"
                        class="w-full bg-gradient-to-r from-green-600 to-teal-600 text-white font-semibold py-3 rounded-lg hover:from-green-700 hover:to-teal-700 transition flex items-center justify-center shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                    <i class="fas fa-user-plus mr-2"></i>
                    Crear Cuenta
                </button>
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                    <div class="flex items-start">
                        <i class="fas fa-gift text-blue-600 mt-1 mr-2"></i>
                        <p class="text-xs text-blue-800">
                            <strong>¡Prueba gratuita de 30 días!</strong><br>
                            Al registrarte obtienes acceso completo sin necesidad de tarjeta de crédito.
                        </p>
                    </div>
                </div>
            </form>

            <!-- Messages -->
            <div id="authMessage" class="mt-4 hidden">
                <div class="p-4 rounded-lg" id="authMessageContent"></div>
            </div>
        </div>

        <!-- Footer -->
        <div class="text-center mt-6 space-y-2">
            <p class="text-gray-600 text-sm">
                Protegido por verificación humana
            </p>
            <p class="text-gray-500 text-xs">
                &copy; 2024 Metainfox AI - Todos los derechos reservados
            </p>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
    <script>
        // Tab switching
        const loginTab = document.getElementById('loginTab');
        const registerTab = document.getElementById('registerTab');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');

        loginTab.addEventListener('click', () => {
            loginTab.classList.add('bg-white', 'text-blue-600', 'shadow-sm');
            loginTab.classList.remove('text-gray-600');
            registerTab.classList.remove('bg-white', 'text-blue-600', 'shadow-sm');
            registerTab.classList.add('text-gray-600');
            loginForm.classList.remove('hidden');
            registerForm.classList.add('hidden');
        });

        registerTab.addEventListener('click', () => {
            registerTab.classList.add('bg-white', 'text-blue-600', 'shadow-sm');
            registerTab.classList.remove('text-gray-600');
            loginTab.classList.remove('bg-white', 'text-blue-600', 'shadow-sm');
            loginTab.classList.add('text-gray-600');
            registerForm.classList.remove('hidden');
            loginForm.classList.add('hidden');
        });

        // Message display
        function showMessage(message, type = 'error') {
            const messageDiv = document.getElementById('authMessage');
            const messageContent = document.getElementById('authMessageContent');
            
            messageDiv.classList.remove('hidden');
            messageContent.className = \`p-4 rounded-lg \${type === 'error' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-green-100 text-green-700 border border-green-200'}\`;
            
            const icon = type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle';
            messageContent.innerHTML = \`<div class="flex items-center"><i class="fas \${icon} mr-2"></i>\${message}</div>\`;
            
            setTimeout(() => {
                messageDiv.classList.add('hidden');
            }, 5000);
        }

        // Simple human verification (checkbox)
        function verifyHuman(checkboxId, buttonId) {
            const checkbox = document.getElementById(checkboxId);
            const button = document.getElementById(buttonId);
            
            checkbox.addEventListener('change', () => {
                button.disabled = !checkbox.checked;
            });
            
            return checkbox.checked;
        }

        // Initialize verification for both forms
        verifyHuman('loginHumanCheck', 'loginButton');
        verifyHuman('registerHumanCheck', 'registerButton');

        // Initially disable buttons
        document.getElementById('loginButton').disabled = true;
        document.getElementById('registerButton').disabled = true;

        // Login form
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const humanCheck = document.getElementById('loginHumanCheck');
            if (!humanCheck.checked) {
                showMessage('Por favor verifica que no eres un robot', 'error');
                return;
            }
            
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const button = document.getElementById('loginButton');
            
            // Disable button during request
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Iniciando sesión...';
            
            try {
                const response = await axios.post('/api/auth/login', {
                    email,
                    password
                });
                
                if (response.data.success) {
                    // Store tokens
                    localStorage.setItem('access_token', response.data.access_token);
                    localStorage.setItem('refresh_token', response.data.refresh_token);
                    localStorage.setItem('user', JSON.stringify(response.data.user));
                    localStorage.setItem('organization', JSON.stringify(response.data.organization));
                    
                    showMessage('¡Inicio de sesión exitoso! Redirigiendo...', 'success');
                    
                    // Redirect to dashboard
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 1000);
                } else {
                    showMessage(response.data.message || 'Error al iniciar sesión', 'error');
                    button.disabled = false;
                    button.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i>Iniciar Sesión';
                }
            } catch (error) {
                console.error('Login error:', error);
                const message = error.response?.data?.error || 'Error al iniciar sesión. Por favor intenta de nuevo.';
                showMessage(message, 'error');
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i>Iniciar Sesión';
            }
        });

        // Register form
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const humanCheck = document.getElementById('registerHumanCheck');
            if (!humanCheck.checked) {
                showMessage('Por favor verifica que no eres un robot', 'error');
                return;
            }
            
            const full_name = document.getElementById('registerFullName').value;
            const email = document.getElementById('registerEmail').value;
            const organization_name = document.getElementById('registerOrgName').value;
            const password = document.getElementById('registerPassword').value;
            const button = document.getElementById('registerButton');
            
            // Disable button during request
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Creando cuenta...';
            
            try {
                const response = await axios.post('/api/auth/register', {
                    full_name,
                    email,
                    organization_name,
                    password
                });
                
                if (response.data.success) {
                    if (response.data.access_token) {
                        // Auto-login successful
                        localStorage.setItem('access_token', response.data.access_token);
                        localStorage.setItem('refresh_token', response.data.refresh_token);
                        localStorage.setItem('user', JSON.stringify(response.data.user));
                        localStorage.setItem('organization', JSON.stringify(response.data.organization));
                        
                        showMessage('¡Cuenta creada exitosamente! Redirigiendo...', 'success');
                        setTimeout(() => {
                            window.location.href = '/';
                        }, 1500);
                    } else {
                        showMessage('Cuenta creada exitosamente. Por favor inicia sesión.', 'success');
                        setTimeout(() => {
                            loginTab.click();
                            document.getElementById('loginEmail').value = email;
                        }, 1500);
                    }
                }
            } catch (error) {
                console.error('Register error:', error);
                const message = error.response?.data?.error || 'Error al registrar. Por favor intenta de nuevo.';
                showMessage(message, 'error');
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-user-plus mr-2"></i>Crear Cuenta';
            }
        });

        // Check if already logged in
        if (localStorage.getItem('access_token')) {
            window.location.href = '/';
        }

        // Add smooth animations
        document.addEventListener('DOMContentLoaded', () => {
            const card = document.querySelector('.max-w-md');
            if (card) {
                card.style.opacity = '0';
                setTimeout(() => {
                    card.style.transition = 'opacity 0.5s';
                    card.style.opacity = '1';
                }, 100);
            }
        });
    </script>
</body>
</html>`);
});

/**
 * GET /admin
 * Panel de administración (verificación de auth en cliente)
 * NOTA: El middleware requireAuth fue removido porque el frontend verifica
 * el token desde localStorage. El control de acceso por rol también se hace en cliente.
 */
app.get('/admin', (c) => {
  // Servir HTML directamente - la verificación se hace en el cliente
  // El script inline en <head> verifica localStorage.access_token
  // El frontend (admin.js) verifica el rol del usuario
  
  // Esta es una ruta pública que sirve HTML, pero el contenido solo es
  // accesible si el usuario tiene token válido y rol de admin
  
  // Código de "Acceso Denegado" removido - ahora se maneja en cliente
  const isAdminPlaceholder = true; // Siempre servir HTML, verificación en cliente
  if (!isAdminPlaceholder) {
    return c.html(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Acceso Denegado - Metainfox AI</title>
          <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-gray-100 flex items-center justify-center min-h-screen">
          <div class="bg-white rounded-lg shadow-xl p-8 max-w-md text-center">
              <i class="fas fa-ban text-6xl text-red-500 mb-4"></i>
              <h1 class="text-2xl font-bold text-gray-800 mb-2">Acceso Denegado</h1>
              <p class="text-gray-600 mb-6">No tienes permisos para acceder al panel de administración.</p>
              <a href="/" class="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition">
                  Volver al Dashboard
              </a>
          </div>
      </body>
      </html>
    `);
  }
  
  // Serve admin panel HTML
  return c.html(`
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Panel de Administración - Metainfox AI</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🛡️</text></svg>">
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-gray-50">
    
    <!-- CRITICAL: Check auth and admin role BEFORE rendering page -->
    <script>
      // Helper function to decode JWT token
      function decodeJWT(token) {
        try {
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));
          return JSON.parse(jsonPayload);
        } catch (e) {
          console.error('Error decoding JWT:', e);
          return null;
        }
      }
      
      // Immediately check authentication before page renders
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        // No token found, redirect immediately
        window.location.href = '/login';
      }
      
      // Decode JWT to get role (most reliable source)
      const jwtPayload = decodeJWT(accessToken);
      if (!jwtPayload || !jwtPayload.role) {
        console.warn('Invalid token or missing role in JWT. Forcing re-login...');
        localStorage.clear();
        window.location.href = '/login';
      }
      
      // Check if user has admin role from JWT (most reliable)
      const userRole = jwtPayload.role;
      const isAdmin = userRole === 'super_admin' || userRole === 'org_admin';
      
      console.log('JWT Role:', userRole, '| Is Admin:', isAdmin);
      
      // Also check localStorage user object and sync if needed
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          
          // If user object doesn't have role, update it from JWT
          if (!user.role && userRole) {
            console.warn('User object missing role. Updating from JWT...');
            user.role = userRole;
            localStorage.setItem('user', JSON.stringify(user));
          }
          
          const isAdminFromStorage = user.role === 'super_admin' || user.role === 'org_admin';
          
          // Use JWT role as source of truth
          if (!isAdmin) {
            // User is not admin, show access denied page immediately
            const roleDisplay = userRole ? userRole.replace('_', ' ') : 'desconocido';
            document.write(
              '<!DOCTYPE html>' +
              '<html lang="es">' +
              '<head>' +
                  '<meta charset="UTF-8">' +
                  '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
                  '<title>Acceso Denegado - Metainfox AI</title>' +
                  '<script src="https://cdn.tailwindcss.com"></script>' +
                  '<link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">' +
              '</head>' +
              '<body class="bg-gray-100 flex items-center justify-center min-h-screen">' +
                  '<div class="bg-white rounded-lg shadow-xl p-8 max-w-md text-center">' +
                      '<i class="fas fa-ban text-6xl text-red-500 mb-4"></i>' +
                      '<h1 class="text-2xl font-bold text-gray-800 mb-2">Acceso Denegado</h1>' +
                      '<p class="text-gray-600 mb-4">No tienes permisos para acceder al panel de administración.</p>' +
                      '<p class="text-sm text-gray-500 mb-6">Tu rol actual: <strong class="capitalize">' + roleDisplay + '</strong></p>' +
                      '<a href="/" class="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition">' +
                          '<i class="fas fa-arrow-left mr-2"></i>Volver al Dashboard' +
                      '</a>' +
                  '</div>' +
              '</body>' +
              '</html>'
            );
            document.close();
          }
        } catch (e) {
          console.error('Error parsing user data:', e);
          window.location.href = '/login';
        }
      } else {
        // No user data, redirect to login
        window.location.href = '/login';
      }
    </script>

    <!-- Header -->
    <header class="bg-white shadow-sm border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div class="flex justify-between items-center">
                <div class="flex items-center space-x-4">
                    <div class="flex items-center space-x-2">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center text-white">
                            <i class="fas fa-shield-alt"></i>
                        </div>
                        <div>
                            <h1 class="text-xl font-bold text-gray-800">Metainfox AI</h1>
                            <p class="text-xs text-gray-500">Panel de Administración</p>
                        </div>
                    </div>
                </div>
                
                <div class="flex items-center space-x-4">
                    <div class="text-right">
                        <div class="flex items-center space-x-2">
                            <span class="text-sm font-medium text-gray-700" id="userName">Cargando...</span>
                            <span class="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700 font-medium" id="userRole"></span>
                        </div>
                        <div class="text-xs text-gray-500" id="orgName">Cargando...</div>
                    </div>
                    
                    <div class="flex space-x-2">
                        <a href="/" class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium">
                            <i class="fas fa-home mr-1"></i> Dashboard
                        </a>
                        <button onclick="logout()" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium">
                            <i class="fas fa-sign-out-alt mr-1"></i> Salir
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Loading Overlay -->
        <div id="loadingOverlay" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style="display: none;">
            <div class="bg-white rounded-lg p-8 max-w-sm text-center">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p class="text-gray-700 font-medium">Cargando...</p>
            </div>
        </div>

        <!-- Admin Panel Container -->
        <div id="adminPanel">
            <div class="text-center py-12">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p class="text-gray-600">Cargando panel de administración...</p>
            </div>
        </div>
    </main>

    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
    <script src="/static/admin.js"></script>
    
    <script>
        // Global logout function
        function logout() {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
            localStorage.removeItem('organization');
            window.location.href = '/login';
        }
        
        // Initialize admin panel on page load
        document.addEventListener('DOMContentLoaded', async () => {
            try {
                // Load user info
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                const org = JSON.parse(localStorage.getItem('organization') || '{}');
                
                // Update header
                document.getElementById('userName').textContent = user.full_name || 'Usuario';
                document.getElementById('orgName').textContent = org.name || 'Organización';
                
                // Display user role badge
                const roleNames = {
                    'super_admin': 'Super Admin',
                    'org_admin': 'Admin',
                    'manager': 'Manager',
                    'member': 'Miembro',
                    'viewer': 'Observador'
                };
                document.getElementById('userRole').textContent = roleNames[user.role] || user.role;
                
                // Initialize admin panel (from admin.js)
                if (typeof initAdminPanel === 'function') {
                    await initAdminPanel();
                } else {
                    console.error('admin.js no cargado correctamente');
                    document.getElementById('adminPanel').innerHTML = \`
                        <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                            <i class="fas fa-exclamation-triangle text-red-500 text-3xl mb-3"></i>
                            <h3 class="text-lg font-semibold text-red-800 mb-2">Error al Cargar</h3>
                            <p class="text-red-600">No se pudo cargar el módulo de administración.</p>
                            <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                                Reintentar
                            </button>
                        </div>
                    \`;
                }
            } catch (error) {
                console.error('Error initializing admin panel:', error);
                document.getElementById('adminPanel').innerHTML = \`
                    <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                        <i class="fas fa-exclamation-triangle text-red-500 text-3xl mb-3"></i>
                        <h3 class="text-lg font-semibold text-red-800 mb-2">Error de Inicialización</h3>
                        <p class="text-red-600">\${error.message}</p>
                    </div>
                \`;
            }
        });
    </script>
</body>
</html>
  `);
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
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🛡️</text></svg>">
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <!-- CRITICAL: Check auth BEFORE rendering page -->
    <script>
      // Immediately check authentication before page renders
      if (!localStorage.getItem('access_token')) {
        // No token found, redirect immediately
        window.location.href = '/login';
      }
    </script>
</head>
<body class="bg-gray-100">
    <!-- Loading/Redirect Overlay (hidden by default, shown by JS if not authenticated) -->
    <div id="authCheckOverlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255,255,255,0.95); z-index: 9999; justify-content: center; align-items: center;">
        <div class="text-center">
            <i class="fas fa-circle-notch fa-spin text-6xl text-blue-600 mb-4"></i>
            <p class="text-xl text-gray-700">Verificando autenticación...</p>
        </div>
    </div>
    
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
                    <a href="/admin" class="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg text-sm font-semibold transition">
                        <i class="fas fa-cog mr-1"></i>
                        Admin
                    </a>
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
