import { useState } from 'react'
import ChatInterface from './components/ChatInterface'
import AgeSelector from './components/AgeSelector'
import ApiKeyInput from './components/ApiKeyInput'
import './App.css'

function App() {
  const [ageLevel, setAgeLevel] = useState(5)
  const [apiKey, setApiKey] = useState('')
  const [isApiKeySet, setIsApiKeySet] = useState(false)

  const handleApiKeySubmit = (key) => {
    setApiKey(key)
    setIsApiKeySet(true)
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">
          <span className="logo-emoji">🧒</span>
          <h1>ELI5</h1>
        </div>
        <p className="tagline">Explain Like I'm Five</p>
        <p className="subtitle">Ask anything - get simple, friendly answers!</p>
      </header>

      {!isApiKeySet ? (
        <ApiKeyInput onSubmit={handleApiKeySubmit} />
      ) : (
        <main className="app-main">
          <AgeSelector ageLevel={ageLevel} setAgeLevel={setAgeLevel} />
          <ChatInterface ageLevel={ageLevel} apiKey={apiKey} />
        </main>
      )}

      <footer className="app-footer">
        <p>Made with 💜 for curious minds everywhere</p>
      </footer>
    </div>
  )
}

export default App
