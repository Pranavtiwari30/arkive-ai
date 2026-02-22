import "./Sidebar.css"

function Sidebar({ activeTab, setActiveTab, user, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="logo-icon">🗂️</span>
        <span className="logo-text">Arkive AI</span>
      </div>

      <nav className="sidebar-nav">
        <button
          className={`nav-item ${activeTab === "chat" ? "active" : ""}`}
          onClick={() => setActiveTab("chat")}
        >
          💬 Chat
        </button>
        <button
          className={`nav-item ${activeTab === "docs" ? "active" : ""}`}
          onClick={() => setActiveTab("docs")}
        >
          📄 Documents
        </button>
        <button
          className={`nav-item ${activeTab === "audit" ? "active" : ""}`}
          onClick={() => setActiveTab("audit")}
        >
          🔒 Audit Logs
        </button>
      </nav>

      <div className="sidebar-user">
        <div className="user-info">
          <div className="user-avatar">
            {user?.charAt(0).toUpperCase()}
          </div>
          <span className="user-name">{user}</span>
        </div>
        <button className="logout-btn" onClick={onLogout}>
          ↩️
        </button>
      </div>

      <div className="sidebar-footer">
        <p>Powered by RAG + Groq</p>
      </div>
    </aside>
  )
}

export default Sidebar