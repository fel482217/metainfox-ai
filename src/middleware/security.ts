/**
 * Metainfox AI - Additional Security Middleware
 * Bot protection, rate limiting, and validation
 */

import type { Context, Next } from 'hono'

// ============================================
// RATE LIMITING FOR AUTH ENDPOINTS
// ============================================

// In-memory store for rate limiting (in production, use KV or Redis)
const authAttempts = new Map<string, { count: number; resetAt: number; lockedUntil?: number }>()

/**
 * Strict rate limiting for authentication endpoints
 * Prevents brute force attacks
 */
export function strictAuthRateLimit(maxAttempts: number = 5, windowMs: number = 300000) {
  return async (c: Context, next: Next) => {
    // Get IP address (use multiple headers for proxy detection)
    const ip = c.req.header('cf-connecting-ip') || 
               c.req.header('x-forwarded-for')?.split(',')[0] || 
               c.req.header('x-real-ip') || 
               'unknown'
    
    const now = Date.now()
    const key = `auth_${ip}`
    const record = authAttempts.get(key)

    // Check if IP is locked out
    if (record?.lockedUntil && record.lockedUntil > now) {
      const retryAfter = Math.ceil((record.lockedUntil - now) / 1000)
      return c.json({
        error: 'Demasiados intentos fallidos. Tu IP ha sido bloqueada temporalmente.',
        retry_after_seconds: retryAfter,
        locked_until: new Date(record.lockedUntil).toISOString()
      }, 429)
    }

    // Reset if window expired
    if (!record || record.resetAt < now) {
      authAttempts.set(key, { count: 1, resetAt: now + windowMs })
      await next()
      return
    }

    // Increment attempt count
    if (record.count >= maxAttempts) {
      // Lock out for 15 minutes after max attempts
      record.lockedUntil = now + 900000 // 15 minutes
      const retryAfter = Math.ceil((record.lockedUntil - now) / 1000)
      
      return c.json({
        error: 'Demasiados intentos de inicio de sesión. Inténtalo de nuevo más tarde.',
        retry_after_seconds: retryAfter,
        max_attempts: maxAttempts
      }, 429)
    }

    record.count++
    await next()
  }
}

/**
 * Reset rate limit on successful login
 */
export function resetAuthRateLimit(c: Context) {
  const ip = c.req.header('cf-connecting-ip') || 
             c.req.header('x-forwarded-for')?.split(',')[0] || 
             c.req.header('x-real-ip') || 
             'unknown'
  
  const key = `auth_${ip}`
  authAttempts.delete(key)
}

// ============================================
// BOT DETECTION
// ============================================

/**
 * Basic bot detection based on User-Agent and behavior
 */
export async function botDetection(c: Context, next: Next) {
  const userAgent = c.req.header('user-agent') || ''
  
  // Common bot user agents
  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python-requests/i,
    /java/i,
    /go-http-client/i
  ]

  // Check if it's a known bot
  const isBot = botPatterns.some(pattern => pattern.test(userAgent))
  
  if (isBot) {
    // Allow legitimate bots but log them
    console.log('Bot detected:', userAgent)
  }

  await next()
}

// ============================================
// INPUT VALIDATION
// ============================================

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'La contraseña debe tener al menos 8 caracteres' }
  }

  // Optional: Add more strength requirements
  // const hasUpperCase = /[A-Z]/.test(password)
  // const hasLowerCase = /[a-z]/.test(password)
  // const hasNumber = /[0-9]/.test(password)
  // const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)

  return { valid: true }
}

/**
 * Sanitize input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

// ============================================
// HONEYPOT FIELD
// ============================================

/**
 * Check for honeypot field (hidden field that bots fill)
 */
export async function checkHoneypot(c: Context, next: Next) {
  try {
    const body = await c.req.json()
    
    // If honeypot field exists and is filled, it's likely a bot
    if (body.website || body.url || body.homepage) {
      return c.json({ error: 'Invalid request' }, 400)
    }
  } catch (error) {
    // Not JSON body, skip
  }

  await next()
}

// ============================================
// REQUEST FINGERPRINTING
// ============================================

/**
 * Generate request fingerprint for tracking
 */
export function generateRequestFingerprint(c: Context): string {
  const ip = c.req.header('cf-connecting-ip') || 
             c.req.header('x-forwarded-for') || 
             'unknown'
  const userAgent = c.req.header('user-agent') || ''
  const acceptLanguage = c.req.header('accept-language') || ''
  
  // Simple hash
  const fingerprint = `${ip}_${userAgent.substring(0, 50)}_${acceptLanguage}`
  return Buffer.from(fingerprint).toString('base64').substring(0, 32)
}

// ============================================
// ACCOUNT ENUMERATION PREVENTION
// ============================================

/**
 * Consistent response time to prevent account enumeration attacks
 * Always takes at least minTime ms to respond
 */
export async function preventEnumeration(minTime: number = 500) {
  const start = Date.now()
  
  return async () => {
    const elapsed = Date.now() - start
    if (elapsed < minTime) {
      await new Promise(resolve => setTimeout(resolve, minTime - elapsed))
    }
  }
}

// ============================================
// CSRF PROTECTION (Basic)
// ============================================

/**
 * Basic CSRF protection for state-changing operations
 */
export async function csrfProtection(c: Context, next: Next) {
  const method = c.req.method
  
  // Only check for state-changing methods
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const origin = c.req.header('origin')
    const referer = c.req.header('referer')
    
    // Check if origin/referer matches expected domain
    const allowedOrigins = [
      'https://metainfox.io',
      'https://www.metainfox.io',
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ]
    
    const isAllowed = origin && allowedOrigins.some(allowed => origin.startsWith(allowed))
    
    if (!isAllowed && referer) {
      const isRefererAllowed = allowedOrigins.some(allowed => referer.startsWith(allowed))
      if (!isRefererAllowed) {
        return c.json({ error: 'Invalid request origin' }, 403)
      }
    }
  }

  await next()
}
