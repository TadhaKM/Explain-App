/**
 * Message Component
 *
 * Displays individual chat messages with action buttons.
 *
 * SECURITY:
 * - Content is rendered via React which escapes HTML by default (XSS protection)
 * - No dangerouslySetInnerHTML used
 */

function Message({ message, onReExplain, onExampleClick, isLatestBotMessage, isLoading, isRateLimited }) {
  const { type, content, isError, originalQuestion } = message

  const avatar = type === 'user' ? '🙋' : '🧒'

  // Use originalQuestion if available, otherwise fall back to content
  const questionForActions = originalQuestion || content

  return (
    <div className={`message ${type}-message`}>
      <div className="message-avatar">{avatar}</div>
      <div className={`message-content ${isError ? 'error' : ''}`}>
        {/* Content is safely rendered - React escapes by default */}
        <p>{content}</p>

        {/* Show action buttons for bot messages */}
        {type === 'bot' && isLatestBotMessage && !isError && (
          <div className="message-actions">
            <button
              className="action-btn"
              onClick={() => onReExplain(questionForActions)}
              disabled={isLoading || isRateLimited}
              title={isRateLimited ? 'Please wait before making another request' : 'Get an even simpler explanation'}
            >
              🔄 Even simpler
            </button>
            <button
              className="action-btn"
              onClick={() => onExampleClick(questionForActions)}
              disabled={isLoading || isRateLimited}
              title={isRateLimited ? 'Please wait before making another request' : 'Get a real-world example'}
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
