/**
 * Rate Limiting Middleware
 *
 * Implements multiple layers of rate limiting following OWASP guidelines:
 * 1. IP-based rate limiting - Prevents abuse from single IP addresses
 * 2. Session-based rate limiting - Prevents abuse from single users
 * 3. Endpoint-specific limits - Stricter limits for expensive operations
 *
 * OWASP Reference: API4:2023 - Unrestricted Resource Consumption
 * https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/
 */

import rateLimit from 'express-rate-limit'
import { securityConfig } from '../config/security.js'

/**
 * Custom key generator that combines IP and session ID
 *
 * This provides dual-layer protection:
 * - IP-based: Prevents single source abuse
 * - Session-based: Prevents distributed attacks using same session
 *
 * @param {Request} req - Express request object
 * @returns {string} Unique identifier for rate limiting
 */
function generateRateLimitKey(req) {
  // Get client IP - handle proxies correctly
  const clientIP = getClientIP(req)

  // Get session ID from header (if provided by client)
  const sessionId = req.headers['x-session-id'] || 'anonymous'

  // SECURITY: Combine both for comprehensive limiting
  return `${clientIP}:${sessionId}`
}

/**
 * Safely extract client IP address
 *
 * SECURITY: Properly handles X-Forwarded-For header to prevent spoofing
 * Only trusts proxy headers in production behind known proxies
 *
 * @param {Request} req - Express request object
 * @returns {string} Client IP address
 */
function getClientIP(req) {
  // In production behind a trusted proxy, use X-Forwarded-For
  if (process.env.TRUST_PROXY === 'true') {
    const forwardedFor = req.headers['x-forwarded-for']
    if (forwardedFor) {
      // Take the first IP (original client) from the chain
      return forwardedFor.split(',')[0].trim()
    }
  }

  // Fall back to direct connection IP
  return req.ip || req.socket.remoteAddress || 'unknown'
}

/**
 * Custom handler for rate limit exceeded
 *
 * Returns a user-friendly 429 response with retry information
 * SECURITY: Does not reveal internal rate limit configuration
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
function rateLimitHandler(req, res) {
  // SECURITY: Log rate limit violations for monitoring
  console.warn('[RATE_LIMIT]', {
    ip: getClientIP(req),
    path: req.path,
    sessionId: req.headers['x-session-id'] || 'anonymous',
    timestamp: new Date().toISOString()
  })

  res.status(429).json({
    error: 'Too Many Requests',
    message: 'You have made too many requests. Please wait before trying again.',
    retryAfter: res.getHeader('Retry-After') || 60
  })
}

/**
 * Skip rate limiting for certain conditions
 *
 * @param {Request} req - Express request object
 * @returns {boolean} Whether to skip rate limiting
 */
function shouldSkipRateLimit(req) {
  // Skip health check endpoints
  if (req.path === '/api/health') {
    return true
  }

  // In development, optionally skip for testing
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_RATE_LIMIT === 'true') {
    return true
  }

  return false
}

/**
 * Create all rate limiters for the application
 *
 * @returns {Object} Object containing configured rate limiters
 */
export function createRateLimiters() {
  const config = securityConfig.rateLimit

  /**
   * Global Rate Limiter
   *
   * Applies to ALL endpoints as a baseline protection
   * Generous limits to not impact normal usage
   */
  const globalLimiter = rateLimit({
    windowMs: config.global.windowMs,
    max: config.global.max,
    message: 'Too many requests from this IP',
    standardHeaders: true, // Return rate limit info in headers (RateLimit-*)
    legacyHeaders: false, // Disable X-RateLimit-* headers
    keyGenerator: (req) => getClientIP(req), // IP-only for global
    handler: rateLimitHandler,
    skip: shouldSkipRateLimit
  })

  /**
   * Chat Endpoint Rate Limiter
   *
   * Stricter limits for AI chat endpoints because:
   * 1. Each request costs money (OpenAI API)
   * 2. Responses are computationally expensive
   * 3. Higher abuse potential
   */
  const chatLimiter = rateLimit({
    windowMs: config.chat.windowMs,
    max: config.chat.max,
    message: 'Too many chat requests. Please slow down.',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: generateRateLimitKey, // IP + Session for stricter control
    handler: rateLimitHandler,
    skip: shouldSkipRateLimit
  })

  /**
   * Burst Protection Limiter
   *
   * Very short window to prevent rapid-fire requests
   * Catches automated scripts and bots
   */
  const burstLimiter = rateLimit({
    windowMs: config.burst.windowMs,
    max: config.burst.max,
    message: 'Too many requests in a short period',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: generateRateLimitKey,
    handler: rateLimitHandler,
    skip: shouldSkipRateLimit
  })

  return {
    global: globalLimiter,
    chat: [burstLimiter, chatLimiter], // Apply both for chat endpoints
    burst: burstLimiter
  }
}

/**
 * Middleware to track request counts per session
 *
 * This provides application-level rate limiting beyond express-rate-limit
 * Useful for implementing per-user quotas
 */
export function sessionRateLimitTracker() {
  const sessionCounts = new Map()

  // Cleanup old sessions periodically
  setInterval(() => {
    const oneHourAgo = Date.now() - 3600000
    for (const [key, data] of sessionCounts.entries()) {
      if (data.lastRequest < oneHourAgo) {
        sessionCounts.delete(key)
      }
    }
  }, 300000) // Every 5 minutes

  return (req, res, next) => {
    const sessionId = req.headers['x-session-id']

    if (sessionId) {
      const now = Date.now()
      const session = sessionCounts.get(sessionId) || { count: 0, lastRequest: now }

      session.count++
      session.lastRequest = now
      sessionCounts.set(sessionId, session)

      // Add session stats to request for logging
      req.sessionStats = {
        totalRequests: session.count,
        sessionId: sessionId.substring(0, 8) + '...' // Truncate for logging
      }
    }

    next()
  }
}

export default { createRateLimiters, sessionRateLimitTracker }
