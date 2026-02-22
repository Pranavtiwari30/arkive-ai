import { useState, useEffect } from "react"
import axios from "axios"
import "./AuditLogs.css"

const API = "http://127.0.0.1:8000"

function AuditLogs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    try {
      const res = await axios.get(`${API}/api/audit/`)
      setLogs(res.data.logs)
    } catch (err) {
      console.error("Failed to fetch logs", err)
    }
    setLoading(false)
  }

  const getEventColor = (type) => {
    switch(type) {
      case "flagged_query": return "red"
      case "document_upload": return "green"
      case "query": return "blue"
      default: return "grey"
    }
  }

  const getEventIcon = (type) => {
    switch(type) {
      case "flagged_query": return "🚩"
      case "document_upload": return "📄"
      case "query": return "💬"
      default: return "📝"
    }
  }

  return (
    <div className="tab-container">
      <div className="tab-header">
        <h1>🔒 Audit Logs</h1>
        <p>Full traceability of all interactions</p>
      </div>

      {loading ? (
        <div className="loading">Loading audit logs...</div>
      ) : logs.length === 0 ? (
        <div className="empty">No audit logs yet.</div>
      ) : (
        <div className="logs-container">
          {logs.map((log, i) => (
            <div key={i} className={`log-row ${getEventColor(log.event_type)}`}>
              <div className="log-icon">{getEventIcon(log.event_type)}</div>
              <div className="log-info">
                <div className="log-top">
                  <span className={`log-type ${getEventColor(log.event_type)}`}>
                    {log.event_type}
                  </span>
                  <span className="log-user">👤 {log.user_id}</span>
                  <span className="log-time">{log.timestamp}</span>
                </div>
                <div className="log-details">
                  {log.details?.query && (
                    <span>❓ {log.details.query}</span>
                  )}
                  {log.details?.reason && (
                    <span className="log-reason">⚠️ {log.details.reason}</span>
                  )}
                  {log.details?.filename && (
                    <span>📄 {log.details.filename} ({log.details.total_chunks} chunks)</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AuditLogs