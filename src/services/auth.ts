/**
 * Metainfox AI - Authentication Service
 * Handles JWT tokens, password hashing (bcrypt simulation), and session management
 */

import type { D1Database } from '@cloudflare/workers-types'

// ============================================
// TYPES
// ============================================

export interface User {
  id: number
  email: string
  full_name: string
  avatar_url?: string
  status: string
  email_verified: number
}

export interface Organization {
  id: number
  name: string
  slug: string
  plan_type: string
  plan_status: string
}

export interface OrganizationMember {
  organization_id: number
  user_id: number
  role: string
  status: string
}

export interface AuthContext {
  user: User
  organization: Organization
  membership: OrganizationMember
  permissions: string[]
}

export interface LoginResponse {
  success: boolean
  access_token?: string
  refresh_token?: string
  user?: User
  organization?: Organization
  message?: string
}

// ============================================
// PASSWORD HASHING (Simple simulation - use bcrypt in production)
// ============================================

/**
 * Simple password hashing using Web Crypto API
 * In production, use proper bcrypt implementation
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + 'metainfox_salt_2024')
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return `$sha256$${hashHex}`
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const newHash = await hashPassword(password)
  return newHash === hash
}

// ============================================
// JWT TOKEN GENERATION (using Web Crypto API)
// ============================================

interface JWTPayload {
  sub: string // user_id
  email: string
  org_id: string // organization_id
  role: string
  exp: number // expiration timestamp
  iat: number // issued at
  jti?: string // JWT ID
}

/**
 * Create JWT token using HMAC-SHA256
 */
export async function createJWT(payload: JWTPayload, secret: string): Promise<string> {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  }

  const encoder = new TextEncoder()
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '')
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '')
  const data = `${headerB64}.${payloadB64}`

  // Import secret key
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  // Sign the token
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(data)
  )

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

  return `${data}.${signatureB64}`
}

/**
 * Verify and decode JWT token
 */
export async function verifyJWT(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const [headerB64, payloadB64, signatureB64] = token.split('.')
    if (!headerB64 || !payloadB64 || !signatureB64) return null

    const encoder = new TextEncoder()
    const data = `${headerB64}.${payloadB64}`

    // Import secret key
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    // Decode signature
    const signature = Uint8Array.from(
      atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')),
      c => c.charCodeAt(0)
    )

    // Verify signature
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature,
      encoder.encode(data)
    )

    if (!valid) return null

    // Decode payload
    const payload = JSON.parse(atob(payloadB64)) as JWTPayload

    // Check expiration
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return null
    }

    return payload
  } catch (error) {
    console.error('JWT verification error:', error)
    return null
  }
}

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================

/**
 * Login user with email and password
 */
export async function login(
  db: D1Database,
  email: string,
  password: string,
  organizationSlug?: string
): Promise<LoginResponse> {
  try {
    // 1. Find user by email
    const user = await db
      .prepare('SELECT * FROM users WHERE email = ? AND status = ?')
      .bind(email, 'active')
      .first<User>()

    if (!user) {
      return { success: false, message: 'Credenciales inválidas' }
    }

    // 2. Verify password
    const passwordValid = await verifyPassword(password, user.password_hash as any)
    if (!passwordValid) {
      return { success: false, message: 'Credenciales inválidas' }
    }

    // 3. Get user's organizations
    const memberships = await db
      .prepare(`
        SELECT om.*, o.* 
        FROM organization_members om
        JOIN organizations o ON om.organization_id = o.id
        WHERE om.user_id = ? AND om.status = 'active' AND o.plan_status = 'active'
      `)
      .bind(user.id)
      .all()

    if (!memberships.results || memberships.results.length === 0) {
      return { success: false, message: 'No tienes acceso a ninguna organización' }
    }

    // 4. Select organization (by slug or first one)
    let selectedOrg = memberships.results[0] as any
    if (organizationSlug) {
      const found = memberships.results.find((m: any) => m.slug === organizationSlug)
      if (found) selectedOrg = found
    }

    // 5. Generate tokens
    const jwtSecret = 'metainfox_jwt_secret_2024_change_in_production' // TODO: Use env var
    const now = Math.floor(Date.now() / 1000)

    const accessTokenPayload: JWTPayload = {
      sub: user.id.toString(),
      email: user.email,
      org_id: selectedOrg.organization_id.toString(),
      role: selectedOrg.role,
      exp: now + 3600, // 1 hour
      iat: now,
      jti: crypto.randomUUID()
    }

    const refreshTokenPayload: JWTPayload = {
      sub: user.id.toString(),
      email: user.email,
      org_id: selectedOrg.organization_id.toString(),
      role: selectedOrg.role,
      exp: now + 604800, // 7 days
      iat: now,
      jti: crypto.randomUUID()
    }

    const accessToken = await createJWT(accessTokenPayload, jwtSecret)
    const refreshToken = await createJWT(refreshTokenPayload, jwtSecret)

    // 6. Save refresh token session
    await db
      .prepare(`
        INSERT INTO sessions (user_id, organization_id, refresh_token, access_token_jti, expires_at)
        VALUES (?, ?, ?, ?, datetime(?, 'unixepoch'))
      `)
      .bind(
        user.id,
        selectedOrg.organization_id,
        refreshToken,
        accessTokenPayload.jti,
        refreshTokenPayload.exp
      )
      .run()

    // 7. Update last login
    await db
      .prepare('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(user.id)
      .run()

    // 8. Create audit log
    await db
      .prepare(`
        INSERT INTO audit_logs (organization_id, user_id, action, resource_type, status)
        VALUES (?, ?, 'login', 'user', 'success')
      `)
      .bind(selectedOrg.organization_id, user.id)
      .run()

    return {
      success: true,
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        status: user.status,
        email_verified: user.email_verified
      },
      organization: {
        id: selectedOrg.organization_id,
        name: selectedOrg.name,
        slug: selectedOrg.slug,
        plan_type: selectedOrg.plan_type,
        plan_status: selectedOrg.plan_status
      }
    }
  } catch (error) {
    console.error('Login error:', error)
    return { success: false, message: 'Error en el servidor' }
  }
}

