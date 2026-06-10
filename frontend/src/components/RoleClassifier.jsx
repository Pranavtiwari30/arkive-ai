import { useState } from "react"
import api from "../api"
import "./RoleClassifier.css"

function RoleClassifier() {
  const [form, setForm] = useState({
    organization_name: "",
    involvement: "",
    system_origin: ""
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleClassify = async () => {
    if (!form.organization_name || !form.involvement || !form.system_origin) {
      setError("Please fill out all fields.")
      return
    }
    setError(null)
    setLoading(true)
    
    try {
      const res = await api.post("/api/role/classify", form)
      setResult(res.data)
    } catch (err) {
      console.error(err)
      setError("Failed to classify the organizational role. Please try again.")
    }
    setLoading(false)
  }

  const getRoleColor = (role) => {
    if (!role) return "var(--grey-500)"
    if (role.includes("Provider")) return "var(--blue)"
    if (role.includes("Deployer")) return "var(--green)"
    if (role.includes("Importer")) return "#8b5cf6" // Purple
    if (role.includes("Distributor")) return "#f59e0b" // Amber
    return "var(--grey-500)"
  }

  return (
    <div className="page-container">
      <div className="page-topbar">
        <div className="page-topbar-left">
          <div className="page-topbar-title">Role Classification</div>
          <div className="page-topbar-sub">Identify your organization's legal role under the EU AI Act</div>
        </div>
      </div>

      <div className="page-content">
        <div className="role-container">
          <div className="role-form">
            <h2>Organization Details</h2>
            <p>Describe your relationship with the AI system to determine your compliance obligations.</p>
            
            <div className="form-group">
              <label>Organization Name</label>
              <input 
                type="text"
                name="organization_name" 
                placeholder="e.g., Acme Corp"
                value={form.organization_name}
                onChange={handleChange}
              />
            </div>
            
            <div className="form-group">
              <label>Involvement with the AI System</label>
              <textarea 
                name="involvement" 
                placeholder="e.g., We use the system internally to filter resumes, but we didn't build it."
                value={form.involvement}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>System Origin / Development</label>
              <textarea 
                name="system_origin" 
                placeholder="e.g., Purchased from a vendor based in the US."
                value={form.system_origin}
                onChange={handleChange}
              />
            </div>

            {error && <div className="role-error">{error}</div>}

            <button 
              className="classify-btn" 
              onClick={handleClassify}
              disabled={loading}
            >
              {loading ? "Classifying..." : "Determine Role"}
            </button>
          </div>

          {result && (
            <>
            <div className="role-result">
              <div className="result-header">
                <h2>Classification Result</h2>
                <div className="role-badge" style={{ backgroundColor: getRoleColor(result.primary_role || (result.roles && result.roles[0])), color: "white" }}>
                  {result.primary_role || (result.roles && result.roles.join(" + "))}
                </div>
              </div>
              
              <div className="result-section">
                <h3>Reasoning</h3>
                <p>{result.reasoning}</p>
                {result.decision_path && (
                  <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--grey-500)' }}>
                    Decision Path: {result.decision_path}
                  </p>
                )}
                {result.legal_basis && result.legal_basis.length > 0 && (
                  <p style={{ fontSize: '12px', color: 'var(--grey-500)' }}>
                    Legal Basis: {result.legal_basis.join(", ")}
                  </p>
                )}
              </div>

              <div className="result-section">
                <h3>Classification Method</h3>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--grey-50)', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--grey-200)', fontSize: '12.5px', color: 'var(--grey-700)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  LLM-classified — verify with legal counsel
                </div>
              </div>

              {result.obligations && result.obligations.length > 0 && (
                <div className="result-section">
                  <h3>Key Obligations</h3>
                  <ul className="obligations-list">
                    {result.obligations.map((obs, i) => (
                      <li key={i}>
                        <strong>{obs.article}</strong>: {obs.obligation}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default RoleClassifier
