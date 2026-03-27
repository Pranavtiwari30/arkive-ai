import { useState } from "react"
import "./Login.css"

function Login({ onLogin }) {
  const [username, setUsername] = useState("")
  const [error, setError] = useState("")

  const handleLogin = () => {
    if (!username.trim()) {
      setError("Please enter a username")
      return
    }
    if (username.trim().length < 3) {
      setError("Username must be at least 3 characters")
      return
    }
    onLogin(username.trim().toLowerCase())
  }

  return (
    <div className="login-screen">
      <div className="login-left">
        <div className="login-brand">
          <div className="login-brand-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <span className="login-brand-name">Arkive AI</span>
        </div>

        <div className="login-hero">
          <h1>AI Compliance,<br/><span>Verified.</span></h1>
          <p>Check your AI systems against UNESCO, OECD, and EU AI Act standards. Know your compliance gaps before regulators do.</p>
        </div>

        <div className="login-standards">
          <span className="std-tag">UNESCO AI Ethics</span>
          <span className="std-tag">OECD Principles</span>
          <span className="std-tag">EU AI Act 2026</span>
        </div>
      </div>

      <div className="login-right">
        <div className="login-form-card">
          <h2>Welcome back</h2>
          <p className="login-form-sub">Sign in to your compliance workspace</p>

          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              className="form-input"
              type="text"
              placeholder="e.g. pranav"
              value={username}
              onChange={e => { setUsername(e.target.value); setError("") }}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              autoFocus
            />
            {error && <p className="form-error">{error}</p>}
          </div>

          <button className="login-submit" onClick={handleLogin}>
            Access Workspace
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>

          <div className="login-trust">
            <div className="trust-item">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              Audit Logged
            </div>
            <div className="trust-item">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              Moderated
            </div>
            <div className="trust-item">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 11 12 14 22 4"/>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
              EU AI Act Ready
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login