/**
 * Verify access token and get auth context
 */
export async function verifyAccessToken(
  db: D1Database,
  token: string
): Promise<AuthContext | null> {
  try {
    const jwtSecret = 'metainfox_jwt_secret_2024_change_in_production'
    const payload = await verifyJWT(token, jwtSecret)

    if (!payload) return null

    // Get user
    const user = await db
      .prepare('SELECT id, email, full_name, avatar_url, status, email_verified FROM users WHERE id = ?')
      .bind(parseInt(payload.sub))
      .first<User>()

    if (!user || user.status !== 'active') return null

    // Get organization
    const organization = await db
      .prepare('SELECT id, name, slug, plan_type, plan_status FROM organizations WHERE id = ?')
      .bind(parseInt(payload.org_id))
      .first<Organization>()

    if (!organization || organization.plan_status !== 'active') return null

    // Get membership
    const membership = await db
      .prepare(`
        SELECT organization_id, user_id, role, status 
        FROM organization_members 
        WHERE user_id = ? AND organization_id = ? AND status = 'active'
      `)
      .bind(user.id, organization.id)
      .first<OrganizationMember>()

    if (!membership) return null

    // Get permissions for role
    const permissionsResult = await db
      .prepare(`
        SELECT p.name
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        JOIN roles r ON rp.role_id = r.id
        WHERE r.name = ?
      `)
      .bind(membership.role)
      .all()

    const permissions = permissionsResult.results.map((p: any) => p.name)

    return {
      user,
      organization,
      membership,
      permissions
    }
  } catch (error) {
    console.error('Token verification error:', error)
    return null
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
  db: D1Database,
  refreshToken: string
): Promise<{ success: boolean; access_token?: string; message?: string }> {
  try {
    const jwtSecret = 'metainfox_jwt_secret_2024_change_in_production'
    const payload = await verifyJWT(refreshToken, jwtSecret)

    if (!payload) {
      return { success: false, message: 'Token inválido o expirado' }
    }

    // Check if session exists and is not revoked
    const session = await db
      .prepare('SELECT * FROM sessions WHERE refresh_token = ? AND revoked = 0')
      .bind(refreshToken)
      .first()

    if (!session) {
      return { success: false, message: 'Sesión inválida o revocada' }
    }

    // Generate new access token
    const now = Math.floor(Date.now() / 1000)
    const accessTokenPayload: JWTPayload = {
      sub: payload.sub,
      email: payload.email,
      org_id: payload.org_id,
      role: payload.role,
      exp: now + 3600, // 1 hour
      iat: now,
      jti: crypto.randomUUID()
    }

    const accessToken = await createJWT(accessTokenPayload, jwtSecret)

    return {
      success: true,
      access_token: accessToken
    }
  } catch (error) {
    console.error('Token refresh error:', error)
    return { success: false, message: 'Error al renovar token' }
  }
}

/**
 * Logout - revoke refresh token
 */
export async function logout(db: D1Database, refreshToken: string): Promise<boolean> {
  try {
    await db
      .prepare('UPDATE sessions SET revoked = 1, revoked_at = CURRENT_TIMESTAMP WHERE refresh_token = ?')
      .bind(refreshToken)
      .run()
    return true
  } catch (error) {
    console.error('Logout error:', error)
    return false
  }
}
