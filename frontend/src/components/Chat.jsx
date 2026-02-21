import { useState, useRef, useEffect } from "react"
import axios from "axios"
import ReactMarkdown from "react-markdown"
import "./Chat.css"

const API = "http://127.0.0.1:8000"

function Chat() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "👋 Hi! I'm Arkive AI. Upload a document and ask me anything about it!",
      sources: []
    }
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const bottomRef = useRef(null)
  const fileRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage = { role: "user", content: input, sources: [] }
    setMessages(prev => [...prev, userMessage])
    setInput("")
    setLoading(true)

    try {
      const res = await axios.post(`${API}/api/chat/`, {
        query: input,
        user_id: "pranav"
      })

      const aiMessage = {
        role: "assistant",
        content: res.data.answer,
        sources: res.data.sources || [],
        flagged: res.data.flagged
      }
      setMessages(prev => [...prev, aiMessage])
    } catch (err) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "❌ Error connecting to backend. Make sure the server is running.",
        sources: []
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
    formData.append("user_id", "pranav")

    try {
      const res = await axios.post(`${API}/api/documents/upload`, formData)
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `✅ **${file.name}** uploaded successfully! ${res.data.total_chunks} chunks indexed. You can now ask questions about it!`,
        sources: []
      }])
    } catch (err) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "❌ Upload failed. Please try again.",
        sources: []
      }])
    }

    setUploading(false)
    e.target.value = ""
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h1>Arkive AI Chat</h1>
        <p>Ask questions about your uploaded documents</p>
      </div>

      <div className="messages-container">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <div className="message-avatar">
              {msg.role === "assistant" ? "🤖" : "👤"}
            </div>
            <div className="message-body">
              <div className="message-bubble">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
              {msg.sources && msg.sources.length > 0 && (
                <div className="sources">
                  <span className="sources-label">📚 Sources:</span>
                  {msg.sources.map((s, j) => (
                    <span key={j} className="source-tag">
                      {s.source} • Page {s.page}
                    </span>
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
            <div className="message-avatar">🤖</div>
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
        <input
          type="file"
          accept=".pdf"
          ref={fileRef}
          onChange={handleUpload}
          style={{ display: "none" }}
        />
        <button
          className="upload-btn"
          onClick={() => fileRef.current.click()}
          disabled={uploading}
        >
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
        <button
          className="send-btn"
          onClick={sendMessage}
          disabled={loading || !input.trim()}
        >
          {loading ? "⏳" : "➤"}
        </button>
      </div>
    </div>
  )
}

export default Chat