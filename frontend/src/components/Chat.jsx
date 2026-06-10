import { useState, useRef, useEffect } from "react"
import { Send, Paperclip, Clock, Plus, Shield, FileText, CheckSquare, Loader2 } from "lucide-react"
import api from "../api"
import ReactMarkdown from "react-markdown"

function Chat({ userId }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadPassword, setUploadPassword] = useState("")
  const [sessionId, setSessionId] = useState(null)
  const [sessions, setSessions] = useState([])
  const [showSessions, setShowSessions] = useState(false)
  const [kbLastUpdated, setKbLastUpdated] = useState(null)
  const bottomRef = useRef(null)
  const fileRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    const handleNewChat = () => newChat();
    window.addEventListener('new-chat', handleNewChat);
    return () => window.removeEventListener('new-chat', handleNewChat);
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await api.get(`/api/chat/sessions/${userId}`)
      setSessions(res.data.sessions)
    } catch (err) {
      console.error("Failed to fetch sessions", err)
    }
  }

  useEffect(() => {
    fetchSessions()
    api.get(`/api/documents/kb-status`)
      .then(res => setKbLastUpdated(res.data.last_updated))
      .catch(() => { })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadSession = async (sid) => {
    try {
      const res = await api.get(`/api/chat/history/${sid}`)
      const loaded = res.data.messages.map(m => ({
        role: m.role,
        content: m.content,
        sources: m.sources || [],
        confidence: m.confidence || 0,
        confidence_explanation: m.confidence_explanation || "",
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
    setMessages([])
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
      const res = await api.post(`/api/chat/`, { query: input, session_id: sessionId })
      if (!sessionId) { setSessionId(res.data.session_id); fetchSessions() }
      setMessages(prev => [...prev, {
        role: "assistant",
        content: res.data.answer,
        sources: res.data.sources || [],
        flagged: res.data.flagged,
        confidence: res.data.confidence,
        confidence_explanation: res.data.confidence_explanation || ""
      }])
    } catch (err) {
      console.error(err)
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Error connecting to backend. Please try again.",
        sources: [], confidence: 0, confidence_explanation: ""
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
    if (uploadPassword) formData.append("password", uploadPassword)
    try {
      const res = await api.post(`/api/documents/upload`, formData)
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `**${file.name}** indexed successfully — ${res.data.total_chunks} chunks stored.`,
        sources: [], confidence: 0
      }])
      setUploadPassword("")
    } catch (err) {
      const detailMsg = err.response?.data?.detail || "Upload failed. Please try again."
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `Upload failed: ${detailMsg}`,
        sources: [], confidence: 0
      }])
    }
    setUploading(false)
    e.target.value = ""
  }

  const showWelcome = messages.length === 0

  return (
    <div className="flex flex-col flex-1 h-full -mx-6 lg:-mx-10 -my-7 md:-mt-24 -mb-20">

      {/* Sessions panel */}
      {showSessions && (
        <div className="absolute top-0 left-64 right-0 z-20 glass-panel hairline rounded-none border-b border-border/20 px-8 py-4 max-h-48 overflow-y-auto">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">Recent Sessions</p>
          {sessions.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">No previous sessions found</p>
          ) : sessions.map(s => (
            <div key={s._id}
              onClick={() => loadSession(s._id)}
              className="flex justify-between items-center px-3 py-2 rounded-xl hover:bg-[oklch(1_0_0/0.05)] cursor-pointer text-[13px] text-foreground/80 transition-colors"
            >
              <span className="flex items-center gap-2"><Clock size={12} className="text-muted-foreground" /> Session</span>
              <span className="text-[11px] text-muted-foreground font-mono">{new Date(s.last_active).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {showWelcome ? (
          /* Welcome hero */
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-7 inline-flex items-center gap-3 bg-foreground text-background rounded-full pl-1.5 pr-4 py-1.5">
              <div className="flex -space-x-2">
                {[Shield, CheckSquare, FileText].map((Icon, i) => (
                  <div key={i} className="h-6 w-6 rounded-full ring-2 ring-foreground bg-[oklch(0.2_0.05_290)] flex items-center justify-center" style={{ zIndex: i }}>
                    <Icon size={12} className="text-gold" />
                  </div>
                ))}
              </div>
              <span className="text-[13px] font-medium tracking-tight">Built on UNESCO · OECD · EU AI Act</span>
            </div>

            <h1 className="font-serif text-5xl md:text-6xl tracking-tight mb-4">
              Ready to verify, <span className="text-gold italic">John</span>?
            </h1>
            <p className="text-[15px] text-muted-foreground max-w-lg mb-8 leading-relaxed">
              Query international AI standards or upload your organisation's policy for an instant gap analysis.
            </p>

            <div className="flex flex-wrap gap-2 justify-center">
              {["UNESCO AI Ethics (2021)", "OECD AI Principles (2019)", "EU AI Act (2024)"].map(tag => (
                <span key={tag} className="text-[11.5px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-panel hairline text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>

            {kbLastUpdated && (
              <p className="text-[11px] text-muted-foreground/60 mt-4 font-mono">
                Knowledge base last indexed: {new Date(kbLastUpdated).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            )}
          </div>
        ) : (
          /* Message thread */
          <div className="flex-1 flex flex-col gap-6 px-6 lg:px-10 py-8 max-w-3xl mx-auto w-full">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                {/* Avatar */}
                <div className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-[12px] font-bold mt-0.5 ${msg.role === "assistant"
                  ? "bg-foreground text-background"
                  : "bg-primary text-white"
                  }`}>
                  {msg.role === "assistant" ? <Shield size={15} strokeWidth={2} /> : (userId?.charAt(0).toUpperCase() || "U")}
                </div>

                {/* Bubble */}
                <div className="flex flex-col max-w-[82%]">
                  {/* Confidence + sources (assistant only) */}
                  {msg.role === "assistant" && msg.confidence > 0 && (
                    <div className="glass-panel hairline rounded-xl px-4 py-2.5 mb-2 text-[12px] text-muted-foreground">
                      {msg.sources?.length > 0 && (
                        <p className="mb-1">
                          <strong className="text-foreground/70">Grounded in: </strong>
                          {msg.sources.map((s, j) => (
                            <span key={j}>{s.source} · p.{s.page}{j < msg.sources.length - 1 ? " | " : ""}</span>
                          ))}
                        </p>
                      )}
                      <span className="text-foreground/60">Retrieval match: </span>
                      <span className={`font-mono font-medium ${msg.confidence > 70 ? "text-emerald-400" : msg.confidence > 40 ? "text-amber-400" : "text-destructive"}`}>
                        {(msg.confidence / 100).toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className={`rounded-2xl px-4 py-3 text-[14px] leading-relaxed max-w-none ${msg.role === "user"
                    ? "glass-panel hairline text-foreground/90 rounded-tr-sm"
                    : "glass-panel hairline text-foreground/90 rounded-tl-sm prose prose-invert"
                    }`}>
                    {msg.role === "assistant" ? <ReactMarkdown>{msg.content}</ReactMarkdown> : msg.content}
                  </div>

                  {msg.flagged && (
                    <span className="mt-1.5 text-[11px] px-2.5 py-1 rounded-lg bg-destructive/15 text-destructive self-start">
                      Content flagged by moderation
                    </span>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-3">
                <div className="h-8 w-8 shrink-0 rounded-full bg-foreground text-background flex items-center justify-center text-[12px] font-bold mt-0.5">
                  <Shield size={15} strokeWidth={2} />
                </div>
                <div className="glass-panel hairline rounded-2xl rounded-tl-sm px-5 py-4 flex items-center gap-1.5">
                  {[0, 0.2, 0.4].map((delay, i) => (
                    <span key={i} className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: `${delay}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input bar — pinned to bottom */}
      <div className={`flex-shrink-0 px-6 lg:px-10 ${showWelcome ? "pb-10" : "pb-6"} pt-4`}>
        <input type="file" accept=".pdf" ref={fileRef} onChange={handleUpload} className="hidden" />

        <div className={`mx-auto flex flex-col gap-0 rounded-3xl glass-panel hairline gold-glow overflow-hidden transition-all ${showWelcome ? "max-w-2xl" : "max-w-3xl"}`}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Ask about AI compliance, risk tiers, obligations..."
            disabled={loading}
            className="bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50 text-[14px] px-5 pt-4 pb-2 w-full disabled:opacity-60"
          />

          <div className="flex items-center justify-between px-4 pb-3">
            {/* PDF password field */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                title="Upload PDF document"
                className="h-8 w-8 rounded-full bg-[oklch(1_0_0/0.05)] hover:bg-[oklch(1_0_0/0.1)] flex items-center justify-center text-muted-foreground transition-colors disabled:opacity-40"
              >
                {uploading ? <Loader2 size={15} className="animate-spin" /> : <Paperclip size={15} strokeWidth={1.8} />}
              </button>
              <input
                type="password"
                value={uploadPassword}
                onChange={e => setUploadPassword(e.target.value)}
                placeholder="PDF pass (optional)"
                className="bg-transparent border-none outline-none text-[12px] text-muted-foreground placeholder:text-muted-foreground/40 w-32"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSessions(!showSessions)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[oklch(1_0_0/0.05)] hover:bg-[oklch(1_0_0/0.1)] transition-colors text-[12px] text-muted-foreground"
              >
                <Clock size={13} /> History
              </button>
              <button
                onClick={newChat}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[oklch(1_0_0/0.05)] hover:bg-[oklch(1_0_0/0.1)] transition-colors text-[12px] text-muted-foreground"
              >
                <Plus size={13} /> New
              </button>
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="h-8 w-8 bg-foreground text-background rounded-full flex items-center justify-center gold-glow hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Send size={13} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Chat