/**
 * Chat API Routes
 *
 * Secure API endpoints for the ELI5 chatbot.
 * Supports multiple AI providers (OpenAI, Google Gemini)
 *
 * All routes include:
 * - Input validation
 * - Rate limiting (applied at router level)
 * - Secure error handling
 *
 * SECURITY: API keys are used server-side only, never exposed to client
 */

import express from 'express'
import { validateChatRequest } from '../middleware/validator.js'
import { securityConfig } from '../config/security.js'
import {
  getAIResponse,
  getActiveProvider,
  isAIAvailable,
  handleProviderError
} from '../providers/ai.js'

const router = express.Router()

// =============================================================================
// ROUTES
// =============================================================================

/**
 * POST /api/chat/explain
 *
 * Main endpoint for getting AI explanations
 *
 * Request body:
 * {
 *   "question": "What is the cloud?",
 *   "ageLevel": 5,
 *   "isReExplain": false
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "response": "The cloud is like a big toy box in the sky...",
 *   "provider": "openai"
 * }
 */
router.post('/explain', validateChatRequest, async (req, res, next) => {
  const provider = getActiveProvider()

  try {
    // SECURITY: Use validated data only (from validator middleware)
    const { question, ageLevel, isReExplain } = req.validatedBody

    // Log request for monitoring (without sensitive data)
    if (securityConfig.logging.logRequestDetails) {
      console.log('[CHAT_REQUEST]', {
        provider,
        ageLevel,
        isReExplain,
        questionLength: question.length,
        sessionId: req.headers['x-session-id']?.substring(0, 8) || 'anonymous',
        timestamp: new Date().toISOString()
      })
    }

    // Get AI response using the configured provider
    const result = await getAIResponse(question, ageLevel, isReExplain)

    // Return success response
    res.json({
      success: true,
      response: result.response,
      provider: result.provider
    })

  } catch (error) {
    // Handle provider-specific errors
    const errorInfo = handleProviderError(error, provider)

    return res.status(errorInfo.status).json({
      success: false,
      error: errorInfo.status === 503 ? 'Service Busy' : 'Error',
      message: errorInfo.message,
      ...(errorInfo.retryAfter && { retryAfter: errorInfo.retryAfter })
    })
  }
})

/**
 * GET /api/chat/status
 *
 * Check if chat service is available and which provider is active
 * Useful for frontend to show service status
 */
router.get('/status', (req, res) => {
  const available = isAIAvailable()
  const provider = getActiveProvider()

  res.json({
    available,
    provider,
    timestamp: new Date().toISOString()
  })
})

export default router
