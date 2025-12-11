/**
 * Metainfox AI - Authentication Routes
 * /api/auth/* endpoints
 */

import { Hono } from 'hono'
import type { D1Database } from '@cloudflare/workers-types'
import { login, refreshAccessToken, logout, hashPassword } from '../services/auth'
import { requireAuth, getAuth } from '../middleware/auth'

const authRoutes = new Hono()

// ============================================
// POST /api/auth/login
// ============================================
authRoutes.post('/login', async (c) => {
  try {
    const body = await c.req.json()
    const { email, password, organization_slug } = body

    if (!email || !password) {
      return c.json({ error: 'Email y contraseña requeridos' }, 400)
    }

    const db = c.env.DB as D1Database
    const result = await login(db, email, password, organization_slug)

    if (!result.success) {
      return c.json({ error: result.message }, 401)
    }

    return c.json({
      success: true,
      access_token: result.access_token,
      refresh_token: result.refresh_token,
      user: result.user,
      organization: result.organization
    })
  } catch (error) {
    console.error('Login error:', error)
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
authRoutes.post('/register', async (c) => {
  try {
    const body = await c.req.json()
    const { email, password, full_name, organization_name } = body

    if (!email || !password || !full_name || !organization_name) {
      return c.json({ 
        error: 'Email, contraseña, nombre completo y nombre de organización requeridos' 
      }, 400)
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return c.json({ error: 'Email inválido' }, 400)
    }

    // Password strength validation
    if (password.length < 8) {
      return c.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, 400)
    }

    const db = c.env.DB as D1Database

    // Check if user exists
    const existingUser = await db
      .prepare('SELECT id FROM users WHERE email = ?')
      .bind(email)
      .first()

    if (existingUser) {
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
      return c.json({ 
        success: true,
        message: 'Cuenta creada exitosamente, por favor inicia sesión' 
      })
    }

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
    return c.json({ error: 'Error en el servidor' }, 500)
  }
})

export default authRoutes
