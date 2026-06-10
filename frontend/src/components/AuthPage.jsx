import { useState } from "react"
import api from "../api"
import "./AuthPage.css"

function AuthPage({ onAuthSuccess }) {
  const [mode, setMode] = useState("login") // "login" | "register"
  const [form, setForm] = useState({
    email: "",
    password: "",
    display_name: "",
    organisation: ""
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register"
      const payload = mode === "login"
        ? { email: form.email, password: form.password }
        : {
            email: form.email,
            password: form.password,
            display_name: form.display_name,
            organisation: form.organisation || undefined
          }

      const res = await api.post(endpoint, payload)
      const { access_token, user_id, display_name, email } = res.data

      // Persist token and user info
      localStorage.setItem("arkive_token", access_token)
      localStorage.setItem("arkive_user", JSON.stringify({ user_id, display_name, email }))

      onAuthSuccess({ user_id, display_name, email })
    } catch (err) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        setError(detail[0].msg)
      } else {
        setError(typeof detail === "string" ? detail : "Something went wrong. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <span className="auth-logo-text">Arkive AI</span>
        </div>

        {/* Header */}
        <div className="auth-header">
          <h1>{mode === "login" ? "Welcome back" : "Create your account"}</h1>
          <p>{mode === "login"
            ? "Sign in to access your AI governance workspace."
            : "Start auditing AI policies against global standards."
          }</p>
        </div>

        {/* Tab switcher */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === "login" ? "active" : ""}`}
            onClick={() => {
              setMode("login")
              setError(null)
              setForm({ email: "", password: "", display_name: "", organisation: "" })
            }}
          >Sign In</button>
          <button
            className={`auth-tab ${mode === "register" ? "active" : ""}`}
            onClick={() => {
              setMode("register")
              setError(null)
              setForm({ email: "", password: "", display_name: "", organisation: "" })
            }}
          >Register</button>
        </div>

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {mode === "register" && (
            <>
              <div className="form-field">
                <label htmlFor="display_name">Full Name</label>
                <input
                  id="display_name"
                  name="display_name"
                  type="text"
                  placeholder="Jane Smith"
                  value={form.display_name}
                  onChange={handleChange}
                  required
                  autoComplete="name"
                />
              </div>
              <div className="form-field">
                <label htmlFor="organisation">Organisation <span className="optional">(optional)</span></label>
                <input
                  id="organisation"
                  name="organisation"
                  type="text"
                  placeholder="Acme Corp"
                  value={form.organisation}
                  onChange={handleChange}
                  autoComplete="organization"
                />
              </div>
            </>
          )}

          <div className="form-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@company.com"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder={mode === "register" ? "Minimum 6 characters" : "Your password"}
              value={form.password}
              onChange={handleChange}
              required
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button
            className="auth-submit"
            type="submit"
            disabled={loading}
            id={mode === "login" ? "btn-login-submit" : "btn-register-submit"}
          >
            {loading ? (
              <span className="auth-spinner"/>
            ) : (
              mode === "login" ? "Sign In" : "Create Account"
            )}
          </button>
        </form>


      </div>
    </div>
  )
}

export default AuthPage
