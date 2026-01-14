/**
 * Input Validation & Sanitization Middleware
 *
 * Implements strict input validation following OWASP guidelines:
 * - Schema-based validation using Zod
 * - Type checking for all fields
 * - Length limits to prevent buffer overflow / DoS
 * - Whitelist approach - reject unexpected fields
 * - Sanitization of user inputs
 *
 * OWASP Reference: API3:2023 - Broken Object Property Level Authorization
 * https://owasp.org/API-Security/editions/2023/en/0xa3-broken-object-property-level-authorization/
 */

import { z } from 'zod'
import validator from 'validator'
import { securityConfig } from '../config/security.js'

// =============================================================================
// ZOD SCHEMAS - Define strict schemas for all API inputs
// =============================================================================

/**
 * Chat Request Schema
 *
 * Validates the main chat endpoint input with:
 * - Strict type checking
 * - Length limits
 * - Enum validation for age levels
 * - No extra fields allowed (strict mode)
 */
export const chatRequestSchema = z.object({
  // Question must be a non-empty string with length limits
  question: z
    .string({
      required_error: 'Question is required',
      invalid_type_error: 'Question must be a string'
    })
    .min(1, 'Question cannot be empty')
    .max(securityConfig.validation.maxQuestionLength, `Question exceeds maximum length of ${securityConfig.validation.maxQuestionLength} characters`)
    .refine(
      (val) => !containsSuspiciousPatterns(val),
      'Question contains invalid content'
    ),

  // Age level must be one of the allowed values
  ageLevel: z
    .number({
      required_error: 'Age level is required',
      invalid_type_error: 'Age level must be a number'
    })
    .int('Age level must be a whole number')
    .refine(
      (val) => securityConfig.validation.allowedAgeLevels.includes(val),
      `Age level must be one of: ${securityConfig.validation.allowedAgeLevels.join(', ')}`
    ),

  // Optional re-explain flag
  isReExplain: z
    .boolean()
    .optional()
    .default(false)

}).strict() // SECURITY: Reject any unexpected fields

/**
 * Session ID Schema
 *
 * Validates the X-Session-ID header for rate limiting
 */
export const sessionIdSchema = z
  .string()
  .uuid('Invalid session ID format')
  .optional()

// =============================================================================
// SUSPICIOUS PATTERN DETECTION
// =============================================================================

/**
 * Check for suspicious patterns in user input
 *
 * SECURITY: Detects potential injection attacks and malicious content
 *
 * @param {string} input - User input to check
 * @returns {boolean} True if suspicious patterns found
 */
function containsSuspiciousPatterns(input) {
  const suspiciousPatterns = [
    // Script injection attempts
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // Event handlers like onclick=

    // SQL injection patterns
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER)\b)/gi,

    // Command injection patterns
    /[;&|`$]/g,

    // Path traversal
    /\.\.\//g,

    // Null bytes
    /\x00/g
  ]

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(input)) {
      return true
    }
  }

  return false
}

// =============================================================================
// SANITIZATION FUNCTIONS
// =============================================================================

/**
 * Sanitize a string input
 *
 * SECURITY: Removes/escapes potentially dangerous content
 * while preserving legitimate user input
 *
 * @param {string} input - Raw user input
 * @returns {string} Sanitized input
 */
export function sanitizeString(input) {
  if (typeof input !== 'string') {
    return ''
  }

  let sanitized = input

  // Trim whitespace
  sanitized = sanitized.trim()

  // Remove null bytes (potential security issue)
  sanitized = sanitized.replace(/\x00/g, '')

  // Normalize unicode to prevent homograph attacks
  sanitized = sanitized.normalize('NFKC')

  // Escape HTML entities to prevent XSS when displaying
  sanitized = validator.escape(sanitized)

  // Remove excessive whitespace (potential DoS via regex)
  sanitized = sanitized.replace(/\s+/g, ' ')

  return sanitized
}

/**
 * Unescape HTML for sending to AI
 *
 * After validation, we can safely unescape for AI processing
 * The AI needs the original text, not HTML entities
 *
 * @param {string} input - Escaped string
 * @returns {string} Unescaped string
 */
export function unescapeForAI(input) {
  return validator.unescape(input)
}

// =============================================================================
// VALIDATION MIDDLEWARE
// =============================================================================

/**
 * Middleware to validate chat request body
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Next middleware function
 */
export function validateChatRequest(req, res, next) {
  try {
    // Validate request body against schema
    const validatedData = chatRequestSchema.parse(req.body)

    // Attach validated data to request
    // SECURITY: Only use validated data from here on
    req.validatedBody = validatedData

    // Unescape the question for AI processing (after validation)
    req.validatedBody.question = unescapeForAI(validatedData.question)

    // Validate session ID header if present
    const sessionId = req.headers['x-session-id']
    if (sessionId) {
      try {
        sessionIdSchema.parse(sessionId)
      } catch {
        // Invalid session ID - log and continue without it
        console.warn('[VALIDATION] Invalid session ID format:', sessionId?.substring(0, 8))
        delete req.headers['x-session-id']
      }
    }

    next()
  } catch (error) {
    if (error instanceof z.ZodError) {
      // SECURITY: Return validation errors but don't expose internal details
      const errors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }))

      // Log validation failure for security monitoring
      console.warn('[VALIDATION_FAILED]', {
        ip: req.ip,
        path: req.path,
        errors: errors,
        timestamp: new Date().toISOString()
      })

      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid request data',
        details: errors
      })
    }

    // Unexpected error - pass to error handler
    next(error)
  }
}

/**
 * Global input sanitization middleware
 *
 * Applies basic sanitization to all incoming requests
 * before they reach route handlers
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Next middleware function
 */
export function sanitizeInput(req, res, next) {
  // Sanitize query parameters
  if (req.query) {
    for (const key of Object.keys(req.query)) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitizeString(req.query[key])
      }
    }
  }

  // Sanitize string fields in request body
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body)
  }

  next()
}

/**
 * Recursively sanitize all string values in an object
 *
 * @param {Object} obj - Object to sanitize
 */
function sanitizeObject(obj) {
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'string') {
      obj[key] = sanitizeString(obj[key])
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key])
    }
  }
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Check if a value is a safe integer within bounds
 *
 * @param {any} value - Value to check
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {boolean} True if valid
 */
export function isValidInteger(value, min, max) {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
  )
}

/**
 * Check if a value is a safe string within length bounds
 *
 * @param {any} value - Value to check
 * @param {number} maxLength - Maximum allowed length
 * @returns {boolean} True if valid
 */
export function isValidString(value, maxLength) {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= maxLength
  )
}

export default {
  validateChatRequest,
  sanitizeInput,
  sanitizeString,
  chatRequestSchema,
  sessionIdSchema
}
