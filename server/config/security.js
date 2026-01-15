/**
 * Security Configuration
 *
 * Centralized security settings for the application.
 * All security-related constants should be defined here.
 *
 * IMPORTANT: Review these settings before deploying to production!
 */

export const securityConfig = {
  /**
   * Rate Limiting Configuration
   *
   * Settings for different rate limiters.
   * Adjust based on your expected traffic and abuse patterns.
   */
  rateLimit: {
    /**
     * Global rate limit - applies to all endpoints
     * Generous limits for normal usage
     */
    global: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // 100 requests per 15 minutes per IP
    },

    /**
     * Chat endpoint rate limit - stricter for AI endpoints
     * These cost money and resources, so limit more aggressively
     */
    chat: {
      windowMs: 60 * 1000, // 1 minute window
      max: 10 // 10 chat requests per minute (per IP + session)
    },

    /**
     * Burst protection - very short window
     * Catches rapid-fire automated requests
     */
    burst: {
      windowMs: 1000, // 1 second
      max: 3 // Max 3 requests per second
    }
  },

  /**
   * Input Validation Configuration
   */
  validation: {
    // Maximum length for user questions
    maxQuestionLength: 2000,

    // Allowed age levels (whitelist approach)
    allowedAgeLevels: [5, 10, 15, 20],

    // Maximum messages in conversation history (if implemented)
    maxConversationHistory: 10
  },

  /**
   * Request Size Limits
   *
   * Prevents DoS attacks via large payloads
   */
  maxRequestSize: '10kb',

  /**
   * Session Configuration
   */
  session: {
    // How long to track sessions for rate limiting
    maxAge: 3600000, // 1 hour

    // Session ID header name
    headerName: 'X-Session-ID'
  },

  /**
   * AI Provider Configuration
   *
   * Settings for AI API calls (supports OpenAI, Gemini, and Claude)
   */
  ai: {
    // Shared settings across providers
    maxTokens: 500,
    temperature: 0.7,
    timeout: 30000, // 30 seconds

    // OpenAI-specific settings
    openai: {
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo'
    },

    // Google Gemini-specific settings
    gemini: {
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash'
    },

    // Anthropic Claude-specific settings
    claude: {
      model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022'
    }
  },

  /**
   * Logging Configuration
   */
  logging: {
    // Whether to log rate limit hits
    logRateLimits: true,

    // Whether to log validation failures
    logValidationFailures: true,

    // Whether to log request details (disable in production for privacy)
    logRequestDetails: process.env.NODE_ENV !== 'production'
  }
}

/**
 * Environment-specific overrides
 *
 * Production environment should have stricter settings
 */
if (process.env.NODE_ENV === 'production') {
  // Stricter rate limits in production
  securityConfig.rateLimit.chat.max = 5 // Fewer requests allowed

  // Don't log request details in production
  securityConfig.logging.logRequestDetails = false
}

export default securityConfig
