/**
 * Dashboard — organisation compliance overview.
 * Shows quick stats, recent assessments, and quick-action cards.
 */
import { useEffect, useState } from "react"
import { api } from "../api"

const PILLARS = [
  "Transparency", "Human Oversight", "Privacy & Data",
  "Fairness", "Accountability", "Safety & Security",
  "Sustainability", "Inclusivity",
]

const STAT_CARDS = [
  {
    id: "assessed",
    label: "Assessments Run",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 11 12 14 22 4"/>
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
      </svg>
    ),
    color: "var(--color-accent)",
  },
  {
    id: "reports",
    label: "Reports Generated",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>
    ),
    color: "var(--color-pass)",
  },
  {
    id: "documents",
    label: "Documents Indexed",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <path d="M8 21h8M12 17v4"/>
      </svg>
    ),
    color: "#8b5cf6",
  },
  {
    id: "queries",
    label: "RAG Queries",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    color: "#06b6d4",
  },
]

const QUICK_ACTIONS = [
  {
    id: "run-assessment",
    tab: "compliance",
    title: "Run Compliance Assessment",
    description: "Upload a policy document and check it against all 8 EU AI Act pillars",
    icon: "✅",
    accent: "var(--color-accent)",
  },
  {
    id: "classify-risk",
    tab: "risktier",
    title: "Classify Risk Tier",
    description: "Determine your AI system's risk tier under the EU AI Act",
    icon: "⚡",
    accent: "#8b5cf6",
  },
  {
    id: "run-redteam",
    tab: "redteam",
    title: "Run Red Team Simulation",
    description: "Test your policy against 5 adversarial prompt injection vectors",
    icon: "🔴",
    accent: "var(--color-gap)",
  },
  {
    id: "open-chat",
    tab: "chat",
    title: "Ask the Knowledge Base",
    description: "Chat with Arkive's RAG system over EU AI Act + UNESCO + OECD documents",
    icon: "💬",
    accent: "#06b6d4",
  },
]

export default function Dashboard({ user, setActiveTab }) {
  const [kbStatus, setKbStatus] = useState(null)
  const [auditCount, setAuditCount] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get("/documents/kb-status").catch(() => null),
      api.get("/audit/logs").catch(() => null),
    ]).then(([kb, audit]) => {
      setKbStatus(kb?.data)
      setAuditCount(audit?.data?.logs?.length || 0)
      setLoading(false)
    })
  }, [])

  const totalDocs = kbStatus?.total_permanent || 0
  const assessmentCount = auditCount
    ? (Math.floor(auditCount * 0.3)) // approximate from audit log
    : 0

  const stats = [
    { ...STAT_CARDS[0], value: loading ? "—" : assessmentCount },
    { ...STAT_CARDS[1], value: "0" },
    { ...STAT_CARDS[2], value: loading ? "—" : totalDocs },
    { ...STAT_CARDS[3], value: loading ? "—" : (auditCount || 0) },
  ]

  return (
    <div className="page-container fade-in">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">
          Welcome back, {user?.display_name?.split(" ")[0] || "there"} 👋
        </h1>
        <p className="page-subtitle">
          EU AI Act Compliance Intelligence Platform — {new Date().toLocaleDateString("en-GB", {
            weekday: "long", year: "numeric", month: "long", day: "numeric"
          })}
        </p>
      </div>



      {/* Stats Row */}
      <div className="grid-4 mb-6">
        {stats.map(stat => (
          <div key={stat.id} className="card" style={{ padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 500 }}>
                {stat.label}
              </span>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: `${stat.color}18`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: stat.color,
              }}>
                {stat.icon}
              </div>
            </div>
            {loading
              ? <div className="skeleton" style={{ height: 32, width: 60 }} />
              : <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--color-text-primary)", lineHeight: 1 }}>
                  {stat.value}
                </div>
            }
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 16, color: "var(--color-text-secondary)" }}>
        Quick Actions
      </h2>
      <div className="grid-2 mb-6">
        {QUICK_ACTIONS.map(action => (
          <button
            key={action.id}
            id={`quick-action-${action.id}`}
            className="card"
            onClick={() => setActiveTab(action.tab)}
            style={{
              cursor: "pointer", textAlign: "left",
              border: "1px solid var(--color-border)",
              background: "var(--color-bg-card)",
              transition: "all var(--transition-base)",
              display: "flex", gap: 16, alignItems: "flex-start",
            }}
          >
            <div style={{
              fontSize: "1.5rem", lineHeight: 1, flexShrink: 0,
              width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center",
              background: `${action.accent}12`,
              border: `1px solid ${action.accent}30`,
              borderRadius: 10,
            }}>
              {action.icon}
            </div>
            <div>
              <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 4 }}>
                {action.title}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                {action.description}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Knowledge Base Status */}
      <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 16, color: "var(--color-text-secondary)" }}>
        Knowledge Base
      </h2>
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Permanent Knowledge Base</div>
            <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
              EU AI Act + UNESCO AI Ethics Recommendation + OECD AI Principles
            </div>
          </div>
          <span className="badge badge-pass">Live</span>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 20 }} />)}
          </div>
        ) : kbStatus?.documents?.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {kbStatus.documents.slice(0, 5).map((doc, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "8px 12px",
                background: "var(--color-bg-secondary)",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.82rem",
              }}>
                <span style={{ color: "var(--color-text-secondary)" }}>
                  📄 {doc.filename}
                </span>
                <span style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>
                  {doc.total_chunks} chunks
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state" style={{ padding: "24px" }}>
            <div className="empty-state-text">No knowledge base documents found.</div>
          </div>
        )}
      </div>

      {/* EU AI Act 8 Pillars Reference */}
      <div style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 16, color: "var(--color-text-secondary)" }}>
          8-Pillar Assessment Coverage
        </h2>
        <div className="grid-4">
          {PILLARS.map((pillar, i) => (
            <div key={i} style={{
              padding: "10px 14px",
              background: "var(--color-bg-card)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              fontSize: "0.8rem",
              color: "var(--color-text-secondary)",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: "50%",
                background: "var(--color-accent)", flexShrink: 0,
              }} />
              {pillar}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
