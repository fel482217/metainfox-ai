/**
 * Metainfox AI - Admin Routes
 * /api/admin/* endpoints for organization and user management
 */

import { Hono } from 'hono'
import type { D1Database } from '@cloudflare/workers-types'
import { requireAuth, requireOrgAdmin, requirePermission, getAuth } from '../middleware/auth'
import { hashPassword } from '../services/auth'

const adminRoutes = new Hono()

// Apply auth middleware to all admin routes
adminRoutes.use('*', requireAuth)

// ============================================
// ORGANIZATION MANAGEMENT
// ============================================

// GET /api/admin/organization
adminRoutes.get('/organization', async (c) => {
  try {
    const auth = getAuth(c)
    if (!auth) return c.json({ error: 'No autorizado' }, 401)

    const db = c.env.DB as D1Database

    // Get detailed organization info
    const org = await db
      .prepare(`
        SELECT 
          o.*,
          COUNT(DISTINCT om.user_id) as total_users,
          COUNT(DISTINCT r.id) as total_risks,
          COUNT(DISTINCT CASE WHEN r.status = 'open' THEN r.id END) as active_risks
        FROM organizations o
        LEFT JOIN organization_members om ON o.id = om.organization_id AND om.status = 'active'
        LEFT JOIN risks r ON o.id = r.organization_id
        WHERE o.id = ?
        GROUP BY o.id
      `)
      .bind(auth.organization.id)
      .first()

    return c.json({ organization: org })
  } catch (error) {
    console.error('Get organization error:', error)
    return c.json({ error: 'Error en el servidor' }, 500)
  }
})

