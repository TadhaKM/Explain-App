/**
 * Chat Interface Component
 *
 * Main chat interface for the ELI5 chatbot.
 *
 * SECURITY:
 * - No API key handling (moved to server)
 * - Input length limits enforced
 * - Rate limit error handling with user feedback
 * - XSS prevention via React's default escaping
 */

import { useState, useRef, useEffect } from 'react'
import Message from './Message'
import { getAIResponse, RateLimitError } from '../utils/api'
import './ChatInterface.css'

// Maximum input length (matches server-side validation)
const MAX_QUESTION_LENGTH = 2000

function ChatInterface({ ageLevel }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: "Hi there! I'm your friendly explainer! Ask me anything and I'll explain it in a super simple way. What would you like to know about today?",
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [rateLimitError, setRateLimitError] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Clear rate limit error after countdown
  useEffect(() => {
    if (rateLimitError) {
      const timer = setInterval(() => {
        setRateLimitError(prev => {
          if (prev && prev.retryAfter > 1) {
            return { ...prev, retryAfter: prev.retryAfter - 1 }
          }
          return null
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [rateLimitError])

  /**
   * Handle input change with length validation
   */
  const handleInputChange = (e) => {
    const value = e.target.value

    // Enforce max length client-side for UX
    if (value.length <= MAX_QUESTION_LENGTH) {
      setInput(value)
    }
  }

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!input.trim() || isLoading || rateLimitError) return

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    const questionAsked = input.trim()
    setInput('')
    setIsLoading(true)

    try {
      const response = await getAIResponse(questionAsked, ageLevel)

      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: response,
        originalQuestion: questionAsked,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, botMessage])
    } catch (error) {
      // Handle rate limiting with user-friendly feedback
      if (error instanceof RateLimitError) {
        setRateLimitError({
          message: error.message,
          retryAfter: error.retryAfter
        })
      }

      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: error instanceof RateLimitError
          ? `Whoa, slow down! You're asking questions faster than I can think! Please wait ${error.retryAfter} seconds.`
          : "Oops! Something went wrong. Let me try again - can you ask that question one more time?",
        isError: true,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  /**
   * Handle re-explain request
   */
  const handleReExplain = async (originalQuestion) => {
    if (isLoading || rateLimitError) return

    setIsLoading(true)

    const reExplainMessage = {
      id: Date.now(),
      type: 'user',
      content: `Can you explain that even simpler?`,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, reExplainMessage])

    try {
      const response = await getAIResponse(
        originalQuestion,
        Math.max(5, ageLevel - 2), // Make it even simpler
        true // isReExplain flag
      )

      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: response,
        originalQuestion: originalQuestion,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, botMessage])
    } catch (error) {
      if (error instanceof RateLimitError) {
        setRateLimitError({
          message: error.message,
          retryAfter: error.retryAfter
        })
      }

      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: "Oops! Let me try that again...",
        isError: true,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Handle example request
   */
  const handleExampleClick = async (originalQuestion) => {
    if (isLoading || rateLimitError) return

    setIsLoading(true)

    const exampleMessage = {
      id: Date.now(),
      type: 'user',
      content: `Give me a real-world example!`,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, exampleMessage])

    try {
      const response = await getAIResponse(
        `Give me a simple, real-world example of: ${originalQuestion}`,
        ageLevel
      )

      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: response,
        originalQuestion: originalQuestion,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, botMessage])
    } catch (error) {
      if (error instanceof RateLimitError) {
        setRateLimitError({
          message: error.message,
          retryAfter: error.retryAfter
        })
      }

      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: "Hmm, I couldn't think of an example right now. Try asking again!",
        isError: true,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const exampleQuestions = [
    "What is the cloud?",
    "How does the internet work?",
    "What is AI?",
    "Why is the sky blue?"
  ]

  // Calculate remaining characters
  const remainingChars = MAX_QUESTION_LENGTH - input.length
  const showCharCount = input.length > MAX_QUESTION_LENGTH * 0.8

  return (
    <div className="chat-interface">
      <div className="messages-container">
        {messages.map((message, index) => (
          <Message
            key={message.id}
            message={message}
            onReExplain={handleReExplain}
            onExampleClick={handleExampleClick}
            isLatestBotMessage={
              message.type === 'bot' &&
              index === messages.length - 1 &&
              !message.isError
            }
            isLoading={isLoading}
            isRateLimited={!!rateLimitError}
          />
        ))}

        {isLoading && (
          <div className="message bot-message loading-message">
            <div className="message-avatar">🤔</div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Rate limit warning banner */}
      {rateLimitError && (
        <div className="rate-limit-banner">
          <span>⏳</span>
          Please wait {rateLimitError.retryAfter}s before asking another question
        </div>
      )}

      {messages.length === 1 && (
        <div className="example-questions">
          <p>Try asking:</p>
          <div className="example-buttons">
            {exampleQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => setInput(q)}
                className="example-btn"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      <form className="input-form" onSubmit={handleSubmit}>
        <div className="input-wrapper-form">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder={rateLimitError ? "Please wait..." : "Ask me anything..."}
            disabled={isLoading || !!rateLimitError}
            className="message-input"
            maxLength={MAX_QUESTION_LENGTH}
          />
          {showCharCount && (
            <span className={`char-count ${remainingChars < 100 ? 'warning' : ''}`}>
              {remainingChars}
            </span>
          )}
        </div>
        <button
          type="submit"
          disabled={isLoading || !input.trim() || !!rateLimitError}
          className="send-button"
        >
          {isLoading ? '⏳' : rateLimitError ? '⏸️' : '🚀'}
        </button>
      </form>
    </div>
  )
}

export default ChatInterface
