/**
 * Frontend API Client
 *
 * SECURITY: This client communicates with our secure backend server.
 * - API key is NEVER exposed to the client
 * - All requests go through the backend which handles OpenAI calls
 * - Session ID is used for rate limiting (not authentication)
 * - Input validation happens both client-side (UX) and server-side (security)
 */

import { v4 as uuidv4 } from 'uuid'

// =============================================================================
// SESSION MANAGEMENT
// =============================================================================

/**
 * Get or create a session ID for rate limiting
 *
 * SECURITY NOTE: This is NOT for authentication, only for rate limiting.
 * It helps prevent abuse from a single browser session.
 *
 * @returns {string} UUID session ID
 */
function getSessionId() {
  let sessionId = sessionStorage.getItem('eli5_session_id')

  if (!sessionId) {
    sessionId = uuidv4()
    sessionStorage.setItem('eli5_session_id', sessionId)
  }

  return sessionId
}

// =============================================================================
// INPUT VALIDATION (Client-side)
// =============================================================================

/**
 * Client-side input validation
 *
 * SECURITY: This is for UX only. Server performs authoritative validation.
 * Client validation prevents unnecessary API calls for obviously invalid input.
 */
const VALIDATION_RULES = {
  maxQuestionLength: 2000,
  allowedAgeLevels: [5, 10, 15, 20]
}

/**
 * Validate question input before sending to server
 *
 * @param {string} question - User's question
 * @throws {Error} If validation fails
 */
function validateQuestion(question) {
  if (!question || typeof question !== 'string') {
    throw new Error('Question is required')
  }

  const trimmed = question.trim()

  if (trimmed.length === 0) {
    throw new Error('Question cannot be empty')
  }

  if (trimmed.length > VALIDATION_RULES.maxQuestionLength) {
    throw new Error(`Question is too long (max ${VALIDATION_RULES.maxQuestionLength} characters)`)
  }

  return trimmed
}

/**
 * Validate age level
 *
 * @param {number} ageLevel - Selected age level
 * @throws {Error} If validation fails
 */
function validateAgeLevel(ageLevel) {
  if (!VALIDATION_RULES.allowedAgeLevels.includes(ageLevel)) {
    throw new Error('Invalid age level')
  }

  return ageLevel
}

// =============================================================================
// API CALLS
// =============================================================================

/**
 * Make a request to the backend API
 *
 * @param {string} endpoint - API endpoint (e.g., '/api/chat/explain')
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} Response data
 */
async function apiRequest(endpoint, options = {}) {
  const sessionId = getSessionId()

  const response = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Session-ID': sessionId,
      ...options.headers
    }
  })

  // Handle rate limiting
  if (response.status === 429) {
    const data = await response.json()
    const retryAfter = data.retryAfter || 60
    throw new RateLimitError(
      `Too many requests. Please wait ${retryAfter} seconds.`,
      retryAfter
    )
  }

  // Handle validation errors
  if (response.status === 400) {
    const data = await response.json()
    throw new ValidationError(data.message || 'Invalid request', data.details)
  }

  // Handle server errors
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.message || 'An error occurred. Please try again.')
  }

  return response.json()
}

// =============================================================================
// CUSTOM ERROR CLASSES
// =============================================================================

/**
 * Error thrown when rate limit is exceeded
 */
export class RateLimitError extends Error {
  constructor(message, retryAfter) {
    super(message)
    this.name = 'RateLimitError'
    this.retryAfter = retryAfter
  }
}

/**
 * Error thrown when validation fails
 */
export class ValidationError extends Error {
  constructor(message, details) {
    super(message)
    this.name = 'ValidationError'
    this.details = details
  }
}

// =============================================================================
// PUBLIC API FUNCTIONS
// =============================================================================

/**
 * Get AI explanation for a question
 *
 * @param {string} question - The question to explain
 * @param {number} ageLevel - Target age level (5, 10, 15, or 20)
 * @param {boolean} isReExplain - Whether this is a re-explanation request
 * @returns {Promise<string>} AI response
 */
export async function getAIResponse(question, ageLevel, isReExplain = false) {
  // Client-side validation (for UX)
  const validatedQuestion = validateQuestion(question)
  const validatedAgeLevel = validateAgeLevel(ageLevel)

  // Make API request to secure backend
  const data = await apiRequest('/api/chat/explain', {
    method: 'POST',
    body: JSON.stringify({
      question: validatedQuestion,
      ageLevel: validatedAgeLevel,
      isReExplain
    })
  })

  if (!data.success) {
    throw new Error(data.message || 'Failed to get response')
  }

  return data.response
}

/**
 * Check if the chat service is available
 *
 * @returns {Promise<boolean>} True if service is available
 */
export async function checkServiceStatus() {
  try {
    const data = await apiRequest('/api/chat/status', { method: 'GET' })
    return data.available
  } catch {
    return false
  }
}

export default {
  getAIResponse,
  checkServiceStatus,
  RateLimitError,
  ValidationError
}
