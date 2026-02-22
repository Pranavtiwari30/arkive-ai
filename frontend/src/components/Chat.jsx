import { useState, useRef, useEffect } from "react"
import axios from "axios"
import ReactMarkdown from "react-markdown"
import "./Chat.css"

const API = "http://127.0.0.1:8000"

function Chat({ userId }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Welcome to Arkive AI — your ethical AI assistant grounded in UNESCO & OECD principles. Ask me anything about AI ethics, governance, or upload your own documents to explore.",
      sources: [],
      confidence: 0
    }
  ])
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
    setMessages([{
      role: "assistant",
      content: "Welcome to Arkive AI — your ethical AI assistant grounded in UNESCO & OECD principles. Ask me anything about AI ethics, governance, or upload your own documents to explore.",
      sources: [],
      confidence: 0
    }])
    setSessionId(null)
    setShowSessions(false)
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage = { role: "user", content: input, sources: [], confidence: 0 }
    setMessages(prev => [...prev, userMessage])
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

      const aiMessage = {
        role: "assistant",
        content: res.data.answer,
        sources: res.data.sources || [],
        flagged: res.data.flagged,
        confidence: res.data.confidence
      }
      setMessages(prev => [...prev, aiMessage])
    } catch (err) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "❌ Error connecting to backend.",
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
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `✅ **${file.name}** uploaded! ${res.data.total_chunks} chunks indexed. ${res.data.is_permanent ? "📌 Permanent" : "⏳ Expires in 7 days"}`,
        sources: [],
        confidence: 0
      }])
    } catch (err) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "❌ Upload failed.",
        sources: [],
        confidence: 0
      }])
    }
    setUploading(false)
    e.target.value = ""
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div>
          <h1>Arkive AI Chat</h1>
          <p>Ask questions about your uploaded documents</p>
        </div>
        <div className="header-actions">
          <button className="history-btn" onClick={() => setShowSessions(!showSessions)}>
            🕘 History
          </button>
          <button className="new-chat-btn" onClick={newChat}>
            ✏️ New Chat
          </button>
        </div>
      </div>

      {showSessions && (
        <div className="sessions-panel">
          <h3>Recent Sessions</h3>
          {sessions.length === 0 ? (
            <p className="no-sessions">No previous sessions</p>
          ) : (
            sessions.map(s => (
              <div key={s._id} className="session-item" onClick={() => loadSession(s._id)}>
                <span>💬 Session</span>
                <span className="session-time">{new Date(s.last_active).toLocaleString()}</span>
              </div>
            ))
          )}
        </div>
      )}

      <div className="messages-container">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <div className="message-avatar">
              {msg.role === "assistant" ? "🗂️" : "👤"}
            </div>
            <div className="message-body">
              {msg.confidence > 0 && (
                <div className="confidence-bar">
                  <span className="confidence-label">Confidence: {msg.confidence}%</span>
                  <div className="confidence-track">
                    <div
                      className="confidence-fill"
                      style={{
                        width: `${msg.confidence}%`,
                        background: msg.confidence > 70 ? "#4ade80" : msg.confidence > 40 ? "#fb923c" : "#f87171"
                      }}
                    />
                  </div>
                </div>
              )}
              <div className="message-bubble">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
              {msg.sources && msg.sources.length > 0 && (
                <div className="sources">
                  <span className="sources-label">📚 Sources:</span>
                  {msg.sources.map((s, j) => (
                    <span key={j} className="source-tag">{s.source} • Page {s.page}</span>
                  ))}
                </div>
              )}
              {msg.flagged && (
                <div className="flagged-badge">🚩 Flagged by moderation</div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="message assistant">
            <div className="message-avatar">🗂️</div>
            <div className="message-body">
              <div className="message-bubble typing">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="input-area">
        <input type="file" accept=".pdf" ref={fileRef} onChange={handleUpload} style={{ display: "none" }} />
        <button className="upload-btn" onClick={() => fileRef.current.click()} disabled={uploading}>
          {uploading ? "⏳" : "📎"}
        </button>
        <input
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendMessage()}
          placeholder="Ask anything about your documents..."
          disabled={loading}
        />
        <button className="send-btn" onClick={sendMessage} disabled={loading || !input.trim()}>
          {loading ? "⏳" : "➤"}
        </button>
      </div>
    </div>
  )
}

export default Chat