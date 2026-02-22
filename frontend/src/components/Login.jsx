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
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">🗂️</div>
        <h1 className="login-title">Arkive AI</h1>
        <p className="login-subtitle">
          Ethical AI powered by UNESCO & OECD principles
        </p>

        <div className="login-form">
          <label className="login-label">Enter your username to continue</label>
          <input
            className="login-input"
            type="text"
            placeholder="e.g. pranav"
            value={username}
            onChange={e => {
              setUsername(e.target.value)
              setError("")
            }}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            autoFocus
          />
          {error && <p className="login-error">{error}</p>}
          <button className="login-btn" onClick={handleLogin}>
            Enter Arkive AI →
          </button>
        </div>

        <div className="login-footer">
          <span>🔒 Audit logged</span>
          <span>🛡️ Moderated</span>
          <span>📚 RAG powered</span>
        </div>
      </div>
    </div>
  )
}

export default Login