// PUT /api/admin/organization
adminRoutes.put('/organization', requireOrgAdmin, async (c) => {
  try {
    const auth = getAuth(c)
    if (!auth) return c.json({ error: 'No autorizado' }, 401)

    const body = await c.req.json()
    const { name, industry, size, country, timezone, website, description } = body

    const db = c.env.DB as D1Database

    await db
      .prepare(`
        UPDATE organizations
        SET name = ?, industry = ?, size = ?, country = ?, 
            timezone = ?, website = ?, description = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      .bind(
        name || null,
        industry || null,
        size || null,
        country || null,
        timezone || null,
        website || null,
        description || null,
        auth.organization.id
      )
      .run()

    // Audit log
    await db
      .prepare(`
        INSERT INTO audit_logs (organization_id, user_id, action, resource_type, status)
        VALUES (?, ?, 'update_organization', 'organization', 'success')
      `)
      .bind(auth.organization.id, auth.user.id)
      .run()

    return c.json({ success: true, message: 'Organización actualizada exitosamente' })
  } catch (error) {
    console.error('Update organization error:', error)
    return c.json({ error: 'Error en el servidor' }, 500)
  }
})

// ============================================
// USER MANAGEMENT
// ============================================

// GET /api/admin/users
adminRoutes.get('/users', requirePermission('users.read'), async (c) => {
  try {
    const auth = getAuth(c)
    if (!auth) return c.json({ error: 'No autorizado' }, 401)

    const db = c.env.DB as D1Database

    const users = await db
      .prepare(`
        SELECT 
          u.id, u.email, u.full_name, u.avatar_url, u.status, 
          u.email_verified, u.last_login_at, u.created_at,
          om.role, om.status as membership_status, om.joined_at
        FROM users u
        JOIN organization_members om ON u.id = om.user_id
        WHERE om.organization_id = ?
        ORDER BY om.joined_at DESC
      `)
      .bind(auth.organization.id)
      .all()

    return c.json({ users: users.results })
  } catch (error) {
    console.error('Get users error:', error)
    return c.json({ error: 'Error en el servidor' }, 500)
  }
})

// GET /api/admin/users/:id
adminRoutes.get('/users/:id', requirePermission('users.read'), async (c) => {
  try {
    const auth = getAuth(c)
    if (!auth) return c.json({ error: 'No autorizado' }, 401)

    const userId = c.req.param('id')
    const db = c.env.DB as D1Database

    const user = await db
      .prepare(`
        SELECT 
          u.id, u.email, u.full_name, u.avatar_url, u.phone, u.status, 
          u.email_verified, u.last_login_at, u.created_at, u.timezone, u.language,
          om.role, om.status as membership_status, om.joined_at
        FROM users u
        JOIN organization_members om ON u.id = om.user_id
        WHERE u.id = ? AND om.organization_id = ?
      `)
      .bind(userId, auth.organization.id)
      .first()

    if (!user) {
      return c.json({ error: 'Usuario no encontrado' }, 404)
    }

    // Get user activity stats
    const stats = await db
      .prepare(`
        SELECT 
          COUNT(DISTINCT r.id) as created_risks,
          COUNT(DISTINCT al.id) as audit_entries
        FROM users u
        LEFT JOIN risks r ON u.id = r.created_by AND r.organization_id = ?
        LEFT JOIN audit_logs al ON u.id = al.user_id AND al.organization_id = ?
        WHERE u.id = ?
      `)
      .bind(auth.organization.id, auth.organization.id, userId)
      .first()

    return c.json({ user, stats })
  } catch (error) {
    console.error('Get user error:', error)
    return c.json({ error: 'Error en el servidor' }, 500)
  }
})

// POST /api/admin/users/invite
adminRoutes.post('/users/invite', requirePermission('users.invite'), async (c) => {
  try {
    const auth = getAuth(c)
    if (!auth) return c.json({ error: 'No autorizado' }, 401)

    const body = await c.req.json()
    const { email, role } = body

    if (!email || !role) {
      return c.json({ error: 'Email y rol requeridos' }, 400)
    }

    // Validate role
    const validRoles = ['org_admin', 'org_manager', 'org_member', 'org_viewer']
    if (!validRoles.includes(role)) {
      return c.json({ error: 'Rol inválido' }, 400)
    }

    const db = c.env.DB as D1Database

    // Check if user already exists in organization
    const existingMember = await db
      .prepare(`
        SELECT om.* FROM organization_members om
        JOIN users u ON om.user_id = u.id
        WHERE u.email = ? AND om.organization_id = ?
      `)
      .bind(email, auth.organization.id)
      .first()

    if (existingMember) {
      return c.json({ error: 'El usuario ya es miembro de esta organización' }, 409)
    }

    // Generate invitation token
    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    // Create invitation
    await db
      .prepare(`
        INSERT INTO invitations (
          organization_id, email, role, token, invited_by, expires_at, status
        ) VALUES (?, ?, ?, ?, ?, ?, 'pending')
      `)
      .bind(
        auth.organization.id,
        email,
        role,
        token,
        auth.user.id,
        expiresAt.toISOString()
      )
      .run()

    // TODO: Send invitation email
    const invitationUrl = `https://metainfox.io/invitation/${token}`

    // Audit log
    await db
      .prepare(`
        INSERT INTO audit_logs (organization_id, user_id, action, resource_type, status)
        VALUES (?, ?, 'invite_user', 'user', 'success')
      `)
      .bind(auth.organization.id, auth.user.id)
      .run()

    return c.json({
      success: true,
      message: 'Invitación enviada exitosamente',
      invitation_url: invitationUrl,
      expires_at: expiresAt.toISOString()
    }, 201)
  } catch (error) {
    console.error('Invite user error:', error)
    return c.json({ error: 'Error en el servidor' }, 500)
  }
})

// PUT /api/admin/users/:id/role
adminRoutes.put('/users/:id/role', requirePermission('users.manage'), async (c) => {
  try {
    const auth = getAuth(c)
    if (!auth) return c.json({ error: 'No autorizado' }, 401)

    const userId = c.req.param('id')
    const body = await c.req.json()
    const { role } = body

    if (!role) {
      return c.json({ error: 'Rol requerido' }, 400)
    }

    // Validate role
    const validRoles = ['org_admin', 'org_manager', 'org_member', 'org_viewer']
    if (!validRoles.includes(role)) {
      return c.json({ error: 'Rol inválido' }, 400)
    }

    const db = c.env.DB as D1Database

    // Update role
    const result = await db
      .prepare(`
        UPDATE organization_members
        SET role = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND organization_id = ?
      `)
      .bind(role, userId, auth.organization.id)
      .run()

    if (result.meta.changes === 0) {
      return c.json({ error: 'Usuario no encontrado en la organización' }, 404)
    }

    // Audit log
    await db
      .prepare(`
        INSERT INTO audit_logs (
          organization_id, user_id, action, resource_type, resource_id, 
          new_values, status
        ) VALUES (?, ?, 'update_user_role', 'user', ?, ?, 'success')
      `)
      .bind(
        auth.organization.id,
        auth.user.id,
        userId,
        JSON.stringify({ role })
      )
      .run()

    return c.json({ success: true, message: 'Rol actualizado exitosamente' })
  } catch (error) {
    console.error('Update user role error:', error)
    return c.json({ error: 'Error en el servidor' }, 500)
  }
})

// DELETE /api/admin/users/:id
adminRoutes.delete('/users/:id', requirePermission('users.delete'), async (c) => {
  try {
    const auth = getAuth(c)
    if (!auth) return c.json({ error: 'No autorizado' }, 401)

    const userId = c.req.param('id')

    // Prevent self-deletion
    if (parseInt(userId) === auth.user.id) {
      return c.json({ error: 'No puedes eliminarte a ti mismo' }, 400)
    }

    const db = c.env.DB as D1Database

    // Remove from organization (soft delete)
    const result = await db
      .prepare(`
        UPDATE organization_members
        SET status = 'left', left_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND organization_id = ?
      `)
      .bind(userId, auth.organization.id)
      .run()

    if (result.meta.changes === 0) {
      return c.json({ error: 'Usuario no encontrado en la organización' }, 404)
    }

    // Audit log
    await db
      .prepare(`
        INSERT INTO audit_logs (
          organization_id, user_id, action, resource_type, resource_id, status
        ) VALUES (?, ?, 'remove_user', 'user', ?, 'success')
      `)
      .bind(auth.organization.id, auth.user.id, userId)
      .run()

    return c.json({ success: true, message: 'Usuario eliminado exitosamente' })
  } catch (error) {
    console.error('Delete user error:', error)
    return c.json({ error: 'Error en el servidor' }, 500)
  }
})

// ============================================
// ROLES & PERMISSIONS
// ============================================

// GET /api/admin/roles
adminRoutes.get('/roles', async (c) => {
  try {
    const db = c.env.DB as D1Database

    const roles = await db
      .prepare(`
        SELECT r.*, 
          GROUP_CONCAT(p.name) as permissions
        FROM roles r
        LEFT JOIN role_permissions rp ON r.id = rp.role_id
        LEFT JOIN permissions p ON rp.permission_id = p.id
        WHERE r.is_system_role = 1
        GROUP BY r.id
        ORDER BY r.id
      `)
      .all()

    return c.json({ roles: roles.results })
  } catch (error) {
    console.error('Get roles error:', error)
    return c.json({ error: 'Error en el servidor' }, 500)
  }
})

// ============================================
// AUDIT LOGS
// ============================================

// GET /api/admin/audit-logs
adminRoutes.get('/audit-logs', requirePermission('audit.read'), async (c) => {
  try {
    const auth = getAuth(c)
    if (!auth) return c.json({ error: 'No autorizado' }, 401)

    const limit = parseInt(c.req.query('limit') || '50')
    const offset = parseInt(c.req.query('offset') || '0')

    const db = c.env.DB as D1Database

    const logs = await db
      .prepare(`
        SELECT 
          al.*,
          u.full_name as user_name,
          u.email as user_email
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE al.organization_id = ?
        ORDER BY al.created_at DESC
        LIMIT ? OFFSET ?
      `)
      .bind(auth.organization.id, limit, offset)
      .all()

    const total = await db
      .prepare('SELECT COUNT(*) as count FROM audit_logs WHERE organization_id = ?')
      .bind(auth.organization.id)
      .first()

    return c.json({
      logs: logs.results,
      pagination: {
        total: (total as any).count,
        limit,
        offset,
        has_more: (total as any).count > offset + limit
      }
    })
  } catch (error) {
    console.error('Get audit logs error:', error)
    return c.json({ error: 'Error en el servidor' }, 500)
  }
})

export default adminRoutes
