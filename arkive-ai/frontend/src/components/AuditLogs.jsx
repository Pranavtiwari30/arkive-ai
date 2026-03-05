import { useState, useEffect } from "react"
import axios from "axios"
import "./AuditLogs.css"

const API = "https://arkive-ai-backend.onrender.com"

function AuditLogs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchLogs() }, [])

  const fetchLogs = async () => {
    try {
      const res = await axios.get(`${API}/api/audit/`)
      setLogs(res.data.logs)
    } catch (err) {
      console.error("Failed to fetch logs", err)
    }
    setLoading(false)
  }

  const getEventVariant = (type) => {
    switch(type) {
      case "flagged_query": return "red"
      case "document_upload": return "green"
      case "query": return "blue"
      default: return "grey"
    }
  }

  const getEventIcon = (type) => {
    switch(type) {
      case "flagged_query":
        return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      case "document_upload":
        return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      case "query":
        return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      default:
        return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
    }
  }

  return (
    <div className="page-container">
      <div className="page-topbar">
        <div className="page-topbar-left">
          <div className="page-topbar-title">Audit Logs</div>
          <div className="page-topbar-sub">Full traceability of all interactions</div>
        </div>
        <button className="topbar-btn" onClick={fetchLogs}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          Refresh
        </button>
      </div>

      <div className="page-content">
        {loading ? (
          <div className="state-message">Loading audit logs...</div>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
            <p>No audit logs recorded yet.</p>
          </div>
        ) : (
          <div className="logs-list">
            {logs.map((log, i) => (
              <div key={i} className={`log-row ${getEventVariant(log.event_type)}`}>
                <div className={`log-icon-wrap ${getEventVariant(log.event_type)}`}>
                  {getEventIcon(log.event_type)}
                </div>
                <div className="log-info">
                  <div className="log-top">
                    <span className={`log-type-badge ${getEventVariant(log.event_type)}`}>
                      {log.event_type.replace("_", " ")}
                    </span>
                    <span className="log-user">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                      {log.user_id}
                    </span>
                    <span className="log-time">{log.timestamp}</span>
                  </div>
                  <div className="log-details">
                    {log.details?.query && <span className="log-detail-item">{log.details.query}</span>}
                    {log.details?.reason && <span className="log-detail-item log-detail-reason">{log.details.reason}</span>}
                    {log.details?.filename && (
                      <span className="log-detail-item">{log.details.filename} — {log.details.total_chunks} chunks</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default AuditLogs