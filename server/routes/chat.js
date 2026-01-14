/**
 * Chat API Routes
 *
 * Secure API endpoints for the ELI5 chatbot.
 * All routes include:
 * - Input validation
 * - Rate limiting (applied at router level)
 * - Secure error handling
 *
 * SECURITY: OpenAI API key is used server-side only, never exposed to client
 */

import express from 'express'
import OpenAI from 'openai'
import { validateChatRequest } from '../middleware/validator.js'
import { securityConfig } from '../config/security.js'

const router = express.Router()

// =============================================================================
// OPENAI CLIENT INITIALIZATION
// =============================================================================

/**
 * Initialize OpenAI client
 *
 * SECURITY: API key comes from environment variable, never from client
 * The key is validated at server startup (see server/index.js)
 */
let openaiClient = null

function getOpenAIClient() {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: securityConfig.openai.timeout
    })
  }
  return openaiClient
}

// =============================================================================
// SYSTEM PROMPTS
// =============================================================================

/**
 * Generate system prompt based on age level
 *
 * @param {number} ageLevel - Target age level for explanation
 * @param {boolean} isReExplain - Whether this is a re-explanation request
 * @returns {string} System prompt for OpenAI
 */
function getSystemPrompt(ageLevel, isReExplain = false) {
  const basePrompts = {
    5: `You are a friendly, patient teacher explaining things to a 5-year-old child.

Rules:
- Use VERY simple words (no big or technical words)
- Keep sentences SHORT (5-10 words max)
- Use examples from daily life: toys, animals, food, family
- Use comparisons to things kids know
- Be warm, encouraging, and use a playful tone
- Include 1-2 relevant emojis in your response
- If explaining something abstract, use a story or analogy
- Never use jargon or complex terminology`,

    10: `You are a patient teacher explaining things to a 10-year-old student.

Rules:
- Use simple, clear language
- Keep sentences fairly short
- Use real-world examples kids can relate to
- You can introduce some basic terms, but always explain them
- Be friendly and encouraging
- Include 1-2 relevant emojis
- Use analogies when helpful`,

    15: `You are explaining things to a curious teenager.

Rules:
- Use clear, accessible language
- You can use some technical terms if you explain them briefly
- Include interesting details and context
- Use relatable examples
- Be conversational but informative
- Include relevant emojis sparingly`,

    20: `You are providing a clear, well-organized explanation.

Rules:
- Use appropriate terminology with brief explanations when needed
- Provide comprehensive but digestible information
- Include relevant examples
- Be informative and engaging
- Structure your response clearly`
  }

  const simplerAddition = isReExplain ? `

IMPORTANT: The user asked for an EVEN SIMPLER explanation. Make this one MUCH simpler than before:
- Use even shorter sentences
- Use even more basic vocabulary
- Add more analogies and examples
- Make it fun and engaging` : ''

  return (basePrompts[ageLevel] || basePrompts[20]) + simplerAddition
}

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
 *   "response": "The cloud is like a big toy box in the sky..."
 * }
 */
router.post('/explain', validateChatRequest, async (req, res, next) => {
  try {
    // SECURITY: Use validated data only (from validator middleware)
    const { question, ageLevel, isReExplain } = req.validatedBody

    // Log request for monitoring (without sensitive data)
    if (securityConfig.logging.logRequestDetails) {
      console.log('[CHAT_REQUEST]', {
        ageLevel,
        isReExplain,
        questionLength: question.length,
        sessionId: req.headers['x-session-id']?.substring(0, 8) || 'anonymous',
        timestamp: new Date().toISOString()
      })
    }

    // Get OpenAI client
    const openai = getOpenAIClient()

    // Build the prompt
    const systemPrompt = getSystemPrompt(ageLevel, isReExplain)
    const userPrompt = isReExplain
      ? `Please explain this even more simply: "${question}"`
      : question

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: securityConfig.openai.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: securityConfig.openai.temperature,
      max_tokens: securityConfig.openai.maxTokens
    })

    // Extract response
    const aiResponse = completion.choices[0]?.message?.content

    if (!aiResponse) {
      throw new Error('No response from AI')
    }

    // Return success response
    res.json({
      success: true,
      response: aiResponse
    })

  } catch (error) {
    // Handle OpenAI-specific errors
    if (error.status === 401) {
      // SECURITY: Don't reveal API key issues to client
      console.error('[OPENAI_ERROR] Invalid API key')
      return res.status(500).json({
        success: false,
        error: 'Service configuration error',
        message: 'The AI service is temporarily unavailable'
      })
    }

    if (error.status === 429) {
      // OpenAI rate limit hit
      console.warn('[OPENAI_RATE_LIMIT] OpenAI rate limit exceeded')
      return res.status(503).json({
        success: false,
        error: 'Service Busy',
        message: 'The AI service is busy. Please try again in a moment.',
        retryAfter: 30
      })
    }

    if (error.status === 500 || error.status === 503) {
      // OpenAI service error
      console.error('[OPENAI_ERROR] OpenAI service error:', error.message)
      return res.status(503).json({
        success: false,
        error: 'Service Unavailable',
        message: 'The AI service is temporarily unavailable. Please try again later.'
      })
    }

    // Pass other errors to global error handler
    next(error)
  }
})

/**
 * GET /api/chat/status
 *
 * Check if chat service is available
 * Useful for frontend to show service status
 */
router.get('/status', (req, res) => {
  const hasApiKey = !!process.env.OPENAI_API_KEY

  res.json({
    available: hasApiKey,
    timestamp: new Date().toISOString()
  })
})

export default router
