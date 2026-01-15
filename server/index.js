/**
 * ELI5 Chatbot - Secure Express Server
 *
 * SECURITY FEATURES:
 * - Helmet for security headers (XSS, clickjacking, MIME sniffing protection)
 * - CORS with strict origin validation
 * - Rate limiting (IP-based and session-based)
 * - Input validation with Zod schemas
 * - API key stored server-side in environment variables
 * - Request size limits to prevent DoS
 * - No sensitive data in error responses
 *
 * @see OWASP API Security Top 10: https://owasp.org/API-Security/
 */

import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Import security middleware
import { createRateLimiters } from './middleware/rateLimiter.js'
import { validateChatRequest, sanitizeInput } from './middleware/validator.js'
import { securityConfig } from './config/security.js'

// Import routes
import chatRoutes from './routes/chat.js'

// Import AI provider utilities
import { getActiveProvider, isAIAvailable } from './providers/ai.js'

// Load environment variables from .env file
// SECURITY: API keys must be in .env, never in code
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

// =============================================================================
// SECURITY MIDDLEWARE SETUP
// =============================================================================

/**
 * Helmet - Sets various HTTP headers for security
 *
 * Protects against:
 * - XSS attacks (X-XSS-Protection, Content-Security-Policy)
 * - Clickjacking (X-Frame-Options)
 * - MIME sniffing (X-Content-Type-Options)
 * - Information disclosure (X-Powered-By removal)
 */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Required for some frontend frameworks
}))

/**
 * CORS - Cross-Origin Resource Sharing
 *
 * SECURITY: Strictly limit which origins can access the API
 * In production, replace with your actual domain
 */
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:5173']

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.) in development only
    if (!origin && process.env.NODE_ENV !== 'production') {
      return callback(null, true)
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      // SECURITY: Log blocked CORS attempts for monitoring
      console.warn(`[SECURITY] Blocked CORS request from origin: ${origin}`)
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'X-Session-ID'],
  maxAge: 86400 // Cache preflight for 24 hours
}))

/**
 * Request size limiting
 *
 * SECURITY: Prevents DoS attacks via large payloads
 * Limit set to 10KB - sufficient for chat messages
 */
app.use(express.json({
  limit: securityConfig.maxRequestSize,
  strict: true // Only accept arrays and objects
}))

app.use(express.urlencoded({
  extended: false, // Use simple querystring parsing (more secure)
  limit: securityConfig.maxRequestSize
}))

/**
 * Apply input sanitization to all requests
 */
app.use(sanitizeInput)

/**
 * Rate Limiting
 *
 * Creates multiple rate limiters:
 * - Global: Applies to all routes
 * - Chat-specific: Stricter limits for AI endpoints (prevents API abuse)
 */
const rateLimiters = createRateLimiters()

// Apply global rate limiter to all routes
app.use(rateLimiters.global)

// =============================================================================
// ROUTES
// =============================================================================

/**
 * Health check endpoint
 * Not rate limited to allow monitoring systems to check status
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  })
})

/**
 * Chat routes with additional rate limiting
 * All chat endpoints require:
 * 1. Stricter rate limits (prevents API cost abuse)
 * 2. Input validation
 */
app.use('/api/chat', rateLimiters.chat, chatRoutes)

// =============================================================================
// ERROR HANDLING
// =============================================================================

/**
 * 404 Handler
 */
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist'
  })
})

/**
 * Global Error Handler
 *
 * SECURITY: Never expose internal error details to clients
 * Log full errors server-side, return generic messages to clients
 */
app.use((err, req, res, next) => {
  // Log the full error for debugging (server-side only)
  console.error('[ERROR]', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  })

  // SECURITY: Don't expose internal error details
  const statusCode = err.statusCode || err.status || 500
  const isProduction = process.env.NODE_ENV === 'production'

  res.status(statusCode).json({
    error: err.name || 'Error',
    message: isProduction && statusCode === 500
      ? 'An internal error occurred'
      : err.message,
    // Only include request ID in production for support tickets
    ...(isProduction && { requestId: req.headers['x-request-id'] })
  })
})

// =============================================================================
// SERVER STARTUP
// =============================================================================

/**
 * Validate required environment variables before starting
 * SECURITY: Fail fast if no AI provider is configured
 *
 * Supports:
 * - OpenAI (OPENAI_API_KEY)
 * - Google Gemini (GEMINI_API_KEY)
 */
function validateEnvironment() {
  const hasOpenAI = !!process.env.OPENAI_API_KEY
  const hasGemini = !!process.env.GEMINI_API_KEY

  // At least one AI provider must be configured
  if (!hasOpenAI && !hasGemini) {
    console.error('='.repeat(60))
    console.error('CONFIGURATION ERROR: No AI provider configured!')
    console.error('')
    console.error('Please set at least one of these in your .env file:')
    console.error('  - OPENAI_API_KEY (from https://platform.openai.com/api-keys)')
    console.error('  - GEMINI_API_KEY (from https://aistudio.google.com/app/apikey)')
    console.error('')
    console.error('See .env.example for reference.')
    console.error('='.repeat(60))
    process.exit(1)
  }

  // Validate OpenAI key format if provided
  if (hasOpenAI) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey.startsWith('sk-') || apiKey.length < 20) {
      console.error('WARNING: OPENAI_API_KEY appears to be invalid (should start with "sk-")')
    }
  }

  // Validate Gemini key format if provided (basic length check)
  if (hasGemini) {
    const apiKey = process.env.GEMINI_API_KEY
    if (apiKey.length < 20) {
      console.error('WARNING: GEMINI_API_KEY appears to be invalid')
    }
  }
}

validateEnvironment()

app.listen(PORT, () => {
  const activeProvider = getActiveProvider()
  const providerDisplay = {
    openai: 'OpenAI (GPT)',
    gemini: 'Google Gemini'
  }

  console.log('')
  console.log('='.repeat(60))
  console.log('  ELI5 Chatbot Server - SECURE MODE')
  console.log('='.repeat(60))
  console.log(`  Server running on port ${PORT}`)
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`  AI Provider: ${providerDisplay[activeProvider] || 'None'}`)
  console.log('')
  console.log('  Security features enabled:')
  console.log('    - Helmet security headers')
  console.log('    - CORS origin validation')
  console.log('    - Rate limiting (IP + session)')
  console.log('    - Input validation & sanitization')
  console.log('    - API keys secured server-side')
  console.log('='.repeat(60))
  console.log('')
})

export default app
