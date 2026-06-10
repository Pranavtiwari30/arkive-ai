import React, { useState } from 'react';
import PageHeader from '../components/PageHeader';
import api from '../api';
import { 
  Upload, FileText, CheckSquare, Search, MoreHorizontal, 
  Zap, Bug, Lock, Shield,
  Ban, AlertTriangle, Activity, ShieldCheck, LayoutGrid
} from 'lucide-react';

export function Compliance() {
  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader 
        eyebrow="Workspace · Compliance"
        title="Compliance"
        accentWord="Check"
        description="Upload a policy or paste a clause. Arkive scores it against international AI governance standards and surfaces the gaps."
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 mt-8">
        <div className="flex flex-col gap-8">
          <div className="rounded-3xl glass-panel hairline p-6 sm:p-8">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-[oklch(0.4_0.15_300/0.25)] flex items-center justify-center text-primary shrink-0">
                <Upload size={20} strokeWidth={2} />
              </div>
              <div>
                <h3 className="font-semibold text-[15px]">Upload policy</h3>
                <p className="text-[13px] text-muted-foreground mt-0.5">PDF, DOCX or TXT · up to 25MB</p>
              </div>
            </div>

            <div className="mt-6 border border-dashed border-border/60 rounded-2xl p-10 flex flex-col items-center justify-center text-center bg-[oklch(0.18_0.03_285/0.2)]">
              <FileText size={32} className="text-muted-foreground/50 mb-4" strokeWidth={1.5} />
              <p className="text-[15px] font-medium mb-1">Drop your document here</p>
              <p className="text-[13px] text-muted-foreground mb-6">or click to browse files</p>
              <button className="bg-foreground text-background rounded-full px-5 py-2.5 text-[13px] font-semibold flex items-center gap-2 hover:bg-[oklch(0.9_0.01_300)] transition-colors">
                <span>Select file</span>
                <span className="font-sans">→</span>
              </button>
            </div>
          </div>

          <div>
            <h4 className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-4 ml-2">OR PASTE A CLAUSE</h4>
            <textarea 
              placeholder="Paste a policy clause for instant scoring..."
              className="w-full h-32 rounded-3xl glass-panel hairline p-6 resize-none bg-[oklch(0.18_0.03_285/0.4)] text-[14px] outline-none focus:ring-1 focus:ring-[oklch(0.7_0.22_305/0.5)] transition-all placeholder:text-muted-foreground"
            ></textarea>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-3xl glass-panel hairline p-6">
            <h4 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-5">STANDARDS</h4>
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <CheckSquare size={16} className="text-primary shrink-0 mt-0.5" strokeWidth={2} />
                <span className="text-[13px] leading-tight text-foreground/90 font-medium">UNESCO Recommendation on AI Ethics</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckSquare size={16} className="text-primary shrink-0 mt-0.5" strokeWidth={2} />
                <span className="text-[13px] leading-tight text-foreground/90 font-medium">OECD AI Principles</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckSquare size={16} className="text-primary shrink-0 mt-0.5" strokeWidth={2} />
                <span className="text-[13px] leading-tight text-foreground/90 font-medium">EU AI Act (2024)</span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl glass-panel hairline p-6">
            <h4 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4">RECENT REPORTS</h4>
            <p className="text-[13px] text-muted-foreground">No reports yet. Upload to begin.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Documents() {
  const [docs, setDocs] = useState([
    { id: 1, title: "AI Acceptable Use Policy v3.pdf", meta: "412 KB · Updated 2 days ago" },
    { id: 2, title: "Model Card — Vision Classifier.docx", meta: "128 KB · Updated 1 week ago" },
    { id: 3, title: "Vendor DPIA — Acme LLM.pdf", meta: "2.1 MB · Updated 3 weeks ago" }
  ]);
  const [openDropdown, setOpenDropdown] = useState(null);

  React.useEffect(() => {
    const handleClick = () => setOpenDropdown(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const handleDelete = (id) => {
    setDocs(docs.filter(d => d.id !== id));
  };

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader 
        eyebrow="Workspace · Library"
        title="Documents"
        description="Your uploaded policies, DPIAs and model cards — all indexed for instant retrieval inside Chat."
      />
      
      <div className="rounded-3xl glass-panel hairline p-5 mt-8">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" strokeWidth={2} />
            <input 
              type="text" 
              placeholder="Search documents..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-[oklch(0.18_0.03_285/0.6)] hairline text-[14px] outline-none focus:ring-1 focus:ring-[oklch(0.7_0.22_305/0.5)] transition-all placeholder:text-muted-foreground"
            />
          </div>
          <button className="bg-foreground text-background rounded-xl px-5 py-3 text-[14px] font-semibold flex items-center gap-2 shrink-0 hover:bg-[oklch(0.9_0.01_300)] transition-colors">
            <Upload size={16} strokeWidth={2} />
            <span>Upload</span>
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {docs.length === 0 && (
            <p className="text-[13px] text-muted-foreground text-center py-6">No documents found.</p>
          )}
          {docs.map((doc) => (
            <div key={doc.id} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-[oklch(1_1_1/0.03)] transition-colors group">
              <div className="h-10 w-10 shrink-0 rounded-xl bg-[oklch(0.4_0.15_300/0.15)] text-primary flex items-center justify-center">
                <FileText size={18} strokeWidth={2} />
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-[14px] font-medium truncate">{doc.title}</span>
                <span className="text-[12px] text-muted-foreground truncate mt-0.5">{doc.meta}</span>
              </div>
              <div className="flex items-center gap-4 shrink-0 pr-2 relative">
                <button 
                  onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === doc.id ? null : doc.id); }}
                  className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal size={18} />
                </button>
                
                {/* Dropdown Menu */}
                {openDropdown === doc.id && (
                  <div className="absolute right-0 top-full mt-2 w-32 bg-[#1A1525] border border-[oklch(1_0_0/0.08)] rounded-xl py-1.5 shadow-2xl z-50 overflow-hidden" style={{ backdropFilter: 'blur(12px)' }}>
                    <button 
                      onClick={() => handleDelete(doc.id)}
                      className="w-full text-left px-4 py-2.5 text-[13px] text-destructive hover:bg-[oklch(1_0_0/0.06)] transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function RedTeam() {
  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader 
        eyebrow="Workspace · Adversarial"
        title="Red"
        accentWord="Team"
        description="Stress-test your AI system before regulators or attackers do. Pick a suite, point Arkive at your endpoint, and review the findings."
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 mt-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Card 1 */}
          <div className="rounded-3xl glass-panel hairline p-6 flex flex-col justify-between min-h-[160px]">
            <div>
              <div className="h-10 w-10 rounded-full bg-[oklch(0.4_0.15_300/0.2)] text-primary flex items-center justify-center mb-4">
                <Zap size={18} strokeWidth={2} />
              </div>
              <h3 className="font-serif text-lg font-medium mb-1">Prompt Injection</h3>
              <p className="text-[13px] text-muted-foreground">20 attack vectors · OWASP LLM01</p>
            </div>
            <div className="mt-4">
              <button className="text-[13px] font-medium text-primary hover:text-primary/80 transition-colors">
                Launch suite →
              </button>
            </div>
          </div>

          {/* Card 2 */}
          <div className="rounded-3xl glass-panel hairline p-6 flex flex-col justify-between min-h-[160px]">
            <div>
              <div className="h-10 w-10 rounded-full bg-[oklch(0.4_0.15_300/0.2)] text-primary flex items-center justify-center mb-4">
                <Bug size={18} strokeWidth={2} />
              </div>
              <h3 className="font-serif text-lg font-medium mb-1">Jailbreak Suite</h3>
              <p className="text-[13px] text-muted-foreground leading-snug">12 templates · DAN, role-play, refusal bypass</p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="rounded-3xl glass-panel hairline p-6 flex flex-col justify-between min-h-[160px]">
            <div>
              <div className="h-10 w-10 rounded-full bg-[oklch(0.4_0.15_300/0.2)] text-primary flex items-center justify-center mb-4">
                <Lock size={18} strokeWidth={2} />
              </div>
              <h3 className="font-serif text-lg font-medium mb-1">Data Leakage</h3>
              <p className="text-[13px] text-muted-foreground">Training-data extraction & PII probes</p>
            </div>
          </div>

          {/* Card 4 */}
          <div className="rounded-3xl glass-panel hairline p-6 flex flex-col justify-between min-h-[160px]">
            <div>
              <div className="h-10 w-10 rounded-full bg-[oklch(0.4_0.15_300/0.2)] text-primary flex items-center justify-center mb-4">
                <Shield size={18} strokeWidth={2} />
              </div>
              <h3 className="font-serif text-lg font-medium mb-1">Bias & Fairness</h3>
              <p className="text-[13px] text-muted-foreground">Demographic parity across 8 axes</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl glass-panel hairline p-6 flex flex-col h-fit">
          <div className="mb-6">
            <h4 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3 ml-1">TARGET ENDPOINT</h4>
            <input 
              type="text" 
              defaultValue="https://api.your-model.com/v1/chat"
              className="w-full px-4 py-3 rounded-xl bg-[oklch(0.18_0.03_285/0.6)] hairline text-[13px] outline-none focus:ring-1 focus:ring-[oklch(0.7_0.22_305/0.5)] transition-all text-muted-foreground"
            />
          </div>
          <div className="mb-8">
            <h4 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3 ml-1">API KEY</h4>
            <input 
              type="password" 
              defaultValue="sk-..."
              className="w-full px-4 py-3 rounded-xl bg-[oklch(0.18_0.03_285/0.6)] hairline text-[13px] outline-none focus:ring-1 focus:ring-[oklch(0.7_0.22_305/0.5)] transition-all text-muted-foreground"
            />
          </div>
          <button className="w-full bg-foreground text-background rounded-2xl py-3.5 flex items-center justify-center gap-2 text-[14px] font-semibold hover:bg-[oklch(0.9_0.01_300)] transition-colors mt-auto">
            <Shield size={16} strokeWidth={2} />
            <span>Run selected suites</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function RiskTier() {
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleClassify = async () => {
    if (!description.trim()) {
      setError('Please describe the AI system first.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await api.post('/api/risk-tier/classify', {
        system_description: description,
        intended_purpose: '',
        data_used: ''
      })
      setResult(res.data)
    } catch (err) {
      console.error(err)
      setError('Classification failed. Please try again.')
    }
    setLoading(false)
  }

  const getTierStyle = (tier) => {
    if (!tier) return { border: 'oklch(1 0 0 / 0.1)', text: 'oklch(0.75 0 0)', bg: 'oklch(1 0 0 / 0.05)' }
    if (tier.includes('Unacceptable')) return { border: 'oklch(0.6 0.22 30 / 0.5)', text: 'oklch(0.7 0.22 30)', bg: 'oklch(0.6 0.22 30 / 0.12)' }
    if (tier.includes('High'))         return { border: 'oklch(0.65 0.18 55 / 0.5)', text: 'oklch(0.75 0.18 55)', bg: 'oklch(0.65 0.18 55 / 0.12)' }
    if (tier.includes('Limited'))      return { border: 'oklch(0.6 0.2 250 / 0.5)', text: 'oklch(0.7 0.2 250)', bg: 'oklch(0.6 0.2 250 / 0.12)' }
    if (tier.includes('Minimal'))      return { border: 'oklch(0.55 0.18 145 / 0.5)', text: 'oklch(0.65 0.18 145)', bg: 'oklch(0.55 0.18 145 / 0.12)' }
    return { border: 'oklch(1 0 0 / 0.1)', text: 'oklch(0.75 0 0)', bg: 'oklch(1 0 0 / 0.05)' }
  }

  const tierCards = [
    { icon: <Ban size={20} strokeWidth={1.7} />, label: 'Unacceptable', sub: 'Prohibited under Art. 5' },
    { icon: <AlertTriangle size={20} strokeWidth={1.7} />, label: 'High Risk', sub: 'Annex III – conformity assessment required' },
    { icon: <Activity size={20} strokeWidth={1.7} />, label: 'Limited Risk', sub: 'Transparency obligations' },
    { icon: <ShieldCheck size={20} strokeWidth={1.7} />, label: 'Minimal Risk', sub: 'Voluntary codes of conduct' },
  ]

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader 
        eyebrow="Workspace · Risk"
        title="Risk Tier"
        accentWord="Analysis"
        description="Describe an AI use-case. Arkive maps it to the four EU AI Act tiers and lists the obligations triggered for each."
      />

      {/* Input panel — one unified glassmorphic card */}
      <div className="rounded-3xl glass-panel hairline p-7 mb-5">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4">
          Describe the AI System
        </p>

        <textarea
          rows={5}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="e.g. A facial recognition system used in a retail store to identify returning customers..."
          className="w-full rounded-2xl bg-[oklch(0.12_0.02_285/0.7)] px-5 py-4 text-[14px] text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-1 focus:ring-primary/50 transition-all resize-none border-0"
        />

        {error && (
          <p className="text-[13px] text-destructive mt-3">{error}</p>
        )}

        <div className="flex justify-end mt-4">
          <button
            onClick={handleClassify}
            disabled={loading}
            className="flex items-center gap-2 bg-foreground text-background rounded-xl px-5 py-2.5 text-[13px] font-semibold hover:opacity-90 transition-opacity gold-glow disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <LayoutGrid size={15} strokeWidth={2} />
            <span>{loading ? 'Classifying…' : 'Classify'}</span>
          </button>
        </div>
      </div>

      {/* Result panel — appears after classification */}
      {result && (() => {
        const s = getTierStyle(result.risk_tier)
        return (
          <div
            className="rounded-3xl p-7 mb-5"
            style={{ background: s.bg, boxShadow: `inset 0 0 0 1px ${s.border}` }}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <h2 className="font-serif text-2xl tracking-tight" style={{ color: s.text }}>
                {result.risk_tier}
              </h2>
              <span
                className="text-[11px] px-3 py-1 rounded-full font-medium shrink-0 mt-1"
                style={{ background: s.bg, color: s.text, boxShadow: `inset 0 0 0 1px ${s.border}` }}
              >
                LLM-classified · verify with counsel
              </span>
            </div>
            {result.reasoning && (
              <p className="text-[14px] text-foreground/80 leading-relaxed mb-3">{result.reasoning}</p>
            )}
            {result.legal_basis && (
              <p className="text-[12px] text-muted-foreground">
                Legal basis: {result.legal_basis}
                {result.annex_iii_category && ` — Annex III: ${result.annex_iii_category}`}
              </p>
            )}
            {result.obligations && result.obligations.length > 0 && (
              <div className="mt-5 pt-5" style={{ borderTop: `1px solid ${s.border}` }}>
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">Key Obligations</p>
                <ul className="flex flex-col gap-2">
                  {result.obligations.map((obs, i) => (
                    <li key={i} className="flex gap-3 text-[13px] text-foreground/80">
                      <span className="shrink-0" style={{ color: s.text }}>•</span>
                      <span><strong className="text-foreground">{obs.article}:</strong> {obs.obligation}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )
      })()}

      {/* Four EU AI Act tier reference cards — uniform glass style, primary icon color */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {tierCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl glass-panel hairline p-5 flex flex-col gap-3"
          >
            <span className="text-primary">{card.icon}</span>
            <div>
              <p className="font-medium text-[14px] text-foreground leading-snug">{card.label}</p>
              <p className="text-[12px] text-muted-foreground mt-1 leading-snug">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


export function AuditLogs() {
  const logs = [
    { date: "Oct 24, 14:32", user: "john", action: "Policy Upload", resource: "Acceptable Use v3.pdf", status: "Success" },
    { date: "Oct 23, 09:15", user: "sarah", action: "Risk Analysis", resource: "Vision Classifier", status: "Success" },
    { date: "Oct 22, 16:45", user: "john", action: "Red Team Suite", resource: "Prompt Injection", status: "Failed" },
    { date: "Oct 20, 11:10", user: "system", action: "Automated Sync", resource: "EU AI Act Database", status: "Success" },
    { date: "Oct 18, 15:20", user: "sarah", action: "Document Delete", resource: "Draft Policy.docx", status: "Success" },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader 
        eyebrow="History · Logs"
        title="Audit"
        accentWord="Logs"
        description="A complete history of your compliance checks, document uploads, and risk analyses."
      />
      <div className="rounded-3xl glass-panel hairline overflow-hidden mt-8">
        <div className="p-5 border-b border-border/30 flex justify-between items-center bg-[oklch(0.18_0.03_285/0.4)]">
          <h3 className="font-medium text-[15px]">Recent Activity</h3>
          <button className="text-[13px] text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors">
            <Search size={14} /> Filter logs
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="text-muted-foreground bg-[oklch(0.18_0.03_285/0.2)]">
              <tr>
                <th className="px-6 py-4 font-medium">Date & Time</th>
                <th className="px-6 py-4 font-medium">User</th>
                <th className="px-6 py-4 font-medium">Action</th>
                <th className="px-6 py-4 font-medium">Resource</th>
                <th className="px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {logs.map((log, i) => (
                <tr key={i} className="hover:bg-[oklch(1_1_1/0.03)] transition-colors">
                  <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">{log.date}</td>
                  <td className="px-6 py-4 font-medium">{log.user}</td>
                  <td className="px-6 py-4">{log.action}</td>
                  <td className="px-6 py-4 text-muted-foreground">{log.resource}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${
                      log.status === 'Success' ? 'bg-[oklch(0.4_0.1_150/0.2)] text-[oklch(0.7_0.15_150)]' : 'bg-destructive/20 text-destructive'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
