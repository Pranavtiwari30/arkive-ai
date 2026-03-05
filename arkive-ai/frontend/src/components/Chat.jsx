import { useState, useRef, useEffect } from "react"
import axios from "axios"
import ReactMarkdown from "react-markdown"
import "./Chat.css"

const API = "https://arkive-ai-backend.onrender.com"

function Chat({ userId }) {
  const [messages, setMessages] = useState([null])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const [sessions, setSessions] = useState([])
  const [showSessions, setShowSessions] = useState(false)
  const bottomRef = useRef(null)
  const fileRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    try {
      const res = await axios.get(`${API}/api/chat/sessions/${userId}`)
      setSessions(res.data.sessions)
    } catch (err) {
      console.error("Failed to fetch sessions", err)
    }
  }

  const loadSession = async (sid) => {
    try {
      const res = await axios.get(`${API}/api/chat/history/${sid}`)
      const loaded = res.data.messages.map(m => ({
        role: m.role,
        content: m.content,
        sources: m.sources || [],
        confidence: m.confidence || 0,
        flagged: m.flagged || false
      }))
      setMessages(loaded)
      setSessionId(sid)
      setShowSessions(false)
    } catch (err) {
      console.error("Failed to load session", err)
    }
  }

  const newChat = () => {
    setMessages([null])
    setSessionId(null)
    setShowSessions(false)
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMessage = { role: "user", content: input, sources: [], confidence: 0 }
    setMessages(prev => [...prev.filter(m => m !== null), userMessage])
    setInput("")
    setLoading(true)
    try {
      const res = await axios.post(`${API}/api/chat/`, {
        query: input,
        user_id: userId,
        session_id: sessionId
      })
      if (!sessionId) {
        setSessionId(res.data.session_id)
        fetchSessions()
      }
      setMessages(prev => [...prev, {
        role: "assistant",
        content: res.data.answer,
        sources: res.data.sources || [],
        flagged: res.data.flagged,
        confidence: res.data.confidence
      }])
    } catch (err) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Error connecting to backend. Please try again.",
        sources: [],
        confidence: 0
      }])
    }
    setLoading(false)
  }

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const formData = new FormData()
    formData.append("file", file)
    formData.append("user_id", userId)
    try {
      const res = await axios.post(`${API}/api/documents/upload`, formData)
      setMessages(prev => [...prev.filter(m => m !== null), {
        role: "assistant",
        content: `**${file.name}** indexed successfully — ${res.data.total_chunks} chunks stored.`,
        sources: [],
        confidence: 0
      }])
    } catch (err) {
      setMessages(prev => [...prev.filter(m => m !== null), {
        role: "assistant",
        content: "Upload failed. Please try again.",
        sources: [],
        confidence: 0
      }])
    }
    setUploading(false)
    e.target.value = ""
  }

  const showWelcome = messages.length === 1 && messages[0] === null

  const SAMPLE_QUERIES = [
    "What does the EU AI Act require for high-risk AI systems?",
    "How does UNESCO define AI transparency obligations?",
    "What are the OECD principles for trustworthy AI?",
    "What are the penalties for non-compliance under EU AI Act?"
  ]

  return (
    <div className="chat-container">
      <div className="chat-topbar">
        <div className="chat-topbar-left">
          <div className="chat-topbar-title">AI Compliance Chat</div>
          <div className="chat-topbar-sub">Query UNESCO, OECD & EU AI Act standards</div>
        </div>
        <div className="chat-topbar-actions">
          <button className="topbar-btn" onClick={() => setShowSessions(!showSessions)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            History
          </button>
          <button className="topbar-btn topbar-btn-primary" onClick={newChat}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Chat
          </button>
        </div>
      </div>

      {showSessions && (
        <div className="sessions-panel">
          <div className="sessions-panel-title">Recent Sessions</div>
          {sessions.length === 0 ? (
            <p className="no-sessions">No previous sessions found</p>
          ) : (
            sessions.map(s => (
              <div key={s._id} className="session-item" onClick={() => loadSession(s._id)}>
                <div className="session-item-left">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  Session
                </div>
                <span className="session-time">{new Date(s.last_active).toLocaleString()}</span>
              </div>
            ))
          )}
        </div>
      )}

      <div className="messages-area">
        {showWelcome && (
          <div className="welcome-card">
            <div className="welcome-header">
              <div className="welcome-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <div className="welcome-text">
                <h2>Arkive AI — Compliance Intelligence</h2>
                <p>Query international AI standards, verify compliance requirements, or upload your organisation's AI policy for a gap analysis.</p>
              </div>
            </div>
            <div className="knowledge-base">
              <div className="kb-tag"><div className="kb-dot"></div>UNESCO AI Ethics (2021)</div>
              <div className="kb-tag"><div className="kb-dot"></div>OECD AI Principles (2019)</div>
              <div className="kb-tag"><div className="kb-dot"></div>EU AI Act (2024)</div>
            </div>
            <div className="sample-queries">
              <div className="sample-label">Suggested queries</div>
              <div className="sample-grid">
                {SAMPLE_QUERIES.map((q, i) => (
                  <div key={i} className="sample-query" onClick={() => { setInput(q) }}>
                    {q}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.filter(m => m !== null).map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <div className={`msg-avatar ${msg.role === "assistant" ? "ai" : "user-av"}`}>
              {msg.role === "assistant" ? "A" : userId?.charAt(0).toUpperCase()}
            </div>
            <div className="msg-body">
              {msg.role === "assistant" && msg.confidence > 0 && (
                <div className="confidence-row">
                  <span className="confidence-label">Confidence</span>
                  <div className="confidence-track">
                    <div className="confidence-fill" style={{
                      width: `${msg.confidence}%`,
                      background: msg.confidence > 70 ? "var(--green)" : msg.confidence > 40 ? "#d97706" : "var(--red)"
                    }}/>
                  </div>
                  <span className="confidence-pct" style={{
                    color: msg.confidence > 70 ? "var(--green)" : msg.confidence > 40 ? "#d97706" : "var(--red)"
                  }}>{msg.confidence}%</span>
                </div>
              )}
              <div className="msg-bubble">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
              {msg.sources && msg.sources.length > 0 && (
                <div className="sources-row">
                  <span className="sources-label">Sources</span>
                  {msg.sources.map((s, j) => (
                    <span key={j} className="source-chip">{s.source} · p.{s.page}</span>
                  ))}
                </div>
              )}
              {msg.flagged && (
                <div className="flagged-badge">Content flagged by moderation</div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="message assistant">
            <div className="msg-avatar ai">A</div>
            <div className="msg-body">
              <div className="msg-bubble typing">
                <span/><span/><span/>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      <div className="input-bar">
        <input type="file" accept=".pdf" ref={fileRef} onChange={handleUpload} style={{ display: "none" }}/>
        <div className="input-inner">
          <input
            className="chat-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendMessage()}
            placeholder="Ask about AI standards, compliance requirements..."
            disabled={loading}
          />
          <div className="input-actions">
            <button className="input-btn" onClick={() => fileRef.current.click()} disabled={uploading} title="Upload document">
              {uploading ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                </svg>
              )}
            </button>
            <button className="send-btn" onClick={sendMessage} disabled={loading || !input.trim()}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Chat