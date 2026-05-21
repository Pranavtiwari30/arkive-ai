import { useState, useEffect } from "react"
import api from "../api"
import "./RedTeam.css"

const PILLARS = [
  "Transparency",
  "Human Oversight",
  "Privacy & Data Protection",
  "Fairness & Non-discrimination",
  "Accountability",
  "Safety & Security",
  "Sustainability",
  "Inclusivity"
]

function RedTeam() {
  const [documents, setDocuments] = useState([])
  const [selectedDoc, setSelectedDoc] = useState("")
  const [selectedPillar, setSelectedPillar] = useState(PILLARS[0])
  const [attacks, setAttacks] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    // Fetch available documents
    api.get(`/api/documents/`)
      .then(res => {
        const uniqueDocs = []
        const seenIds = new Set()
        
        // Group by document ID since /api/documents/ might return chunks or unique docs depending on implementation
        // Wait, the API returns list(documents_col.find()), which is the unique document entries, not chunks.
        const docs = res.data.documents || []
        docs.forEach(doc => {
           if (!seenIds.has(doc.doc_id)) {
               seenIds.add(doc.doc_id)
               uniqueDocs.push(doc)
           }
        })
        setDocuments(uniqueDocs)
        if (uniqueDocs.length > 0) {
          setSelectedDoc(uniqueDocs[0].doc_id)
        }
      })
      .catch(err => {
        console.error("Failed to fetch documents", err)
      })
  }, [])

  const handleGenerate = async () => {
    if (!selectedDoc) {
      setError("Please select a document first.")
      return
    }
    
    setLoading(true)
    setError("")
    setAttacks([])

    try {
      const res = await api.post(`/api/redteam/generate`, {
        document_id: selectedDoc,
        pillar_name: selectedPillar
      })
      setAttacks(res.data.attacks || [])
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.detail || "Failed to generate attacks.")
    }
    setLoading(false)
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="page-container">
      <div className="page-topbar">
        <div className="page-topbar-left">
          <div className="page-topbar-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--red)' }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="M12 8v4"/>
              <path d="M12 16h.01"/>
            </svg>
            Red Team Simulator
          </div>
          <div className="page-topbar-sub">Generate adversarial prompt injections to test AI policy compliance.</div>
        </div>
      </div>

      <div className="page-content">
        <div className="redteam-controls-card">
          <div className="redteam-control-group">
            <label>Target Policy Document</label>
            <select 
              className="redteam-select"
              value={selectedDoc} 
              onChange={(e) => setSelectedDoc(e.target.value)}
            >
              {documents.length === 0 && <option value="">No documents available</option>}
              {documents.map((doc, i) => (
                <option key={i} value={doc.doc_id}>
                  {doc.filename || doc.doc_id} {doc.is_permanent ? "(Permanent Base)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="redteam-control-group">
            <label>Target Compliance Pillar</label>
            <select 
              className="redteam-select"
              value={selectedPillar} 
              onChange={(e) => setSelectedPillar(e.target.value)}
            >
              {PILLARS.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <button 
            className="generate-btn" 
            onClick={handleGenerate} 
            disabled={loading || !selectedDoc}
          >
            {loading ? (
              <>
                <div className="btn-spinner"></div>
                GENERATING...
              </>
            ) : "GENERATE ATTACKS"}
          </button>
        </div>

        {error && <div className="redteam-error">{error}</div>}

        {loading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <div>Synthesizing adversarial vectors...</div>
          </div>
        )}

        {!loading && attacks.length > 0 && (
          <div className="attacks-list">
            <div className="attacks-header">Generated Attack Vectors</div>
            {attacks.map((attack, index) => (
              <div key={index} className="attack-card">
                <div className="attack-header">
                  <div className="attack-technique">
                    <span className="attack-technique-label">Technique</span>
                    {attack.technique}
                  </div>
                  <button className="copy-btn" onClick={() => copyToClipboard(attack.prompt)}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                    Copy Prompt
                  </button>
                </div>
                <div className="attack-prompt">{attack.prompt}</div>
                <div className="attack-vuln">
                  <span className="vuln-label">Expected Vulnerability:</span> {attack.expected_vulnerability}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default RedTeam
