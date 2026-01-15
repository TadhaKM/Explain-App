/**
 * AI Provider Abstraction Layer
 *
 * Supports multiple AI providers:
 * - OpenAI (GPT-3.5-turbo, GPT-4)
 * - Google AI Studio (Gemini Pro, Gemini Flash)
 *
 * SECURITY: All API keys are stored server-side only
 */

import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { securityConfig } from '../config/security.js'

// =============================================================================
// PROVIDER CLIENTS (Lazy initialization)
// =============================================================================

let openaiClient = null
let geminiClient = null

/**
 * Get OpenAI client (singleton)
 */
function getOpenAIClient() {
  if (!openaiClient && process.env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: securityConfig.ai.timeout
    })
  }
  return openaiClient
}

/**
 * Get Google Gemini client (singleton)
 */
function getGeminiClient() {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  }
  return geminiClient
}

// =============================================================================
// SYSTEM PROMPTS
// =============================================================================

/**
 * Generate system prompt based on age level
 *
 * @param {number} ageLevel - Target age level for explanation
 * @param {boolean} isReExplain - Whether this is a re-explanation request
 * @returns {string} System prompt
 */
export function getSystemPrompt(ageLevel, isReExplain = false) {
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
// OPENAI PROVIDER
// =============================================================================

/**
 * Get response from OpenAI
 *
 * @param {string} systemPrompt - System instruction
 * @param {string} userPrompt - User's question
 * @returns {Promise<string>} AI response
 */
async function getOpenAIResponse(systemPrompt, userPrompt) {
  const client = getOpenAIClient()

  if (!client) {
    throw new Error('OpenAI client not configured')
  }

  const completion = await client.chat.completions.create({
    model: securityConfig.ai.openai.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: securityConfig.ai.temperature,
    max_tokens: securityConfig.ai.maxTokens
  })

  const response = completion.choices[0]?.message?.content

  if (!response) {
    throw new Error('No response from OpenAI')
  }

  return response
}

// =============================================================================
// GEMINI PROVIDER
// =============================================================================

/**
 * Get response from Google Gemini
 *
 * @param {string} systemPrompt - System instruction
 * @param {string} userPrompt - User's question
 * @returns {Promise<string>} AI response
 */
async function getGeminiResponse(systemPrompt, userPrompt) {
  const client = getGeminiClient()

  if (!client) {
    throw new Error('Gemini client not configured')
  }

  // Get the generative model
  const model = client.getGenerativeModel({
    model: securityConfig.ai.gemini.model,
    systemInstruction: systemPrompt
  })

  // Configure generation parameters
  const generationConfig = {
    temperature: securityConfig.ai.temperature,
    maxOutputTokens: securityConfig.ai.maxTokens,
    topP: 0.95,
    topK: 40
  }

  // Generate content
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig
  })

  const response = result.response.text()

  if (!response) {
    throw new Error('No response from Gemini')
  }

  return response
}

// =============================================================================
// UNIFIED API
// =============================================================================

/**
 * Get the currently configured AI provider
 *
 * @returns {'openai' | 'gemini'} Active provider name
 */
export function getActiveProvider() {
  const configuredProvider = process.env.AI_PROVIDER?.toLowerCase()

  // If explicitly configured, use that
  if (configuredProvider === 'gemini' && process.env.GEMINI_API_KEY) {
    return 'gemini'
  }

  if (configuredProvider === 'openai' && process.env.OPENAI_API_KEY) {
    return 'openai'
  }

  // Auto-detect based on available keys
  if (process.env.GEMINI_API_KEY) {
    return 'gemini'
  }

  if (process.env.OPENAI_API_KEY) {
    return 'openai'
  }

  return null
}

/**
 * Check if any AI provider is available
 *
 * @returns {boolean} True if at least one provider is configured
 */
export function isAIAvailable() {
  return getActiveProvider() !== null
}

/**
 * Get AI response using the configured provider
 *
 * @param {string} question - User's question
 * @param {number} ageLevel - Target age level
 * @param {boolean} isReExplain - Whether this is a re-explanation
 * @returns {Promise<{response: string, provider: string}>} AI response with provider info
 */
export async function getAIResponse(question, ageLevel, isReExplain = false) {
  const provider = getActiveProvider()

  if (!provider) {
    throw new Error('No AI provider configured. Set OPENAI_API_KEY or GEMINI_API_KEY.')
  }

  const systemPrompt = getSystemPrompt(ageLevel, isReExplain)
  const userPrompt = isReExplain
    ? `Please explain this even more simply: "${question}"`
    : question

  let response

  if (provider === 'gemini') {
    response = await getGeminiResponse(systemPrompt, userPrompt)
  } else {
    response = await getOpenAIResponse(systemPrompt, userPrompt)
  }

  return {
    response,
    provider
  }
}

/**
 * Handle provider-specific errors and convert to standard format
 *
 * @param {Error} error - The error from the AI provider
 * @param {string} provider - The provider that threw the error
 * @returns {{status: number, message: string, retryAfter?: number}}
 */
export function handleProviderError(error, provider) {
  // OpenAI errors
  if (provider === 'openai') {
    if (error.status === 401) {
      console.error('[OPENAI_ERROR] Invalid API key')
      return {
        status: 500,
        message: 'The AI service is temporarily unavailable'
      }
    }

    if (error.status === 429) {
      console.warn('[OPENAI_RATE_LIMIT] OpenAI rate limit exceeded')
      return {
        status: 503,
        message: 'The AI service is busy. Please try again in a moment.',
        retryAfter: 30
      }
    }

    if (error.status === 500 || error.status === 503) {
      console.error('[OPENAI_ERROR] OpenAI service error:', error.message)
      return {
        status: 503,
        message: 'The AI service is temporarily unavailable. Please try again later.'
      }
    }
  }

  // Gemini errors
  if (provider === 'gemini') {
    const errorMessage = error.message?.toLowerCase() || ''

    if (errorMessage.includes('api key') || errorMessage.includes('401')) {
      console.error('[GEMINI_ERROR] Invalid API key')
      return {
        status: 500,
        message: 'The AI service is temporarily unavailable'
      }
    }

    if (errorMessage.includes('quota') || errorMessage.includes('429') || errorMessage.includes('rate')) {
      console.warn('[GEMINI_RATE_LIMIT] Gemini rate limit exceeded')
      return {
        status: 503,
        message: 'The AI service is busy. Please try again in a moment.',
        retryAfter: 30
      }
    }

    if (errorMessage.includes('500') || errorMessage.includes('503') || errorMessage.includes('unavailable')) {
      console.error('[GEMINI_ERROR] Gemini service error:', error.message)
      return {
        status: 503,
        message: 'The AI service is temporarily unavailable. Please try again later.'
      }
    }

    // Safety filter triggered
    if (errorMessage.includes('safety') || errorMessage.includes('blocked')) {
      console.warn('[GEMINI_SAFETY] Content blocked by safety filters')
      return {
        status: 400,
        message: 'I cannot answer that question. Please try rephrasing it.'
      }
    }
  }

  // Generic error
  console.error(`[${provider.toUpperCase()}_ERROR]`, error.message)
  return {
    status: 500,
    message: 'An error occurred. Please try again.'
  }
}

export default {
  getAIResponse,
  getActiveProvider,
  isAIAvailable,
  getSystemPrompt,
  handleProviderError
}
