import { useState, useEffect } from "react"
import api from "../api"
import "./Documents.css"
function Documents() {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [kbMetadata, setKbMetadata] = useState(null)

  const fetchDocuments = async () => {
    try {
      const res = await api.get(`/api/documents/`)
      setDocuments(res.data.documents)
    } catch (err) {
      console.error("Failed to fetch documents", err)
    }
    setLoading(false)
  }

  const fetchKbMetadata = async () => {
    try {
      const res = await api.get(`/api/documents/knowledge-base/metadata`)
      setKbMetadata(res.data)
    } catch (err) {
      console.error("Failed to fetch KB metadata", err)
    }
  }

  useEffect(() => {
    fetchDocuments()
    fetchKbMetadata()
  }, [])

  const expiringDocs = documents.filter(d => d.expiry_warning && !d.is_permanent)

  return (
    <div className="page-container">
      <div className="page-topbar">
        <div className="page-topbar-left">
          <div className="page-topbar-title">Knowledge Base</div>
          <div className="page-topbar-sub">All documents indexed in Arkive AI</div>
        </div>
        <button className="topbar-btn" onClick={() => { fetchDocuments(); fetchKbMetadata() }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          Refresh
        </button>
      </div>

      <div className="page-content">
        {/* Knowledge Base Status */}
        {kbMetadata && (
          <div className="kb-metadata-container">
            <div className="kb-metadata-header">
              <div className="kb-metadata-title">Knowledge Base</div>
              <div className="kb-metadata-label">Last updated: {new Date(kbMetadata.last_updated).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} · Next review: {new Date(kbMetadata.next_review).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</div>
            </div>
            <table className="kb-table">
              <thead>
                <tr>
                  <th>Document Name</th>
                  <th>Source</th>
                  <th>Year</th>
                  <th>Indexed Version</th>
                  <th>Last Indexed</th>
                </tr>
              </thead>
              <tbody>
                {kbMetadata.documents.map((doc, idx) => (
                  <tr key={idx}>
                    <td>{doc.name}</td>
                    <td>{doc.source}</td>
                    <td>{doc.year}</td>
                    <td>{doc.indexed_version}</td>
                    <td>{doc.last_indexed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Expiry Warning Banner */}
        {expiringDocs.length > 0 && (
          <div className="expiry-warning-banner">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span>
              <strong>{expiringDocs.length} document{expiringDocs.length > 1 ? "s" : ""} expires in 2 days or less.</strong> Download or re-upload to retain access.
            </span>
          </div>
        )}

        {loading ? (
          <div className="state-message">Loading documents...</div>
        ) : documents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <p>No documents indexed yet. Upload a PDF from the Chat tab to get started.</p>
          </div>
        ) : (
          <div className="docs-list">
            {documents.map((doc, i) => (
              <div key={i} className={`doc-card ${doc.expiry_warning ? "doc-card-warning" : ""}`}>
                <div className="doc-file-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>
                <div className="doc-info">
                  <div className="doc-name">{doc.filename}</div>
                  <div className="doc-meta">
                    <span className="doc-meta-item">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                      {doc.total_pages} pages
                    </span>
                    <span className="doc-meta-item">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                      </svg>
                      {doc.total_chunks} chunks
                    </span>
                    <span className="doc-meta-item">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                      {doc.uploaded_by}
                    </span>
                    <span className="doc-meta-date">
                      {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleString() : "N/A"}
                    </span>
                  </div>
                </div>
                <div className="doc-badges">
                  <div className={`doc-badge ${doc.is_permanent ? "permanent" : (doc.days_remaining >= 5 ? "ttl-green" : doc.days_remaining >= 3 ? "ttl-amber" : "ttl-red")}`}>
                    {doc.is_permanent ? (
                      <>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                        Permanent
                      </>
                    ) : (
                      <>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                        {doc.days_remaining !== null && doc.days_remaining !== undefined
                          ? `Expires in ${doc.days_remaining} day${doc.days_remaining !== 1 ? 's' : ''}`
                          : "Expires in 7 days"
                        }
                      </>
                    )}
                  </div>
                  {doc.expiry_warning && (
                    <div className="doc-badge expiring">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                      Expiring soon
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Documents