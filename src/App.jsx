/**
 * ELI5 Chatbot - Main App Component
 *
 * SECURITY: API key is no longer handled client-side.
 * All API calls go through our secure backend server.
 */

import { useState, useEffect } from 'react'
import ChatInterface from './components/ChatInterface'
import AgeSelector from './components/AgeSelector'
import ServiceStatus from './components/ServiceStatus'
import { checkServiceStatus } from './utils/api'
import './App.css'

function App() {
  const [ageLevel, setAgeLevel] = useState(5)
  const [serviceAvailable, setServiceAvailable] = useState(null) // null = checking

  // Check if backend service is available on mount
  useEffect(() => {
    async function checkStatus() {
      const available = await checkServiceStatus()
      setServiceAvailable(available)
    }

    checkStatus()
  }, [])

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

      {serviceAvailable === null ? (
        // Loading state
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Connecting to service...</p>
        </div>
      ) : serviceAvailable === false ? (
        // Service unavailable
        <ServiceStatus />
      ) : (
        // Main app
        <main className="app-main">
          <AgeSelector ageLevel={ageLevel} setAgeLevel={setAgeLevel} />
          <ChatInterface ageLevel={ageLevel} />
        </main>
      )}

      <footer className="app-footer">
        <p>Made with 💜 for curious minds everywhere</p>
      </footer>
    </div>
  )
}

export default App
