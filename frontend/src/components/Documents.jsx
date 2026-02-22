import { useState, useEffect } from "react"
import axios from "axios"
import "./Documents.css"

const API = "http://127.0.0.1:8000"

function Documents() {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    try {
      const res = await axios.get(`${API}/api/documents/`)
      setDocuments(res.data.documents)
    } catch (err) {
      console.error("Failed to fetch documents", err)
    }
    setLoading(false)
  }

  return (
    <div className="tab-container">
      <div className="tab-header">
        <h1>📄 Knowledge Base</h1>
        <p>All documents indexed in Arkive AI</p>
      </div>

      {loading ? (
        <div className="loading">Loading documents...</div>
      ) : documents.length === 0 ? (
        <div className="empty">No documents uploaded yet.</div>
      ) : (
        <div className="docs-grid">
          {documents.map((doc, i) => (
            <div key={i} className="doc-card">
              <div className="doc-icon">📄</div>
              <div className="doc-info">
                <h3>{doc.filename}</h3>
                <div className="doc-meta">
                  <span>📑 {doc.total_pages} pages</span>
                  <span>🧩 {doc.total_chunks} chunks</span>
                  <span>👤 {doc.uploaded_by}</span>
                </div>
                <div className="doc-date">
                  {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleString() : "N/A"}
                </div>
              </div>
              <div className={`doc-badge ${doc.is_permanent ? "permanent" : "temporary"}`}>
                {doc.is_permanent ? "📌 Permanent" : "⏳ 7 days"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Documents