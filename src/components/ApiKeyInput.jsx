import { useState } from 'react'
import './ApiKeyInput.css'

function ApiKeyInput({ onSubmit }) {
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (apiKey.trim()) {
      onSubmit(apiKey.trim())
    }
  }

  return (
    <div className="api-key-container">
      <div className="api-key-card">
        <div className="api-key-icon">🔑</div>
        <h2>Enter Your OpenAI API Key</h2>
        <p className="api-key-description">
          To use this app, you'll need an OpenAI API key.
          Your key stays in your browser and is never stored on any server.
        </p>

        <form onSubmit={handleSubmit} className="api-key-form">
          <div className="input-wrapper">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="api-key-input"
            />
            <button
              type="button"
              className="toggle-visibility"
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
          <button
            type="submit"
            className="submit-btn"
            disabled={!apiKey.trim()}
          >
            Start Chatting! 🚀
          </button>
        </form>

        <div className="api-key-help">
          <p>Don't have an API key?</p>
          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
          >
            Get one from OpenAI →
          </a>
        </div>
      </div>
    </div>
  )
}

export default ApiKeyInput
