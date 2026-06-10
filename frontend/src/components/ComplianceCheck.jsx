import { useState, useRef } from "react"
import api from "../api"
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Upload, FileText, CheckSquare, X, AlertTriangle, Clock } from 'lucide-react'
import PageHeader from './PageHeader'

const ACCEPTED_TYPES = [
  { ext: ".pdf",  label: "PDF",  mime: "application/pdf" },
  { ext: ".docx", label: "DOCX", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  { ext: ".txt",  label: "TXT",  mime: "text/plain" },
]
const ACCEPTED_EXTENSIONS = ACCEPTED_TYPES.map(t => t.ext)
const ACCEPTED_MIME      = ACCEPTED_TYPES.map(t => t.mime)
const ACCEPT_ATTR        = ACCEPTED_TYPES.map(t => `${t.mime},${t.ext}`).join(",")

const PILLARS = [
  { key: "transparency",    label: "Transparency",              ref: "UNESCO Art. 21 · OECD 1.2" },
  { key: "human_oversight", label: "Human Oversight",           ref: "EU AI Act Art. 14 · OECD 1.4" },
  { key: "privacy",         label: "Privacy & Data Protection", ref: "EU AI Act Art. 10 · UNESCO Art. 22" },
  { key: "fairness",        label: "Fairness & Non-discrimination", ref: "UNESCO Art. 23 · OECD 1.3" },
  { key: "accountability",  label: "Accountability",            ref: "EU AI Act Art. 16 · OECD 1.5" },
  { key: "safety",          label: "Safety & Security",         ref: "EU AI Act Art. 9 · UNESCO Art. 24" },
  { key: "sustainability",  label: "Sustainability",            ref: "UNESCO Art. 25 · OECD 1.1" },
  { key: "inclusivity",     label: "Inclusivity",               ref: "UNESCO Art. 26 · OECD 1.3" },
]

function getFileExt(name) {
  return name ? name.slice(name.lastIndexOf(".")).toLowerCase() : ""
}

export default function ComplianceCheck() {
  const [file,         setFile]         = useState(null)
  const [password,     setPassword]     = useState("")
  const [checking,     setChecking]     = useState(false)
  const [report,       setReport]       = useState(null)
  const [error,        setError]        = useState("")
  const [dragOver,     setDragOver]     = useState(false)
  const [expandedCode, setExpandedCode] = useState({})
  const fileRef = useRef(null)

  const handleFile = (f) => {
    if (!f) return
    const ext = getFileExt(f.name)
    if (ACCEPTED_EXTENSIONS.includes(ext) || ACCEPTED_MIME.includes(f.type)) {
      setFile(f); setError(""); setReport(null)
    } else {
      setError("Unsupported file. Please upload a PDF, DOCX, or TXT file.")
    }
  }

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }

  const runCheck = async () => {
    if (!file) return
    setChecking(true); setError(""); setReport(null)
    const formData = new FormData()
    formData.append("file", file)
    if (password) formData.append("password", password)
    try {
      const res = await api.post(`/api/compliance/check`, formData)
      setReport(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || "Compliance check failed. Please try again.")
    }
    setChecking(false)
  }

  const resetCheck = () => { setFile(null); setPassword(""); setReport(null); setError("") }

  const passCount = report?.compliance_score != null
    ? report.compliance_score
    : (report?.pillars ? report.pillars.filter(p => p.status === "PASS" || p.status === "pass").length : 0)

  const scoreColor = passCount >= 6
    ? "oklch(0.55 0.18 145)"
    : passCount >= 4
      ? "oklch(0.65 0.18 55)"
      : "oklch(0.6 0.22 30)"

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        eyebrow="Workspace · Compliance"
        title="Compliance"
        accentWord="Check"
        description="Upload your AI policy document. Arkive scores it against 8 pillars derived from UNESCO AI Ethics, OECD Principles, and the EU AI Act."
      />

      {/* Standards chips */}
      <div className="flex gap-2 mt-4 flex-wrap">
        {["UNESCO AI Ethics (2021)", "OECD AI Principles (2019)", "EU AI Act (2024)"].map(s => (
          <span
            key={s}
            className="text-[11px] font-medium px-3 py-1 rounded-full"
            style={{ background: "oklch(0.4 0.15 300 / 0.2)", color: "oklch(0.75 0.18 300)", boxShadow: "inset 0 0 0 1px oklch(0.5 0.2 300 / 0.3)" }}
          >
            {s}
          </span>
        ))}
      </div>

      {!report ? (
        <div className="mt-8 flex justify-center">
          {/* Upload panel */}
          <div className="w-full max-w-2xl flex flex-col gap-5">
            <div className="rounded-3xl glass-panel hairline p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "oklch(0.4 0.15 300 / 0.25)", color: "oklch(0.75 0.2 300)" }}>
                  <Upload size={20} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="font-semibold text-[15px]">Upload policy document</h3>
                  <p className="text-[13px] text-muted-foreground mt-0.5">PDF, DOCX or TXT · up to 100 MB</p>
                </div>
              </div>

              {/* Drop zone */}
              <label
                htmlFor="compliance-file-input"
                className={`block rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
                  dragOver
                    ? "ring-2 ring-primary/60"
                    : "hover:ring-1 hover:ring-primary/40"
                }`}
                style={{
                  border: "2px dashed oklch(1 0 0 / 0.12)",
                  background: dragOver
                    ? "oklch(0.5 0.2 310 / 0.12)"
                    : "oklch(0.18 0.03 285 / 0.2)",
                }}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <input
                  id="compliance-file-input"
                  type="file"
                  accept={ACCEPT_ATTR}
                  ref={fileRef}
                  onChange={e => handleFile(e.target.files[0])}
                  style={{ display: "none" }}
                  onClick={e => { if (file) e.preventDefault() }}
                />

                {file ? (
                  <div className="flex items-center gap-4 w-full max-w-sm text-left">
                    <div className="h-11 w-11 shrink-0 rounded-xl flex items-center justify-center" style={{ background: "oklch(0.4 0.15 300 / 0.2)", color: "oklch(0.75 0.2 300)" }}>
                      <FileText size={20} strokeWidth={1.8} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium truncate">{file.name}</p>
                      <p className="text-[12px] text-muted-foreground mt-0.5">{(file.size / 1024).toFixed(1)} KB · Ready to analyse</p>
                    </div>
                    <button
                      type="button"
                      className="shrink-0 h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFile(null) }}
                    >
                      <X size={15} strokeWidth={2} />
                    </button>
                  </div>
                ) : (
                  <>
                    <FileText size={32} className="text-muted-foreground/40 mb-4" strokeWidth={1.5} />
                    <p className="text-[15px] font-medium mb-1">Drop your document here</p>
                    <p className="text-[13px] text-muted-foreground mb-5">or click to browse files</p>
                    <div className="flex gap-2">
                      {ACCEPTED_TYPES.map(t => (
                        <span
                          key={t.ext}
                          className="text-[10.5px] font-semibold px-2.5 py-1 rounded-md font-mono"
                          style={{ background: "oklch(1 0 0 / 0.07)", color: "oklch(0.7 0 0)", boxShadow: "inset 0 0 0 1px oklch(1 0 0 / 0.1)" }}
                        >
                          {t.label}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </label>

              {/* PDF Password field */}
              {file && getFileExt(file.name) === ".pdf" && (
                <div className="mt-4 flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: "oklch(0.18 0.03 285 / 0.6)", boxShadow: "inset 0 0 0 1px oklch(1 0 0 / 0.08)" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground shrink-0">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Document password (optional)"
                    className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground/50"
                    disabled={checking}
                  />
                </div>
              )}

              {error && (
                <div className="mt-4 flex items-center gap-2 text-[13px] rounded-xl px-4 py-3" style={{ background: "oklch(0.6 0.22 30 / 0.12)", color: "oklch(0.7 0.22 30)", boxShadow: "inset 0 0 0 1px oklch(0.6 0.22 30 / 0.3)" }}>
                  <AlertTriangle size={14} strokeWidth={2} className="shrink-0" />
                  {error}
                </div>
              )}

              <button
                onClick={runCheck}
                disabled={!file || checking}
                className="mt-5 w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-[14px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "oklch(0.92 0.01 285)", color: "oklch(0.1 0.02 285)" }}
              >
                {checking ? (
                  <>
                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round"/>
                    </svg>
                    Analysing document…
                  </>
                ) : (
                  <>
                    <CheckSquare size={16} strokeWidth={2} />
                    Run Compliance Check
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ── REPORT VIEW ── */
        <div className="mt-8">
          {/* Report header */}
          <div className="rounded-3xl glass-panel hairline p-6 mb-5 flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 shrink-0 rounded-xl flex items-center justify-center" style={{ background: "oklch(0.4 0.15 300 / 0.25)", color: "oklch(0.75 0.2 300)" }}>
                <FileText size={22} strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-[16px] font-semibold">{file?.name}</p>
                <p className="text-[12px] text-muted-foreground font-mono mt-0.5">
                  Analysed · {new Date().toLocaleDateString()} · 3 standards · 8 pillars
                </p>
                <div className="flex gap-2 mt-2">
                  {["UNESCO AI Ethics", "OECD Principles", "EU AI Act 2024"].map(s => (
                    <span key={s} className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: "oklch(1 0 0 / 0.07)", color: "oklch(0.65 0 0)", boxShadow: "inset 0 0 0 1px oklch(1 0 0 / 0.1)" }}>{s}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div
                className="text-center rounded-2xl px-5 py-3"
                style={{
                  background: passCount >= 6
                    ? "oklch(0.4 0.12 145 / 0.15)"
                    : passCount >= 4
                      ? "oklch(0.5 0.18 55 / 0.15)"
                      : "oklch(0.5 0.22 30 / 0.15)",
                  boxShadow: `inset 0 0 0 1px ${scoreColor.replace(")", " / 0.4)")}`
                }}
              >
                <p className="font-serif text-3xl font-bold leading-none" style={{ color: scoreColor }}>{passCount}/8</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider mt-1" style={{ color: scoreColor }}>
                  {passCount >= 6 ? "Compliant" : passCount >= 4 ? "Partial" : "Non-Compliant"}
                </p>
              </div>
              <button
                onClick={resetCheck}
                className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-white/8 transition-colors"
                style={{ boxShadow: "inset 0 0 0 1px oklch(1 0 0 / 0.1)" }}
              >
                <Upload size={14} strokeWidth={2} />
                New Check
              </button>
            </div>
          </div>

          {/* Pillars grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            {PILLARS.map(p => {
              const result  = report.pillars?.find(rp => rp.pillar_name?.toLowerCase().includes(p.label.toLowerCase().split(" ")[0]))
              const pass    = result?.status === "PASS" || result?.status === "pass"
              const hasCode = !pass && result?.recommendation != null
              const isOpen  = expandedCode[p.key]
              let displayCode = result?.recommendation
              if (typeof displayCode === "string") displayCode = displayCode.replace(/\\n/g, "\n").replace(/\\"/g, '"')

              const passStyle  = { bg: "oklch(0.4 0.12 145 / 0.2)", border: "oklch(0.5 0.15 145 / 0.5)", dot: "oklch(0.6 0.18 145)", label: "oklch(0.65 0.18 145)" }
              const failStyle  = { bg: "oklch(0.5 0.2 30 / 0.12)", border: "oklch(0.55 0.22 30 / 0.4)", dot: "oklch(0.65 0.22 30)", label: "oklch(0.65 0.22 30)" }
              const s = pass ? passStyle : failStyle

              return (
                <div
                  key={p.key}
                  className="rounded-2xl p-5 flex flex-col gap-3"
                  style={{ background: s.bg, boxShadow: `inset 0 0 0 1px ${s.border}` }}
                >
                  <div className="flex items-start gap-3">
                    <div className="h-5 w-5 rounded-full shrink-0 mt-0.5 flex items-center justify-center" style={{ background: s.dot + " / 0.2" }}>
                      {pass ? (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={s.dot} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      ) : (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={s.dot} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="text-[14px] font-semibold">{p.label}</p>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: s.label, background: s.dot + " / 0.15", boxShadow: `inset 0 0 0 1px ${s.border}` }}>
                          {pass ? "PASS" : "GAP"}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-muted-foreground font-mono mt-0.5">{p.ref}</p>
                      {result?.finding && (
                        <p className="text-[12.5px] text-foreground/75 mt-2 leading-relaxed">{result.finding}</p>
                      )}
                    </div>
                  </div>

                  {hasCode && (
                    <button
                      onClick={() => setExpandedCode(prev => ({ ...prev, [p.key]: !prev[p.key] }))}
                      className="self-start text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all"
                      style={{ background: "oklch(1 0 0 / 0.07)", color: "oklch(0.7 0.18 55)", boxShadow: "inset 0 0 0 1px oklch(1 0 0 / 0.1)" }}
                    >
                      {isOpen ? "Hide Guardrail" : "Generate Guardrail ↗"}
                    </button>
                  )}

                  {hasCode && isOpen && (
                    <div className="relative rounded-xl overflow-hidden mt-1">
                      <button
                        className="absolute top-2 right-2 text-[10px] px-2.5 py-1 rounded-md z-10 transition-colors"
                        style={{ background: "rgba(255,255,255,0.12)", color: "white" }}
                        onClick={() => navigator.clipboard.writeText(result.recommendation)}
                      >
                        Copy
                      </button>
                      <SyntaxHighlighter
                        language="json"
                        style={vscDarkPlus}
                        customStyle={{ margin: 0, padding: "16px", fontSize: "12px", borderRadius: "12px", overflowX: "auto" }}
                        wrapLongLines
                      >
                        {displayCode}
                      </SyntaxHighlighter>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Gaps / recommendations */}
          {report.pillars?.some(p => p.status !== "PASS" && p.status !== "pass") && (
            <div className="rounded-3xl glass-panel hairline p-6 mb-5">
              <h4 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4 flex items-center gap-2">
                <AlertTriangle size={12} strokeWidth={2} />
                Recommendations
              </h4>
              <div className="flex flex-col gap-3">
                {report.pillars.filter(p => p.status !== "PASS" && p.status !== "pass").map((gap, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <span className="h-5 w-5 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5" style={{ background: "oklch(0.65 0.18 55 / 0.2)", color: "oklch(0.7 0.18 55)" }}>
                      {i + 1}
                    </span>
                    <div className="text-[13px] text-foreground/80 leading-relaxed">
                      <strong className="text-foreground">{gap.pillar_name}</strong>: {gap.gap_description}
                      {gap.confidence != null && (
                        <span className="ml-2 text-[11px] text-muted-foreground font-mono">
                          match: {gap.confidence}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}


          <div className="flex items-center gap-2 mt-4 text-[12px] text-muted-foreground">
            <Clock size={13} strokeWidth={2} />
            EU AI Act enforcement deadline: August 2026
          </div>
        </div>
      )}
    </div>
  )
}