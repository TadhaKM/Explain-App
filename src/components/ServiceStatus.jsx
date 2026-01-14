/**
 * Service Status Component
 *
 * Displayed when the backend service is unavailable.
 * Provides helpful information for users and administrators.
 */

import './ServiceStatus.css'

function ServiceStatus() {
  return (
    <div className="service-status">
      <div className="service-status-card">
        <div className="status-icon">🔧</div>
        <h2>Service Temporarily Unavailable</h2>
        <p className="status-description">
          We're having trouble connecting to our explanation service.
          This usually means the server is starting up or being updated.
        </p>

        <div className="status-tips">
          <h3>What you can do:</h3>
          <ul>
            <li>Wait a few moments and refresh the page</li>
            <li>Check your internet connection</li>
            <li>Try again later</li>
          </ul>
        </div>

        <button
          className="retry-btn"
          onClick={() => window.location.reload()}
        >
          Refresh Page
        </button>

        <div className="admin-info">
          <p><strong>For administrators:</strong></p>
          <p>Ensure the backend server is running and the OPENAI_API_KEY environment variable is set.</p>
        </div>
      </div>
    </div>
  )
}

export default ServiceStatus
