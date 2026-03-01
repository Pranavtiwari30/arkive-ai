import { useState, useRef } from "react"
import axios from "axios"
import "./ComplianceCheck.css"

const API = "https://arkive-ai-backend.onrender.com"

const PILLARS = [
  { key: "transparency", label: "Transparency", ref: "UNESCO Art. 21 · OECD 1.2" },
  { key: "human_oversight", label: "Human Oversight", ref: "EU AI Act Art. 14 · OECD 1.4" },
  { key: "privacy", label: "Privacy & Data Protection", ref: "EU AI Act Art. 10 · UNESCO Art. 22" },
  { key: "fairness", label: "Fairness & Non-discrimination", ref: "UNESCO Art. 23 · OECD 1.3" },
  { key: "accountability", label: "Accountability", ref: "EU AI Act Art. 16 · OECD 1.5" },
  { key: "safety", label: "Safety & Security", ref: "EU AI Act Art. 9 · UNESCO Art. 24" },
  { key: "sustainability", label: "Sustainability", ref: "UNESCO Art. 25 · OECD 1.1" },
  { key: "inclusivity", label: "Inclusivity", ref: "UNESCO Art. 26 · OECD 1.3" },
]

function ComplianceCheck({ userId }) {
  const [file, setFile] = useState(null)
  const [checking, setChecking] = useState(false)
  const [report, setReport] = useState(null)
  const [error, setError] = useState("")
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef(null)

  const handleFile = (f) => {
    if (f && f.type === "application/pdf") {
      setFile(f)
      setError("")
      setReport(null)
    } else {
      setError("Please upload a PDF file.")
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    handleFile(f)
  }

  const runCheck = async () => {
    if (!file) return
    setChecking(true)
    setError("")
    setReport(null)

    const formData = new FormData()
    formData.append("file", file)
    formData.append("user_id", userId)

    try {
      const res = await axios.post(`${API}/api/compliance/check`, formData)
      setReport(res.data)
    } catch (err) {
      setError("Compliance check failed. Please try again.")
    }
    setChecking(false)
  }

  const resetCheck = () => {
    setFile(null)
    setReport(null)
    setError("")
  }

  const passCount = report
    ? PILLARS.filter(p => report.results?.[p.key]?.status === "pass").length
    : 0

  return (
    <div className="page-container">
      <div className="page-topbar">
        <div className="page-topbar-left">
          <div className="page-topbar-title">Compliance Check</div>
          <div className="page-topbar-sub">Upload your AI policy to verify against international standards</div>
        </div>
        {report && (
          <div className="topbar-actions">
            <button className="topbar-btn" onClick={resetCheck}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              New Check
            </button>
          </div>
        )}
      </div>

      <div className="page-content">
        {!report && (
          <>
            <div className="compliance-intro">
              <h2>Policy Compliance Verification</h2>
              <p>Upload your organisation's AI policy document. Arkive AI will check it against 8 compliance pillars derived from UNESCO AI Ethics, OECD AI Principles, and the EU AI Act.</p>
              <div className="standards-row">
                <span className="std-chip">UNESCO AI Ethics (2021)</span>
                <span className="std-chip">OECD AI Principles (2019)</span>
                <span className="std-chip">EU AI Act (2024)</span>
              </div>
            </div>

            <div
              className={`upload-zone ${dragOver ? "drag-over" : ""} ${file ? "has-file" : ""}`}
              onClick={() => !file && fileRef.current.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".pdf"
                ref={fileRef}
                onChange={e => handleFile(e.target.files[0])}
                style={{ display: "none" }}
              />

              {file ? (
                <div className="file-selected">
                  <div className="file-selected-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                  </div>
                  <div className="file-selected-info">
                    <div className="file-selected-name">{file.name}</div>
                    <div className="file-selected-size">{(file.size / 1024).toFixed(1)} KB — Ready to check</div>
                  </div>
                  <button className="file-remove-btn" onClick={(e) => { e.stopPropagation(); setFile(null) }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              ) : (
                <>
                  <div className="upload-icon-wrap">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                  </div>
                  <div className="upload-text">
                    <h3>Drop your AI policy PDF here</h3>
                    <p>or click to browse files</p>
                  </div>
                </>
              )}
            </div>

            {error && <p className="compliance-error">{error}</p>}

            <button
              className="run-check-btn"
              onClick={runCheck}
              disabled={!file || checking}
            >
              {checking ? (
                <>
                  <div className="btn-spinner"/>
                  Analysing document...
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 11 12 14 22 4"/>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                  </svg>
                  Run Compliance Check
                </>
              )}
            </button>

            <div className="pillars-preview">
              <div className="pillars-preview-label">8 compliance pillars checked</div>
              <div className="pillars-preview-grid">
                {PILLARS.map(p => (
                  <div key={p.key} className="pillar-preview-item">
                    <div className="pillar-preview-dot"/>
                    {p.label}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {report && (
          <div className="report-card">
            <div className="report-header">
              <div className="report-header-left">
                <div className="report-file-row">
                  <div className="report-file-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                  </div>
                  <div>
                    <div className="report-filename">{file?.name}</div>
                    <div className="report-meta">
                      Analysed · {new Date().toLocaleDateString()} · 3 standards · 8 pillars
                    </div>
                  </div>
                </div>
              </div>
              <div className={`score-badge ${passCount >= 6 ? "good" : passCount >= 4 ? "partial" : "poor"}`}>
                <div className="score-number">{passCount}/8</div>
                <div className="score-label">
                  {passCount >= 6 ? "Compliant" : passCount >= 4 ? "Partial" : "Non-Compliant"}
                </div>
              </div>
            </div>

            <div className="report-standards-bar">
              <span className="standards-bar-label">Standards</span>
              <span className="std-chip-sm">UNESCO AI Ethics</span>
              <span className="std-chip-sm">OECD Principles</span>
              <span className="std-chip-sm">EU AI Act 2024</span>
            </div>

            <div className="pillars-grid">
              {PILLARS.map(p => {
                const result = report.results?.[p.key]
                const pass = result?.status === "pass"
                return (
                  <div key={p.key} className="pillar-row">
                    <div className={`pillar-status ${pass ? "pass" : "fail"}`}>
                      {pass ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      ) : (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      )}
                    </div>
                    <div className="pillar-info">
                      <div className="pillar-name">{p.label}</div>
                      <div className="pillar-ref">{p.ref}</div>
                      {result?.note && (
                        <div className="pillar-note">{result.note}</div>
                      )}
                    </div>
                    <span className={`pillar-chip ${pass ? "pass" : "fail"}`}>
                      {pass ? "PASS" : "GAP"}
                    </span>
                  </div>
                )
              })}
            </div>

            {report.gaps && report.gaps.length > 0 && (
              <div className="report-gaps">
                <div className="gaps-title">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  Recommendations
                </div>
                <div className="gaps-list">
                  {report.gaps.map((gap, i) => (
                    <div key={i} className="gap-item">
                      <div className="gap-number">{i + 1}</div>
                      <div className="gap-text">{gap}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="report-footer">
              <div className="report-deadline">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                EU AI Act enforcement deadline: August 2026
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ComplianceCheck