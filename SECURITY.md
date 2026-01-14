# Security Documentation

This document outlines the security measures implemented in the ELI5 Chatbot application.

## Architecture Overview

The application follows a secure client-server architecture:

```
┌─────────────┐     HTTPS      ┌─────────────┐     HTTPS      ┌─────────────┐
│   Browser   │ ◄────────────► │   Express   │ ◄────────────► │   OpenAI    │
│  (React)    │                │   Server    │                │    API      │
└─────────────┘                └─────────────┘                └─────────────┘
                                     │
                                     ▼
                               ┌─────────────┐
                               │ Environment │
                               │  Variables  │
                               │ (API Keys)  │
                               └─────────────┘
```

## Security Features

### 1. API Key Protection

**Problem Solved:** API keys exposed in client-side code can be stolen and abused.

**Implementation:**
- OpenAI API key is stored **only** in server-side environment variables
- Key is **never** sent to or accessible from the browser
- Server acts as a secure proxy for all AI requests
- Key format validation at startup prevents misconfiguration

**Files:**
- `server/index.js` - Environment validation
- `.env.example` - Configuration template
- `.gitignore` - Prevents `.env` from being committed

### 2. Rate Limiting

**Problem Solved:** Prevents API abuse, DoS attacks, and cost overruns.

**Implementation:**

| Limiter | Window | Max Requests | Scope |
|---------|--------|--------------|-------|
| Global | 15 min | 100 | Per IP |
| Chat | 1 min | 10 | Per IP + Session |
| Burst | 1 sec | 3 | Per IP + Session |

**OWASP Reference:** [API4:2023 - Unrestricted Resource Consumption](https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/)

**User Experience:**
- Graceful 429 responses with `Retry-After` header
- Client-side countdown timer shows when to retry
- User-friendly error messages

**Files:**
- `server/middleware/rateLimiter.js`
- `server/config/security.js`

### 3. Input Validation & Sanitization

**Problem Solved:** Prevents injection attacks (XSS, SQL, Command injection).

**Implementation:**

**Server-side (Authoritative):**
- Zod schema validation with strict mode
- Type checking for all fields
- Length limits (max 2000 characters for questions)
- Whitelist validation for age levels (5, 10, 15, 20)
- Unexpected fields are rejected
- Suspicious pattern detection (script tags, SQL keywords, etc.)
- HTML entity escaping
- Null byte removal
- Unicode normalization (prevents homograph attacks)

**Client-side (UX only):**
- Input length limits
- Real-time character counter
- Age level validation

**OWASP Reference:** [API3:2023 - Broken Object Property Level Authorization](https://owasp.org/API-Security/editions/2023/en/0xa3-broken-object-property-level-authorization/)

**Files:**
- `server/middleware/validator.js`
- `src/utils/api.js` (client-side validation)

### 4. Security Headers (Helmet)

**Problem Solved:** Various browser-based attacks.

**Headers Set:**
- `Content-Security-Policy` - Prevents XSS and data injection
- `X-Frame-Options` - Prevents clickjacking
- `X-Content-Type-Options` - Prevents MIME sniffing
- `X-XSS-Protection` - Additional XSS protection
- `Strict-Transport-Security` - Enforces HTTPS
- `X-Powered-By` - Removed to hide tech stack

**Files:**
- `server/index.js`

### 5. CORS Configuration

**Problem Solved:** Unauthorized cross-origin requests.

**Implementation:**
- Strict origin whitelist
- Only allowed origins can make requests
- Blocked requests are logged for security monitoring
- Configurable via `ALLOWED_ORIGINS` environment variable

**Files:**
- `server/index.js`

### 6. Request Size Limits

**Problem Solved:** DoS attacks via large payloads.

**Implementation:**
- Maximum request body size: 10KB
- Strict JSON parsing (only objects/arrays)

**Files:**
- `server/index.js`
- `server/config/security.js`

### 7. Error Handling

**Problem Solved:** Information disclosure through error messages.

**Implementation:**
- Detailed errors logged server-side only
- Generic error messages sent to clients in production
- OpenAI-specific errors handled gracefully
- No stack traces exposed to users

**Files:**
- `server/index.js`
- `server/routes/chat.js`

## Security Configuration

All security settings are centralized in `server/config/security.js`:

```javascript
{
  rateLimit: {
    global: { windowMs: 900000, max: 100 },
    chat: { windowMs: 60000, max: 10 },
    burst: { windowMs: 1000, max: 3 }
  },
  validation: {
    maxQuestionLength: 2000,
    allowedAgeLevels: [5, 10, 15, 20]
  },
  maxRequestSize: '10kb'
}
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | Your OpenAI API key (starts with `sk-`) |
| `PORT` | No | Server port (default: 3001) |
| `NODE_ENV` | No | `development` or `production` |
| `ALLOWED_ORIGINS` | No | Comma-separated list of allowed CORS origins |
| `TRUST_PROXY` | No | Set to `true` if behind a reverse proxy |

## Security Checklist for Production

- [ ] Set `NODE_ENV=production`
- [ ] Use HTTPS (SSL/TLS certificate)
- [ ] Set appropriate `ALLOWED_ORIGINS`
- [ ] Configure `TRUST_PROXY` if behind load balancer
- [ ] Rotate `OPENAI_API_KEY` periodically (every 90 days recommended)
- [ ] Set up monitoring for rate limit violations
- [ ] Review and adjust rate limits based on traffic patterns
- [ ] Enable server access logs
- [ ] Set up alerting for unusual API usage patterns

## Reporting Security Issues

If you discover a security vulnerability, please report it responsibly:

1. Do not open a public issue
2. Contact the maintainers directly
3. Allow time for a fix before public disclosure

## OWASP API Security Top 10 Coverage

| Risk | Status | Implementation |
|------|--------|----------------|
| API1:2023 Broken Object Level Authorization | N/A | No user objects |
| API2:2023 Broken Authentication | N/A | No authentication |
| API3:2023 Broken Object Property Level Authorization | ✅ | Zod strict schema |
| API4:2023 Unrestricted Resource Consumption | ✅ | Rate limiting |
| API5:2023 Broken Function Level Authorization | N/A | Single role |
| API6:2023 Unrestricted Access to Sensitive Flows | ✅ | Rate limiting |
| API7:2023 Server Side Request Forgery | ✅ | No user URLs |
| API8:2023 Security Misconfiguration | ✅ | Secure defaults |
| API9:2023 Improper Inventory Management | ✅ | Single API version |
| API10:2023 Unsafe Consumption of APIs | ✅ | Error handling |

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-01 | Initial security implementation |
