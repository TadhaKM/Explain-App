import { useState } from 'react'

function Message({ message, onReExplain, onExampleClick, isLatestBotMessage, isLoading }) {
  const { type, content, isError } = message
  const [lastQuestion] = useState(content)

  const avatar = type === 'user' ? '🙋' : '🧒'

  // Extract the original question from bot messages for re-explain
  const extractQuestion = () => {
    // Find the user message content (simplified approach - use the message before)
    return lastQuestion
  }

  return (
    <div className={`message ${type}-message`}>
      <div className="message-avatar">{avatar}</div>
      <div className={`message-content ${isError ? 'error' : ''}`}>
        <p>{content}</p>

        {/* Show action buttons for bot messages */}
        {type === 'bot' && isLatestBotMessage && !isError && (
          <div className="message-actions">
            <button
              className="action-btn"
              onClick={() => onReExplain(content)}
              disabled={isLoading}
            >
              🔄 Even simpler
            </button>
            <button
              className="action-btn"
              onClick={() => onExampleClick(content)}
              disabled={isLoading}
            >
              💡 Give example
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Message
