/**
 * Metainfox AI - Authentication Routes
 * /api/auth/* endpoints
 */

import { Hono } from 'hono'
import type { D1Database } from '@cloudflare/workers-types'
import { login, refreshAccessToken, logout, hashPassword } from '../services/auth'
import { requireAuth, getAuth } from '../middleware/auth'
import { 
  strictAuthRateLimit, 
  resetAuthRateLimit, 
  botDetection, 
  validateEmail, 
  validatePassword,
  preventEnumeration,
  checkHoneypot,
  csrfProtection
} from '../middleware/security'

const authRoutes = new Hono()

// Apply security middleware to all auth routes
authRoutes.use('*', botDetection)
authRoutes.use('*', checkHoneypot)
authRoutes.use('*', csrfProtection)

// ============================================
// POST /api/auth/login
// ============================================
authRoutes.post('/login', strictAuthRateLimit(5, 300000), async (c) => {
  const delayResponse = await preventEnumeration(500)
  
  try {
    const body = await c.req.json()
    const { email, password, organization_slug } = body

    if (!email || !password) {
      await delayResponse()
      return c.json({ error: 'Email y contraseña requeridos' }, 400)
    }

    // Validate email format
    if (!validateEmail(email)) {
      await delayResponse()
      return c.json({ error: 'Formato de email inválido' }, 400)
    }

    const db = c.env.DB as D1Database
    const result = await login(db, email, password, organization_slug)

    if (!result.success) {
      await delayResponse()
      return c.json({ error: result.message }, 401)
    }

    // Reset rate limit on successful login
    resetAuthRateLimit(c)
    
    await delayResponse()
    return c.json({
      success: true,
      access_token: result.access_token,
      refresh_token: result.refresh_token,
      user: result.user,
      organization: result.organization
    })
  } catch (error) {
    console.error('Login error:', error)
    await delayResponse()
    return c.json({ error: 'Error en el servidor' }, 500)
  }
})

// ============================================
// POST /api/auth/refresh
// ============================================
authRoutes.post('/refresh', async (c) => {
  try {
    const body = await c.req.json()
    const { refresh_token } = body

    if (!refresh_token) {
      return c.json({ error: 'Refresh token requerido' }, 400)
    }

    const db = c.env.DB as D1Database
    const result = await refreshAccessToken(db, refresh_token)

    if (!result.success) {
      return c.json({ error: result.message }, 401)
    }

    return c.json({
      success: true,
      access_token: result.access_token
    })
  } catch (error) {
    console.error('Refresh error:', error)
    return c.json({ error: 'Error en el servidor' }, 500)
  }
})

// ============================================
// POST /api/auth/logout
// ============================================
authRoutes.post('/logout', requireAuth, async (c) => {
  try {
    const body = await c.req.json()
    const { refresh_token } = body

    if (!refresh_token) {
      return c.json({ error: 'Refresh token requerido' }, 400)
    }

    const db = c.env.DB as D1Database
    const success = await logout(db, refresh_token)

    if (!success) {
      return c.json({ error: 'Error al cerrar sesión' }, 500)
    }

    return c.json({ success: true, message: 'Sesión cerrada exitosamente' })
  } catch (error) {
    console.error('Logout error:', error)
    return c.json({ error: 'Error en el servidor' }, 500)
  }
})

// ============================================
// GET /api/auth/me
// ============================================
authRoutes.get('/me', requireAuth, async (c) => {
  try {
    const auth = getAuth(c)

    if (!auth) {
      return c.json({ error: 'No autorizado' }, 401)
    }

    return c.json({
      user: auth.user,
      organization: auth.organization,
      membership: auth.membership,
      permissions: auth.permissions
    })
  } catch (error) {
    console.error('Get me error:', error)
    return c.json({ error: 'Error en el servidor' }, 500)
  }
})

// ============================================
// POST /api/auth/register
// ============================================
authRoutes.post('/register', strictAuthRateLimit(3, 600000), async (c) => {
  const delayResponse = await preventEnumeration(500)
  
  try {
    const body = await c.req.json()
    const { email, password, full_name, organization_name } = body

    if (!email || !password || !full_name || !organization_name) {
      await delayResponse()
      return c.json({ 
        error: 'Email, contraseña, nombre completo y nombre de organización requeridos' 
      }, 400)
    }

    // Validate email format
    if (!validateEmail(email)) {
      await delayResponse()
      return c.json({ error: 'Formato de email inválido' }, 400)
    }

    // Validate password strength
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      await delayResponse()
      return c.json({ error: passwordValidation.message }, 400)
    }

    const db = c.env.DB as D1Database

    // Check if user exists
    const existingUser = await db
      .prepare('SELECT id FROM users WHERE email = ?')
      .bind(email)
      .first()

    if (existingUser) {
      await delayResponse()
      return c.json({ error: 'El email ya está registrado' }, 409)
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Create user
    const userResult = await db
      .prepare(`
        INSERT INTO users (email, password_hash, full_name, status, email_verified)
        VALUES (?, ?, ?, 'active', 0)
      `)
      .bind(email, passwordHash, full_name)
      .run()

    const userId = userResult.meta.last_row_id

    // Create organization slug
    const slug = organization_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    // Check if slug exists, add number if needed
    let finalSlug = slug
    let counter = 1
    while (true) {
      const existing = await db
        .prepare('SELECT id FROM organizations WHERE slug = ?')
        .bind(finalSlug)
        .first()
      
      if (!existing) break
      finalSlug = `${slug}-${counter++}`
    }

    // Create organization
    const orgResult = await db
      .prepare(`
        INSERT INTO organizations (
          name, slug, plan_type, plan_status, max_users, max_risks, created_by
        ) VALUES (?, ?, 'free', 'trial', 5, 100, ?)
      `)
      .bind(organization_name, finalSlug, userId)
      .run()

    const organizationId = orgResult.meta.last_row_id

    // Add user as org_admin
    await db
      .prepare(`
        INSERT INTO organization_members (
          organization_id, user_id, role, status, joined_at
        ) VALUES (?, ?, 'org_admin', 'active', CURRENT_TIMESTAMP)
      `)
      .bind(organizationId, userId)
      .run()

    // Set trial end date (30 days)
    await db
      .prepare(`
        UPDATE organizations 
        SET trial_ends_at = datetime('now', '+30 days')
        WHERE id = ?
      `)
      .bind(organizationId)
      .run()

    // Auto-login after registration
    const loginResult = await login(db, email, password)

    if (!loginResult.success) {
      await delayResponse()
      return c.json({ 
        success: true,
        message: 'Cuenta creada exitosamente, por favor inicia sesión' 
      })
    }

    // Reset rate limit on successful registration
    resetAuthRateLimit(c)
    
    await delayResponse()
    return c.json({
      success: true,
      message: 'Cuenta creada exitosamente',
      access_token: loginResult.access_token,
      refresh_token: loginResult.refresh_token,
      user: loginResult.user,
      organization: loginResult.organization
    }, 201)
  } catch (error) {
    console.error('Register error:', error)
    await delayResponse()
    return c.json({ error: 'Error en el servidor' }, 500)
  }
})

export default authRoutes
