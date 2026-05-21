import { useState } from "react"
import api from "../api"
import "./RiskTier.css"

function RiskTier() {
  const [form, setForm] = useState({
    system_description: "",
    intended_purpose: "",
    data_used: ""
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleClassify = async () => {
    if (!form.system_description || !form.intended_purpose) {
      setError("Please fill out the description and intended purpose.")
      return
    }
    setError(null)
    setLoading(true)
    
    try {
      const res = await api.post("/api/risk-tier/classify", form)
      setResult(res.data)
    } catch (err) {
      console.error(err)
      setError("Failed to classify the AI system. Please try again.")
    }
    setLoading(false)
  }

  const getTierColor = (tier) => {
    if (!tier) return "var(--grey-500)"
    if (tier.includes("Unacceptable")) return "var(--red)"
    if (tier.includes("High")) return "#d97706"
    if (tier.includes("Limited")) return "var(--blue)"
    if (tier.includes("Minimal")) return "var(--green)"
    return "var(--grey-500)"
  }

  return (
    <div className="page-container">
      <div className="page-topbar">
        <div className="page-topbar-left">
          <div className="page-topbar-title">Risk Tier Classification</div>
          <div className="page-topbar-sub">Determine your AI system's risk level under the EU AI Act</div>
        </div>
      </div>

      <div className="page-content">
        <div className="risk-container">
          <div className="risk-form">
            <h2>System Details</h2>
            <p>Provide details about your AI system to classify its risk tier.</p>
            
            <div className="form-group">
              <label>System Description</label>
              <textarea 
                name="system_description" 
                placeholder="e.g., An AI-powered resume screening tool..."
                value={form.system_description}
                onChange={handleChange}
              />
            </div>
            
            <div className="form-group">
              <label>Intended Purpose</label>
              <textarea 
                name="intended_purpose" 
                placeholder="e.g., To automatically filter out unqualified candidates..."
                value={form.intended_purpose}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Data Used</label>
              <textarea 
                name="data_used" 
                placeholder="e.g., Resumes, historical hiring data, demographic info..."
                value={form.data_used}
                onChange={handleChange}
              />
            </div>

            {error && <div className="risk-error">{error}</div>}

            <button 
              className="classify-btn" 
              onClick={handleClassify}
              disabled={loading}
            >
              {loading ? "Classifying..." : "Classify System"}
            </button>
          </div>

          {result && (
            <>
            <div className="risk-result">
              <div className="result-header">
                <h2>Classification Result</h2>
                <div className="tier-badge" style={{ backgroundColor: getTierColor(result.risk_tier), color: "white" }}>
                  {result.risk_tier}
                </div>
              </div>
              
              <div className="result-section">
                <h3>Reasoning</h3>
                <p>{result.reasoning}</p>
                {result.classification_procedure_step && (
                  <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--grey-500)' }}>
                    Triggered at Procedure Step: {result.classification_procedure_step}
                  </p>
                )}
                {result.legal_basis && (
                  <p style={{ fontSize: '12px', color: 'var(--grey-500)' }}>
                    Legal Basis: {result.legal_basis} {result.annex_iii_category && `— Annex III: ${result.annex_iii_category}`}
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
            <div style={{ marginTop: '20px', fontSize: '11px', color: 'var(--grey-500)', lineHeight: '1.5', textAlign: 'center' }}>
              <strong>Legal Disclaimer:</strong> Arkive AI is an informational tool only. Outputs do not constitute legal advice, a conformity assessment, or a legally binding compliance determination under the EU AI Act or any other regulation. For legal compliance obligations, consult a qualified legal professional or accredited conformity assessment body.
            </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default RiskTier
