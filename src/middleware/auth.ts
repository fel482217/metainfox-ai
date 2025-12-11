/**
 * Metainfox AI - Authentication & Authorization Middleware
 * Handles JWT validation, permission checks, and tenant isolation
 */

import type { Context, Next } from 'hono'
import type { D1Database } from '@cloudflare/workers-types'
import { verifyAccessToken, type AuthContext } from '../services/auth'

// ============================================
// CONTEXT TYPE EXTENSIONS
// ============================================

export type AppContext = {
  auth?: AuthContext
  db: D1Database
}

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================

/**
 * Require authentication - validates JWT token
 */
export async function requireAuth(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'No autorizado - Token requerido' }, 401)
  }

  const token = authHeader.substring(7) // Remove 'Bearer '
  const db = c.env.DB as D1Database

  const authContext = await verifyAccessToken(db, token)

  if (!authContext) {
    return c.json({ error: 'No autorizado - Token inválido o expirado' }, 401)
  }

  // Store auth context in request context
  c.set('auth', authContext)

  await next()
}

// ============================================
// AUTHORIZATION MIDDLEWARE (RBAC)
// ============================================

/**
 * Require specific permission
 */
export function requirePermission(permission: string) {
  return async (c: Context, next: Next) => {
    const auth = c.get('auth') as AuthContext | undefined

    if (!auth) {
      return c.json({ error: 'No autorizado' }, 401)
    }

    if (!auth.permissions.includes(permission)) {
      return c.json({ 
        error: 'Acceso denegado - Permiso insuficiente',
        required: permission,
        your_permissions: auth.permissions
      }, 403)
    }

    await next()
  }
}

/**
 * Require specific role
 */
export function requireRole(...roles: string[]) {
  return async (c: Context, next: Next) => {
    const auth = c.get('auth') as AuthContext | undefined

    if (!auth) {
      return c.json({ error: 'No autorizado' }, 401)
    }

    if (!roles.includes(auth.membership.role)) {
      return c.json({ 
        error: 'Acceso denegado - Rol insuficiente',
        required_roles: roles,
        your_role: auth.membership.role
      }, 403)
    }

    await next()
  }
}

/**
 * Require organization admin
 */
export async function requireOrgAdmin(c: Context, next: Next) {
  const auth = c.get('auth') as AuthContext | undefined

  if (!auth) {
    return c.json({ error: 'No autorizado' }, 401)
  }

  const adminRoles = ['super_admin', 'org_admin']
  if (!adminRoles.includes(auth.membership.role)) {
    return c.json({ 
      error: 'Acceso denegado - Se requiere rol de administrador',
      your_role: auth.membership.role
    }, 403)
  }

  await next()
}

// ============================================
// MULTI-TENANT ISOLATION MIDDLEWARE
// ============================================

/**
 * Ensure tenant isolation - adds organization_id filter to queries
 */
export async function ensureTenantIsolation(c: Context, next: Next) {
  const auth = c.get('auth') as AuthContext | undefined

  if (!auth) {
    return c.json({ error: 'No autorizado' }, 401)
  }

  // Store organization_id in context for easy access
  c.set('organizationId', auth.organization.id)

  await next()
}

/**
 * Validate resource ownership (for update/delete operations)
 */
export async function validateResourceOwnership(resourceType: 'risk' | 'alert' | 'user') {
  return async (c: Context, next: Next) => {
    const auth = c.get('auth') as AuthContext | undefined
    if (!auth) {
      return c.json({ error: 'No autorizado' }, 401)
    }

    const resourceId = c.req.param('id')
    if (!resourceId) {
      return c.json({ error: 'ID de recurso requerido' }, 400)
    }

    const db = c.env.DB as D1Database
    let tableName = ''
    
    switch (resourceType) {
      case 'risk':
        tableName = 'risks'
        break
      case 'alert':
        tableName = 'alerts'
        break
      case 'user':
        // For users, check membership
        const member = await db
          .prepare('SELECT * FROM organization_members WHERE user_id = ? AND organization_id = ?')
          .bind(resourceId, auth.organization.id)
          .first()
        
        if (!member) {
          return c.json({ error: 'Recurso no encontrado o acceso denegado' }, 404)
        }
        
        await next()
        return
    }

    // Check if resource belongs to organization
    const resource = await db
      .prepare(`SELECT id FROM ${tableName} WHERE id = ? AND organization_id = ?`)
      .bind(resourceId, auth.organization.id)
      .first()

    if (!resource) {
      return c.json({ error: 'Recurso no encontrado o acceso denegado' }, 404)
    }

    await next()
  }
}

// ============================================
// AUDIT LOG MIDDLEWARE
// ============================================

/**
 * Log all actions for audit trail
 */
export async function auditLog(c: Context, next: Next) {
  const auth = c.get('auth') as AuthContext | undefined
  const method = c.req.method
  const path = c.req.path

  // Execute request
  await next()

  // Log after request completes
  if (auth) {
    const db = c.env.DB as D1Database
    const status = c.res.status < 400 ? 'success' : 'failure'

    try {
      await db
        .prepare(`
          INSERT INTO audit_logs (
            organization_id, user_id, action, resource_type, method, endpoint, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          auth.organization.id,
          auth.user.id,
          `${method} ${path}`,
          'api',
          method,
          path,
          status
        )
        .run()
    } catch (error) {
      console.error('Audit log error:', error)
      // Don't fail the request if audit logging fails
    }
  }
}

// ============================================
// RATE LIMITING MIDDLEWARE
// ============================================

/**
 * Simple rate limiting by organization
 * In production, use KV store or external rate limiter
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(maxRequests: number = 100, windowMs: number = 60000) {
  return async (c: Context, next: Next) => {
    const auth = c.get('auth') as AuthContext | undefined

    if (!auth) {
      await next()
      return
    }

    const key = `org_${auth.organization.id}`
    const now = Date.now()
    const record = rateLimitStore.get(key)

    if (!record || record.resetAt < now) {
      rateLimitStore.set(key, { count: 1, resetAt: now + windowMs })
      await next()
      return
    }

    if (record.count >= maxRequests) {
      const retryAfter = Math.ceil((record.resetAt - now) / 1000)
      return c.json({
        error: 'Límite de requests excedido',
        retry_after_seconds: retryAfter
      }, 429)
    }

    record.count++
    await next()
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get current auth context from request
 */
export function getAuth(c: Context): AuthContext | undefined {
  return c.get('auth') as AuthContext | undefined
}

/**
 * Check if user has permission
 */
export function hasPermission(auth: AuthContext | undefined, permission: string): boolean {
  if (!auth) return false
  return auth.permissions.includes(permission)
}

/**
 * Check if user has role
 */
export function hasRole(auth: AuthContext | undefined, ...roles: string[]): boolean {
  if (!auth) return false
  return roles.includes(auth.membership.role)
}

/**
 * Get organization ID from context
 */
export function getOrganizationId(c: Context): number | undefined {
  return c.get('organizationId') as number | undefined
}
