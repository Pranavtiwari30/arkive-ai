import { useState, useEffect, useCallback } from "react"
import { Copy, ShieldAlert, Loader2 } from "lucide-react"
import api from "../api"

const PILLARS = [
  "Transparency",
  "Human Oversight",
  "Privacy & Data Protection",
  "Fairness & Non-discrimination",
  "Accountability",
  "Safety & Security",
  "Sustainability",
  "Inclusivity"
]

function CustomDropdown({ value, onChange, options, disabledText }) {
  const [isOpen, setIsOpen] = useState(false);
  
  useEffect(() => {
    if (!isOpen) return;
    const clickHandler = () => setIsOpen(false);
    window.addEventListener('click', clickHandler);
    return () => window.removeEventListener('click', clickHandler);
  }, [isOpen]);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div className="relative" onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen) }}>
      <div className={`w-full bg-[oklch(0.12_0.02_285/0.8)] text-foreground text-[13px] rounded-xl px-4 py-2.5 flex items-center justify-between cursor-pointer transition-all ${isOpen ? 'ring-1 ring-primary/40' : ''}`}>
        <span className="truncate">{options.length === 0 ? disabledText : (selectedOption ? selectedOption.label : 'Select...')}</span>
        <svg className={`shrink-0 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      {isOpen && options.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-[#1A1525] border border-[oklch(1_0_0/0.08)] rounded-xl py-1.5 shadow-2xl z-50 overflow-hidden max-h-60 overflow-y-auto hide-scrollbar" style={{ backdropFilter: 'blur(12px)' }}>
          {options.map((opt, i) => (
            <div 
              key={i} 
              className={`px-4 py-2.5 text-[13px] cursor-pointer hover:bg-[oklch(1_0_0/0.06)] transition-colors truncate ${opt.value === value ? 'text-gold bg-[oklch(1_0_0/0.03)]' : 'text-foreground/90'}`}
              onClick={() => { onChange(opt.value); setIsOpen(false) }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function RedTeam() {
  const [documents, setDocuments] = useState([])
  const [selectedDoc, setSelectedDoc] = useState("")
  const [selectedPillar, setSelectedPillar] = useState(PILLARS[0])
  const [attacks, setAttacks] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(null)

  const fetchDocs = useCallback(async () => {
    try {
      const res = await api.get("/api/documents/")
      const docs = res.data.documents || []
      const unique = []
      const seen = new Set()
      docs.forEach(doc => {
        if (!seen.has(doc.doc_id)) { seen.add(doc.doc_id); unique.push(doc) }
      })
      setDocuments(unique)
      if (unique.length > 0) setSelectedDoc(unique[0].doc_id)
    } catch (err) {
      console.error("Failed to fetch documents", err)
    }
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void fetchDocs() }, [fetchDocs])

  const handleGenerate = async () => {
    if (!selectedDoc) { setError("Please select a document first."); return }
    setLoading(true); setError(""); setAttacks([])
    try {
      const res = await api.post("/api/redteam/generate", {
        document_id: selectedDoc,
        pillar_name: selectedPillar
      })
      setAttacks(res.data.attacks || [])
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to generate attacks.")
    }
    setLoading(false)
  }

  const copyToClipboard = (text, idx) => {
    navigator.clipboard.writeText(text)
    setCopied(idx)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="max-w-3xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2.5 mb-2">
          <ShieldAlert size={18} strokeWidth={2} className="text-primary" />
          <h1 className="font-serif text-[22px] tracking-tight">Red Team Simulator</h1>
        </div>
        <p className="text-[13px] text-muted-foreground">
          Generate adversarial prompt injections to test AI policy compliance.
        </p>
      </div>

      {/* Controls card */}
      <div className="rounded-3xl glass-panel hairline p-6 mb-6 flex flex-wrap items-end gap-5">
        {/* Document selector */}
        <div className="flex flex-col gap-2 flex-1 min-w-[180px]">
          <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-medium">
            Target Policy Document
          </label>
          <CustomDropdown 
            value={selectedDoc}
            onChange={setSelectedDoc}
            options={documents.map(doc => ({ value: doc.doc_id, label: (doc.filename || doc.doc_id) + (doc.is_permanent ? " (Permanent)" : "") }))}
            disabledText="No documents available"
          />
        </div>

        {/* Pillar selector */}
        <div className="flex flex-col gap-2 flex-1 min-w-[180px]">
          <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-medium">
            Target Compliance Pillar
          </label>
          <CustomDropdown 
            value={selectedPillar}
            onChange={setSelectedPillar}
            options={PILLARS.map(p => ({ value: p, label: p }))}
            disabledText="No pillars available"
          />
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={loading || !selectedDoc}
          className="flex items-center gap-2 bg-destructive text-white rounded-xl px-5 py-2.5 text-[13px] font-semibold tracking-wide uppercase hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          style={{ letterSpacing: '0.06em' }}
        >
          {loading ? (
            <><Loader2 size={14} className="animate-spin" /> Generating…</>
          ) : "Generate Attacks"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl px-5 py-3 mb-5 text-[13px] text-destructive bg-destructive/10 hairline">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="rounded-3xl glass-panel hairline flex flex-col items-center gap-4 py-16 text-muted-foreground text-[13px]">
          <Loader2 size={24} className="animate-spin text-primary" />
          Synthesizing adversarial vectors…
        </div>
      )}

      {/* Attack cards */}
      {!loading && attacks.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="font-serif text-[18px] tracking-tight text-foreground mb-1">
            Generated Attack Vectors
          </h2>
          {attacks.map((attack, idx) => (
            <div key={idx} className="rounded-2xl glass-panel hairline overflow-hidden">
              {/* Card header */}
              <div className="flex items-center justify-between px-5 py-3.5 bg-[oklch(1_0_0/0.04)] border-b border-[oklch(1_0_0/0.06)]">
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-destructive bg-destructive/15 px-2.5 py-1 rounded-md">
                    Technique
                  </span>
                  <span className="text-[13.5px] font-semibold text-foreground">{attack.technique}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(attack.prompt, idx)}
                  className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors bg-[oklch(1_0_0/0.05)] hover:bg-[oklch(1_0_0/0.1)] px-3 py-1.5 rounded-lg"
                >
                  <Copy size={12} strokeWidth={2} />
                  {copied === idx ? "Copied!" : "Copy Prompt"}
                </button>
              </div>

              {/* Prompt text */}
              <div className="px-5 py-4 text-[13.5px] text-foreground/80 leading-relaxed border-b border-[oklch(1_0_0/0.05)]">
                {attack.prompt}
              </div>

              {/* Vulnerability */}
              <div className="px-5 py-3 flex gap-2 text-[12.5px]">
                <span className="text-foreground/60 font-medium shrink-0">Expected Vulnerability:</span>
                <span className="text-muted-foreground">{attack.expected_vulnerability}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default RedTeam
