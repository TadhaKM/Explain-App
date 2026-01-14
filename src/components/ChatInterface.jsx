import { useState, useRef, useEffect } from 'react'
import Message from './Message'
import { getAIResponse } from '../utils/api'
import './ChatInterface.css'

function ChatInterface({ ageLevel, apiKey }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: "Hi there! 👋 I'm your friendly explainer! Ask me anything and I'll explain it in a super simple way. What would you like to know about today?",
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await getAIResponse(input.trim(), ageLevel, apiKey)

      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: response,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, botMessage])
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: "Oops! 😅 Something went wrong. Let me try again - can you ask that question one more time?",
        isError: true,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleReExplain = async (originalQuestion) => {
    setIsLoading(true)

    const reExplainMessage = {
      id: Date.now(),
      type: 'user',
      content: `Can you explain "${originalQuestion}" even simpler?`,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, reExplainMessage])

    try {
      const response = await getAIResponse(
        originalQuestion,
        Math.max(3, ageLevel - 2), // Make it even simpler
        apiKey,
        true // isReExplain flag
      )

      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: response,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, botMessage])
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: "Oops! Let me try that again... 🤔",
        isError: true,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleExampleClick = async (originalQuestion) => {
    setIsLoading(true)

    const exampleMessage = {
      id: Date.now(),
      type: 'user',
      content: `Give me a real-world example of "${originalQuestion}"`,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, exampleMessage])

    try {
      const response = await getAIResponse(
        `Give me a simple, real-world example of: ${originalQuestion}`,
        ageLevel,
        apiKey
      )

      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: response,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, botMessage])
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: "Hmm, I couldn't think of an example right now. Try asking again! 🌟",
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
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me anything... 🌟"
          disabled={isLoading}
          className="message-input"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="send-button"
        >
          {isLoading ? '⏳' : '🚀'}
        </button>
      </form>
    </div>
  )
}

export default ChatInterface
